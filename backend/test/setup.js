import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/index.js';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create a separate Prisma client instance for testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Connect to the test database
  await prisma.$connect();

  // Optional: Reset the database schema for clean tests
  // This will drop all data and recreate the schema
  // Be careful - this will delete all data in the test database!
  try {
    // Deploy the schema to the test database
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE;');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public;');

    // You might want to run migrations here instead:
    // await prisma.$executeRaw`-- Your migration SQL here`;
    //review this for replacing ther manual reset with a migration and make it work with the beforeEach part
  } catch (error) {
    //review this linting error
    console.warn('Database reset failed:', error.message);
  }
});

// Global test teardown
afterAll(async () => {
  // Disconnect from the test database
  await prisma.$disconnect();
});

// Clean up data before each test to ensure test isolation
beforeEach(async () => {
  // Clear all tables in the correct order to avoid foreign key constraints
  // Adjust the order based on your database schema
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});

// Optional: Clean up after each test as well
afterEach(async () => {
  // Any cleanup needed after each test
});

// Export the test database client for use in tests
export { prisma };
