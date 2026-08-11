import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import {
  createChallanSchema,
  updateChallanStatusSchema,
} from "../utils/validators/challan";

// Generates a challan number like CH-2026-0001. Not perfectly race-safe
// under heavy concurrent load, but fine for this scope; documented as a
// known limitation in the README.
async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.salesChallan.count({
    where: { challanNumber: { startsWith: `CH-${year}-` } },
  });
  const next = (count + 1).toString().padStart(4, "0");
  return `CH-${year}-${next}`;
}

export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const data = createChallanSchema.parse(req.body);
  const status = data.status || "DRAFT";

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  // Load all products referenced in the challan up front.
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new AppError("One or more products could not be found", 400);
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

  // If confirming immediately, validate stock BEFORE touching the DB.
  if (status === "CONFIRMED") {
    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      if (product.currentStock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Available: ${product.currentStock}, requested: ${item.quantity}`,
          400
        );
      }
    }
  }

  const challanNumber = await generateChallanNumber();

  const challan = await prisma.$transaction(async (tx) => {
    const created = await tx.salesChallan.create({
      data: {
        challanNumber,
        customerId: data.customerId,
        totalQuantity,
        status,
        createdById: req.user!.userId,
        items: {
          create: data.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              productNameSnap: product.name,
              skuSnap: product.sku,
              unitPriceSnap: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Deduct stock + log movement only when confirming.
    if (status === "CONFIRMED") {
      for (const item of data.items) {
        const product = productMap.get(item.productId)!;

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            movementType: "OUT",
            reason: `Sales challan ${challanNumber}`,
            createdById: req.user!.userId,
          },
        });
      }
    }

    return created;
  });

  return res.status(201).json(challan);
});

// GET /challans?status=&customerId=&page=&pageSize=
export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
  const status = (req.query.status as string) || undefined;
  const customerId = (req.query.customerId as string) || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [items, total] = await Promise.all([
    prisma.salesChallan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true },
    }),
    prisma.salesChallan.count({ where }),
  ]);

  return res.status(200).json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.salesChallan.findUnique({
    where: { id: req.params.id as string },
    include: { customer: true, items: { include: { product: true } } },
  });

  if (!challan) {
    throw new AppError("Challan not found", 404);
  }

  return res.status(200).json(challan);
});

// Transitions a challan's status. The only state change that touches stock
// is DRAFT -> CONFIRMED (deduct). CONFIRMED -> CANCELLED restocks the items
// (reasonable assumption, documented in README as not explicitly specified).
export const updateChallanStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: newStatus } = updateChallanStatusSchema.parse(req.body);

  const challan = await prisma.salesChallan.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });

  if (!challan) {
    throw new AppError("Challan not found", 404);
  }

  if (challan.status === newStatus) {
    return res.status(200).json(challan);
  }

  if (challan.status === "CANCELLED") {
    throw new AppError("Cannot change status of a cancelled challan", 400);
  }

  // DRAFT -> CONFIRMED: validate and deduct stock.
  if (challan.status === "DRAFT" && newStatus === "CONFIRMED") {
    const productIds = challan.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of challan.items) {
      const product = productMap.get(item.productId);
      if (!product || product.currentStock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${item.productNameSnap}". Available: ${product?.currentStock ?? 0}, requested: ${item.quantity}`,
          400
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "OUT",
            reason: `Sales challan ${challan.challanNumber} confirmed`,
            createdById: req.user!.userId,
          },
        });
      }
      return tx.salesChallan.update({
        where: { id: challan.id },
        data: { status: "CONFIRMED" },
        include: { items: true, customer: true },
      });
    });

    return res.status(200).json(updated);
  }

  // CONFIRMED -> CANCELLED: restock.
  if (challan.status === "CONFIRMED" && newStatus === "CANCELLED") {
    const updated = await prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "IN",
            reason: `Sales challan ${challan.challanNumber} cancelled - stock restored`,
            createdById: req.user!.userId,
          },
        });
      }
      return tx.salesChallan.update({
        where: { id: challan.id },
        data: { status: "CANCELLED" },
        include: { items: true, customer: true },
      });
    });

    return res.status(200).json(updated);
  }

  // DRAFT -> CANCELLED: no stock was ever deducted, just cancel.
  if (challan.status === "DRAFT" && newStatus === "CANCELLED") {
    const updated = await prisma.salesChallan.update({
      where: { id: challan.id },
      data: { status: "CANCELLED" },
      include: { items: true, customer: true },
    });
    return res.status(200).json(updated);
  }

  throw new AppError(`Cannot transition challan from ${challan.status} to ${newStatus}`, 400);
});
