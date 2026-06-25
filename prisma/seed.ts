import bcrypt from "bcryptjs";
import { PrismaClient, PrinterSize, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting main seed function...");
  console.log("Hashing password...");
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "Admin1234", 12);
  console.log("Password hashed successfully.");

  // 1. Seed Branch
  console.log("Seeding branch...");
  const branch = await prisma.branch.upsert({
    where: { code: "MAIN" },
    create: {
      name: "Main Branch",
      code: "MAIN",
      address: "Bubbleworks Main Branch",
      mobile: "0000000000",
    },
    update: {},
  });
  console.log("Branch seeded successfully.");

  // 2. Seed Admin User
  console.log("Seeding admin user...");
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      name: "Admin",
      mobile: "0000000000",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      status: UserStatus.ACTIVE,
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: "ADMIN",
    },
  });
  console.log("Admin user seeded successfully.");

  // 3. Seed Settings
  console.log("Seeding settings...");
  await prisma.setting.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      businessName: "Bubbleworks Laundry",
      address: "Configure business address",
      mobile: "0000000000",
      defaultGstRate: 18,
      printerSize: PrinterSize.MM_80,
    },
    update: {},
  });
  console.log("Settings seeded successfully.");

  // 4. Seed Core Services
  console.log("Seeding core services...");
  const services = [
    { name: "Wash & Fold", desc: "Standard washing and folding by weight" },
    { name: "Wash & Iron", desc: "Standard washing and pressing by weight" },
    { name: "Premium Wash & Fold", desc: "Premium washing and folding by weight" },
    { name: "Premium Wash & Iron", desc: "Premium washing and pressing by weight" },
    { name: "Shoe Cleaning", desc: "Premium shoe scrubbing and laundry" },
    { name: "Bag Cleaning", desc: "Handbags, school bags, and suitcases cleaning" },
    { name: "Curtains", desc: "Curtain washing and dry cleaning" },
    { name: "Toys", desc: "Stuffed toys washing" },
    { name: "Steam Ironing", desc: "Premium steam pressing" },
    { name: "Dry Cleaning", desc: "Premium chemical dry wash" }
  ];

  const serviceMap: Record<string, string> = {};
  for (const s of services) {
    const doc = await prisma.service.upsert({
      where: { name: s.name },
      create: { name: s.name, description: s.desc },
      update: {},
    });
    serviceMap[s.name] = doc.id;
  }
  console.log("Services seeded successfully.");

  // 5. Seed Products
  console.log("Seeding products...");
  const products = [
    "Shirt", "Pant", "Dhoti", "Blazer", "Blazer set (2 piece)", "Blazer set (3 piece)",
    "Kurtha", "Angavashtram", "Kids Dress", "Saree - Cotton", "Saree - Silk", "Saree - Designer",
    "Blouse - Normal", "Blouse - Designer", "Chudithar - Normal", "Chudithar - Designer",
    "Top", "Bottom", "Dhupatta", "Lehenga", "Dress", "Pillow Cover", "Bedspread", "Bedsheet",
    "Blanket", "Quilt"
  ];

  const productMap: Record<string, string> = {};
  for (const p of products) {
    const doc = await prisma.product.upsert({
      where: { name: p },
      create: { name: p, description: `${p} clothing item` },
      update: {},
    });
    productMap[p] = doc.id;
  }
  console.log("Products seeded successfully.");

  // 6. Seed Item Categories
  console.log("Seeding item categories...");
  const categories = ["Men", "Women", "Kids", "Single", "Double"];
  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const doc = await prisma.itemCategory.upsert({
      where: { name: c },
      create: { name: c },
      update: {},
    });
    categoryMap[c] = doc.id;
  }
  console.log("Item categories seeded successfully.");

  // 7. Seed Add-ons
  console.log("Seeding add-ons...");
  const addons = [
    { name: "Starch", rate: 30.00, unit: "per piece" },
    { name: "Hanger Packing", rate: 40.00, unit: "per pack" },
    { name: "Stain Removal", rate: 50.00, unit: "depends" }
  ];

  for (const a of addons) {
    await prisma.addOn.upsert({
      where: { name: a.name },
      create: { name: a.name, rate: a.rate, unit: a.unit },
      update: { rate: a.rate, unit: a.unit },
    });
  }
  console.log("Add-ons seeded successfully.");

  // Helper helper to upsert rates
  const upsertRate = async (
    serviceName: string,
    productName: string | null,
    categoryName: string | null,
    unit: string,
    rate: number
  ) => {
    const serviceId = serviceMap[serviceName];
    const productId = productName ? productMap[productName] : null;
    const categoryId = categoryName ? categoryMap[categoryName] : null;

    if (!serviceId) {
      console.error(`Service not found: ${serviceName}`);
      return;
    }
    if (productName && !productId) {
      console.error(`Product not found: ${productName}`);
      return;
    }
    if (categoryName && !categoryId) {
      console.error(`Category not found: ${categoryName}`);
      return;
    }

    const existing = await prisma.serviceRate.findFirst({
      where: { serviceId, productId, categoryId }
    });
    if (existing) {
      await prisma.serviceRate.update({
        where: { id: existing.id },
        data: { unit, rate }
      });
    } else {
      await prisma.serviceRate.create({
        data: { serviceId, productId, categoryId, unit, rate }
      });
    }
  };

  // 8. Seed ServiceRates (Pricing Matrix)

  // --- Direct Services ---
  await upsertRate("Wash & Fold", null, null, "per kg", 100.00);
  await upsertRate("Wash & Iron", null, null, "per kg", 150.00);
  await upsertRate("Premium Wash & Fold", null, null, "per kg", 175.00);
  await upsertRate("Premium Wash & Iron", null, null, "per kg", 225.00);
  await upsertRate("Shoe Cleaning", null, null, "per pair", 250.00);
  await upsertRate("Bag Cleaning", null, null, "per piece", 150.00);
  await upsertRate("Curtains", null, null, "per piece", 150.00);
  await upsertRate("Toys", null, null, "per piece", 100.00);

  // --- Steam Ironing ---
  await upsertRate("Steam Ironing", "Shirt", "Men", "per piece", 15.00);
  await upsertRate("Steam Ironing", "Pant", "Men", "per piece", 15.00);
  await upsertRate("Steam Ironing", "Dhoti", "Men", "per piece", 30.00);
  await upsertRate("Steam Ironing", "Blazer", "Men", "per piece", 50.00);
  await upsertRate("Steam Ironing", "Blazer set (2 piece)", "Men", "per set", 75.00);
  await upsertRate("Steam Ironing", "Blazer set (3 piece)", "Men", "per set", 90.00);
  await upsertRate("Steam Ironing", "Kurtha", "Men", "per piece", 25.00);
  await upsertRate("Steam Ironing", "Angavashtram", "Men", "per piece", 15.00);
  await upsertRate("Steam Ironing", "Kids Dress", "Kids", "per piece", 15.00);
  await upsertRate("Steam Ironing", "Saree - Cotton", "Women", "per piece", 50.00);
  await upsertRate("Steam Ironing", "Saree - Silk", "Women", "per piece", 50.00);
  await upsertRate("Steam Ironing", "Saree - Designer", "Women", "per piece", 50.00);
  await upsertRate("Steam Ironing", "Blouse - Normal", "Women", "per piece", 25.00);
  await upsertRate("Steam Ironing", "Blouse - Designer", "Women", "per piece", 25.00);
  await upsertRate("Steam Ironing", "Chudithar - Normal", "Women", "per set", 50.00);
  await upsertRate("Steam Ironing", "Chudithar - Designer", "Women", "per set", 75.00);
  await upsertRate("Steam Ironing", "Top", "Women", "per piece", 20.00);
  await upsertRate("Steam Ironing", "Bottom", "Women", "per piece", 20.00);
  await upsertRate("Steam Ironing", "Dhupatta", "Women", "per piece", 15.00);
  await upsertRate("Steam Ironing", "Lehenga", "Women", "per set", 100.00);
  await upsertRate("Steam Ironing", "Dress", "Women", "per set", 100.00);

  // --- Dry Cleaning ---
  await upsertRate("Dry Cleaning", "Shirt", "Men", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Pant", "Men", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Dhoti", "Men", "per piece", 150.00);
  await upsertRate("Dry Cleaning", "Blazer", "Men", "per piece", 300.00);
  await upsertRate("Dry Cleaning", "Blazer set (2 piece)", "Men", "per set", 450.00);
  await upsertRate("Dry Cleaning", "Blazer set (3 piece)", "Men", "per set", 500.00);
  await upsertRate("Dry Cleaning", "Kurtha", "Men", "per piece", 150.00);
  await upsertRate("Dry Cleaning", "Angavashtram", "Men", "per piece", 100.00);
  await upsertRate("Dry Cleaning", "Kids Dress", "Kids", "per piece", 100.00);
  await upsertRate("Dry Cleaning", "Saree - Cotton", "Women", "per piece", 200.00);
  await upsertRate("Dry Cleaning", "Saree - Silk", "Women", "per piece", 300.00);
  await upsertRate("Dry Cleaning", "Saree - Designer", "Women", "per piece", 300.00);
  await upsertRate("Dry Cleaning", "Blouse - Normal", "Women", "per piece", 100.00);
  await upsertRate("Dry Cleaning", "Blouse - Designer", "Women", "per piece", 150.00);
  await upsertRate("Dry Cleaning", "Chudithar - Normal", "Women", "per set", 250.00);
  await upsertRate("Dry Cleaning", "Chudithar - Designer", "Women", "per set", 300.00);
  await upsertRate("Dry Cleaning", "Top", "Women", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Bottom", "Women", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Dhupatta", "Women", "per piece", 50.00);
  await upsertRate("Dry Cleaning", "Lehenga", "Women", "per set", 400.00);
  await upsertRate("Dry Cleaning", "Dress", "Women", "per piece", 300.00);
  await upsertRate("Dry Cleaning", "Pillow Cover", "Single", "per piece", 50.00);
  await upsertRate("Dry Cleaning", "Bedspread", "Single", "per piece", 100.00);
  await upsertRate("Dry Cleaning", "Bedsheet", "Single", "per piece", 75.00);
  await upsertRate("Dry Cleaning", "Blanket", "Single", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Quilt", "Single", "per piece", 300.00);
  await upsertRate("Dry Cleaning", "Bedspread", "Double", "per piece", 150.00);
  await upsertRate("Dry Cleaning", "Bedsheet", "Double", "per piece", 125.00);
  await upsertRate("Dry Cleaning", "Blanket", "Double", "per piece", 175.00);
  await upsertRate("Dry Cleaning", "Quilt", "Double", "per piece", 600.00);

  console.log("Database catalog seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
