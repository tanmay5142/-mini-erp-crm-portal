import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createChallan,
  listChallans,
  getChallan,
  updateChallanStatus,
} from "../controllers/challanController";

const router = Router();

router.use(authenticate);

// Sales creates/confirms challans. Warehouse/Accounts/Admin need read access
// (Warehouse to fulfill, Accounts to invoice).
router.post("/", authorize("ADMIN", "SALES"), createChallan);
router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), listChallans);
router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), getChallan);
router.patch("/:id/status", authorize("ADMIN", "SALES"), updateChallanStatus);

export default router;
