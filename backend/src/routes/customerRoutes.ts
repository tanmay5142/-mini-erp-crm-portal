import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  addFollowUp,
} from "../controllers/customerController";

const router = Router();

router.use(authenticate);

// Sales & Admin manage customers. Warehouse/Accounts get read-only access
// (e.g. Accounts may need customer/GST details for invoicing).
router.post("/", authorize("ADMIN", "SALES"), createCustomer);
router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), listCustomers);
router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), getCustomer);
router.put("/:id", authorize("ADMIN", "SALES"), updateCustomer);
router.post("/:id/follow-ups", authorize("ADMIN", "SALES"), addFollowUp);

export default router;
