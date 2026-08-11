import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import {
  createProductSchema,
  updateProductSchema,
  stockMovementSchema,
} from "../utils/validators/product";

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = createProductSchema.parse(req.body);

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) {
    throw new AppError("A product with this SKU already exists", 409);
  }

  const product = await prisma.product.create({ data });
  return res.status(201).json(product);
});

// GET /products?search=&category=&lowStock=true&page=&pageSize=
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
  const search = (req.query.search as string) || undefined;
  const category = (req.query.category as string) || undefined;
  const lowStock = req.query.lowStock === "true";

  const where: any = {};
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  let items = await prisma.product.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
  });
  let total = await prisma.product.count({ where });

  // Low-stock filter applied post-query since it compares two columns
  // (currentStock vs minStockAlertQty), which Prisma can't express directly.
  if (lowStock) {
    items = items.filter((p) => p.currentStock <= p.minStockAlertQty);
    total = items.length;
  }

  return res.status(200).json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id as string },
    include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 50 } },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return res.status(200).json(product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = updateProductSchema.parse(req.body);

  const existing = await prisma.product.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    throw new AppError("Product not found", 404);
  }

  const product = await prisma.product.update({
    where: { id: req.params.id as string },
    data,
  });

  return res.status(200).json(product);
});

// Records a manual stock movement (IN/OUT) and updates currentStock atomically.
export const addStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const data = stockMovementSchema.parse(req.body);

  const product = await prisma.product.findUnique({ where: { id: req.params.id as string } });
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const delta = data.movementType === "IN" ? data.quantity : -data.quantity;
  const newStock = product.currentStock + delta;

  if (newStock < 0) {
    throw new AppError(
      `Insufficient stock. Current stock is ${product.currentStock}, cannot reduce by ${data.quantity}`,
      400
    );
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantity: data.quantity,
        movementType: data.movementType,
        reason: data.reason,
        createdById: req.user!.userId,
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    }),
  ]);

  return res.status(201).json(movement);
});
