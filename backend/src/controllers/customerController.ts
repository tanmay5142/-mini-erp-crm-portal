import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import {
  createCustomerSchema,
  updateCustomerSchema,
  addFollowUpSchema,
} from "../utils/validators/customer";

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = createCustomerSchema.parse(req.body);

  const customer = await prisma.customer.create({
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      createdById: req.user!.userId,
    },
  });

  return res.status(201).json(customer);
});

// GET /customers?search=&status=&customerType=&page=&pageSize=
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20);
  const search = (req.query.search as string) || undefined;
  const status = (req.query.status as string) || undefined;
  const customerType = (req.query.customerType as string) || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (customerType) where.customerType = customerType;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return res.status(200).json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id as string },
    include: {
      followUps: { orderBy: { createdAt: "desc" } },
      challans: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  return res.status(200).json(customer);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = updateCustomerSchema.parse(req.body);

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    throw new AppError("Customer not found", 404);
  }

  const customer = await prisma.customer.update({
    where: { id: req.params.id as string },
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
  });

  return res.status(200).json(customer);
});

export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const data = addFollowUpSchema.parse(req.body);

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    throw new AppError("Customer not found", 404);
  }

  const followUp = await prisma.followUp.create({
    data: {
      customerId: req.params.id as string,
      note: data.note,
      createdById: req.user!.userId,
    },
  });

  return res.status(201).json(followUp);
});
