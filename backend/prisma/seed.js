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
    console.log('Admin user already exists');
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

  console.log('Admin user created successfully!');
  console.log('Credentials:');
  console.log('Username:', adminData.username);
  console.log('Password:', adminData.password);
  console.log('Email:', adminData.email);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
