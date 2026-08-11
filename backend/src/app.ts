import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import productRoutes from "./routes/productRoutes";
import challanRoutes from "./routes/challanRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/challans", challanRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Must be registered last so it catches errors from asyncHandler-wrapped routes.
app.use(errorHandler);

export default app;
