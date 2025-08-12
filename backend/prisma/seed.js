// prisma/seed.js
import prisma from '../src/config/prisma.js'; // adjust path if needed
import bcrypt from 'bcryptjs';

async function main() {
  const adminData = {
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    password: 'Admin123!',
    role: 'ADMIN',
  };

  const regularData = {
    name: 'Regular User',
    email: 'user@example.com',
    username: 'user',
    password: 'User123!',
    role: 'READER',
  };

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminData.email }, { username: adminData.username }],
    },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password, salt);

    await prisma.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        username: adminData.username,
        passwordHash,
        role: adminData.role,
      },
    });
  }

  const existingRegular = await prisma.user.findFirst({
    where: {
      OR: [{ email: regularData.email }, { username: regularData.username }],
    },
  });

  if (!existingRegular) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(regularData.password, salt);

    await prisma.user.create({
      data: {
        name: regularData.name,
        email: regularData.email,
        username: regularData.username,
        passwordHash,
        role: regularData.role,
      },
    });
  }
}

main()
  .catch((_e) => {
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
