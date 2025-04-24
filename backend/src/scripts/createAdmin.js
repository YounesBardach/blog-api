import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

const createAdmin = async () => {
  try {
    const adminData = {
      name: 'jojo',
      email: 'jojo@gmail.com',
      username: 'jojo',
      password: 'Jojo123!',
      role: 'ADMIN'
    };

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminData.email },
          { username: adminData.username }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        username: adminData.username,
        passwordHash,
        role: adminData.role
      }
    });

    console.log('Admin user created successfully!');
    console.log('Credentials:');
    console.log('Username:', adminData.username);
    console.log('Password:', adminData.password);
    console.log('Email:', adminData.email);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin(); 