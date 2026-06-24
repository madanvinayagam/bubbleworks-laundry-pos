import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing API database connection with URL:", process.env.DATABASE_URL);
  try {
    const userCount = await prisma.user.count();
    console.log("Successfully connected!");
    console.log(`User count: ${userCount}`);
    
    const branchCount = await prisma.branch.count();
    console.log(`Branch count: ${branchCount}`);
    
    const orderCount = await prisma.order.count();
    console.log(`Order count: ${orderCount}`);
  } catch (error) {
    console.error("Database connection or query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
