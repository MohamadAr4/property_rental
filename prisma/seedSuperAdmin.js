import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPERADMIN'
      }
    });

    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin);
      return;
    }

    // Create super admin
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        phone_number: '09123456789', // Change this to a real number
        email: 'superadmin@gmail.com',
        password: bcrypt.hashSync('123123123', 10), // Change this password
        role: 'SUPERADMIN',
        location: 'Headquarters'
      }
    });

    console.log('Super admin created successfully:', superAdmin);
  } catch (error) {
    console.error('Error seeding super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSuperAdmin();