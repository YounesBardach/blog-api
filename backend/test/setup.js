import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { execSync } from 'child_process';

// Create a separate Prisma client instance for testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Disconnect any active client before resetting
  await prisma.$disconnect();

  try {
    // Reset database using Prisma migrate
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: {
        // Prisma CLI doesn't have access to the .env file, so we pass it
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });
  } catch (error) {
    console.error('Failed to reset database:', error.message);
    process.exit(1);
  }

  // Reconnect to the reset DB
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
