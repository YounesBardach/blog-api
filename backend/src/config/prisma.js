import { PrismaClient } from '../generated/prisma/index.js';

// Create a single instance of PrismaClient
// - In production: create a new instance normally
// - In development: reuse the same instance across hot reloads to avoid exhausting the database connection pool

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
