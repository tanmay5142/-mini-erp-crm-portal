import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";
import { loginSchema, registerSchema } from "../utils/validators/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";

// Seed-style registration endpoint. In a real product this would likely be
// admin-only; kept open here so all 4 role logins can be created for testing.
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken({ userId: user.id, role: user.role });

  return res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
