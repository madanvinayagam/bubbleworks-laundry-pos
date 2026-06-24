import bcrypt from "bcryptjs";
import { PrismaClient, PricingType, PrinterSize, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
const userRoles = UserRole as Partial<Record<"SUPER_ADMIN" | "ADMIN", UserRoleValue>>;

function missingAdminRole(): never {
  throw new Error("Prisma UserRole enum must include ADMIN or SUPER_ADMIN.");
}

const adminRole: UserRoleValue = userRoles.SUPER_ADMIN ?? userRoles.ADMIN ?? missingAdminRole();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "Admin1234", 12);

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

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      name: "Admin",
      mobile: "0000000000",
      username: "admin",
      passwordHash,
      role: adminRole,
      status: UserStatus.ACTIVE,
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: adminRole,
    },
  });

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

  await prisma.service.createMany({
    data: [
      { name: "Wash & Fold", pricingType: PricingType.PER_KG, defaultRate: 80, gstRate: 18 },
      { name: "Ironing", pricingType: PricingType.PER_PIECE, defaultRate: 15, gstRate: 18 },
      { name: "Dry Cleaning", pricingType: PricingType.PER_PIECE, defaultRate: 120, gstRate: 18 },
      { name: "Blanket Cleaning", pricingType: PricingType.PER_PIECE, defaultRate: 250, gstRate: 18 },
      { name: "Curtain Cleaning", pricingType: PricingType.PER_KG, defaultRate: 100, gstRate: 18 },
      { name: "Shoe Cleaning", pricingType: PricingType.PER_PIECE, defaultRate: 180, gstRate: 18 },
      { name: "Carpet Cleaning", pricingType: PricingType.PER_KG, defaultRate: 140, gstRate: 18 },
    ],
    skipDuplicates: true,
  });
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
