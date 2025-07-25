// prisma/seed.js
import prisma from '../src/config/prisma.js'; // adjust path if needed
import bcrypt from 'bcryptjs';

async function main() {
  const adminData = {
    name: 'jojo',
    email: 'jojo@gmail.com',
    username: 'jojo',
    password: 'Jojo123!',
    role: 'ADMIN',
  };

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminData.email }, { username: adminData.username }],
    },
  });

  if (existingAdmin) {
    return;
  }

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

main()
  .catch((_e) => {
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
