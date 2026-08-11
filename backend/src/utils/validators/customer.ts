import { z } from "zod";

const emptyStringToUndefined = z.preprocess((val) => (val === "" ? undefined : val), z.string().optional());

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15),
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email address").optional()
  ),
  businessName: emptyStringToUndefined,
  gstNumber: emptyStringToUndefined,
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: emptyStringToUndefined,
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().datetime().optional()
  ),
  notes: emptyStringToUndefined,
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  note: z.string().min(1, "Note is required"),
});

