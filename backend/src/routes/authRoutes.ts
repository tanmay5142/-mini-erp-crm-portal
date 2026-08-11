import { Router } from "express";
import { login, register } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/register", register); // used to create test users for all 4 roles

export default router;
