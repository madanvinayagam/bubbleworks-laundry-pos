import { PrismaClient } from "@prisma/client";

const url = "postgresql://postgres.emgbwipisrdwpkdnzvni:bubbleworks%402026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
console.log("Using URL with pgbouncer=true:", url);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url,
    },
  },
});

async function main() {
  console.log("Testing database connection...");
  try {
    const userCount = await prisma.user.count();
    console.log("Successfully connected!");
    console.log(`User count: ${userCount}`);

    const branchCount = await prisma.branch.count();
    console.log(`Branch count: ${branchCount}`);

    // Test multiple queries in sequence to see if prepared statement error occurs
    const orders = await prisma.order.findMany({ take: 5 });
    console.log(`Orders fetched successfully: ${orders.length}`);
  } catch (error) {
    console.error("Database connection or query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
