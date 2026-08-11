import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  addStockMovement,
} from "../controllers/productController";

const router = Router();

router.use(authenticate);

// Warehouse & Admin manage products/stock. Everyone can read (Sales needs
// stock visibility to build challans, Accounts needs pricing).
router.post("/", authorize("ADMIN", "WAREHOUSE"), createProduct);
router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), listProducts);
router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), getProduct);
router.put("/:id", authorize("ADMIN", "WAREHOUSE"), updateProduct);
router.post("/:id/stock-movements", authorize("ADMIN", "WAREHOUSE"), addStockMovement);

export default router;
