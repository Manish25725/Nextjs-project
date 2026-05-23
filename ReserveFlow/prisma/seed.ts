import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database...");

  // 0. Seed demo admin user (upsert so re-running seed is safe)
  const hashedPassword = await bcrypt.hash("Admin@2026", 12);
  await prisma.user.upsert({
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
  console.log("Demo user seeded: admin@reserveflow.com / Admin@2026");

  // 1. Warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Hub", location: "Mumbai, MH" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi Central", location: "New Delhi, DL" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore East", location: "Bangalore, KA" },
  });

  // 2. Products
  const headphones = await prisma.product.create({
    data: {
      name: "Aero Wireless Headphones",
      sku: "EL-AWH-9021",
      category: "Electronics",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBAdodlZutnAjlTSgnnk79GfKLRJZUkywP2iF-Srt7ajf07QLGHFHUrxc8m3BsR1F3_rvfQyAXVHkPehH1DaiBxEd7Lbqgl-xQqxCAkTDScgC-3LERTloEP59ELMxqut3saGhGTtlCm8yAZsQMRRVMS1KEC82HPoXxo4PFETHJCqmv4o1e8Kfjy4zrMmxd-Fc_902zvy1CAS1sA8j8kgKy6EWw6a2A0IadD835IjVYs1tpu3ZGPrYbY5-Uvnxjnqym93wPEPS6Sz21R",
    },
  });

  const smartwatch = await prisma.product.create({
    data: {
      name: "Apex Smartwatch Gen 4",
      sku: "WE-ASW-004X",
      category: "Wearables",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA93NB2rkL4wDahHq4biu9vXfpG5CKg70_mcNJuTopECvBrSc1vlgvzv2eiTBpy6l6rRWhK3ecgq3Y6_d0w-dH3PmbxnRz1gYYd6kw7TeM3Yowgt5SQ1OtKtRPGpM4Jpnh1Q53QD89VsTOfivmdhtR8zALwx8Pi88Jxw7Hmg0Bmr9uVLwXUPh8HM2978S7yhNGSXQdNIWWn1S0kFaybpWGKRX2f59L1K9jdZemK-xQiD9QxT_N9Cees7jWnC0Z-q_dx7KvZaVt4thCD",
    },
  });

  // 3. Inventory
  // Headphones
  await prisma.inventory.create({
    data: {
      productId: headphones.id,
      warehouseId: mumbai.id,
      total: 135,
      reserved: 15,
    },
  });
  await prisma.inventory.create({
    data: {
      productId: headphones.id,
      warehouseId: delhi.id,
      total: 125,
      reserved: 40,
    },
  });
  await prisma.inventory.create({
    data: {
      productId: headphones.id,
      warehouseId: bangalore.id,
      total: 205,
      reserved: 5,
    },
  });

  // Smartwatch
  await prisma.inventory.create({
    data: {
      productId: smartwatch.id,
      warehouseId: mumbai.id,
      total: 62,
      reserved: 50,
    },
  });
  await prisma.inventory.create({
    data: {
      productId: smartwatch.id,
      warehouseId: delhi.id,
      total: 12,
      reserved: 12, // 0 available!
    },
  });
  await prisma.inventory.create({
    data: {
      productId: smartwatch.id,
      warehouseId: bangalore.id,
      total: 55,
      reserved: 10,
    },
  });

  console.log("Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

