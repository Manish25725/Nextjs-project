import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedUser() {
  const hashedPassword = await bcrypt.hash("Admin@2026", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@reserveflow.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@reserveflow.com",
      password: hashedPassword,
      role: "admin",
      avatarColor: "#004ac6",
    },
  });
  console.log("Seeded user:", user.email);
  await prisma.$disconnect();
}

seedUser().catch((e) => { console.error(e); process.exit(1); });
