import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const roles = ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] as const;

  for (const role of roles) {
    const email = `${role.toLowerCase()}@fundsroom-test.com`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${role.charAt(0)}${role.slice(1).toLowerCase()} User`,
        email,
        password,
        role,
      },
    });
    console.log(`Seeded user: ${email} / Password123!`);
  }

  // A couple of sample products so the challan flow can be demoed immediately.
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@fundsroom-test.com" },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Rod 10mm",
      sku: "SKU-001",
      category: "Raw Material",
      unitPrice: 450.0,
      currentStock: 100,
      minStockAlertQty: 20,
      location: "Warehouse A",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "Cement Bag 50kg",
      sku: "SKU-002",
      category: "Raw Material",
      unitPrice: 380.0,
      currentStock: 50,
      minStockAlertQty: 10,
      location: "Warehouse A",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
