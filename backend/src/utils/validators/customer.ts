import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(10).max(15),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  note: z.string().min(1),
});
