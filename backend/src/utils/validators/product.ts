import { z } from "zod";

const emptyStringToUndefined = z.preprocess((val) => (val === "" ? undefined : val), z.string().optional());

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: emptyStringToUndefined,
  unitPrice: z.number({ message: "Unit price must be a number" }).positive("Unit price must be positive"),
  currentStock: z.number().int().min(0).optional(),
  minStockAlertQty: z.number().int().min(0).optional(),
  location: emptyStringToUndefined,
});

export const updateProductSchema = createProductSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive number"),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "Reason is required"),
});

