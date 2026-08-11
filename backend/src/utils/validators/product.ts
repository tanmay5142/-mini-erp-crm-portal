import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().positive(),
  currentStock: z.number().int().min(0).optional(),
  minStockAlertQty: z.number().int().min(0).optional(),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1),
});
