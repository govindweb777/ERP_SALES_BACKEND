require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');
const Branch = require('./models/Branch');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([Company.deleteMany({}), User.deleteMany({}), Branch.deleteMany({})]);

    // Create company with new fields
    const company = await Company.create({
      companyName: 'Demo Trading Co.',
      registrationType: 'GST',
      businessType: 'Private Limited',
      gstin: '27AABCU9603R1ZM',
      establishedFrom: new Date('2020-01-01'),
      address: { 
        addressLine1: '123 Business Park', 
        state: 'MAHARASHTRA', 
        city: 'Mumbai', 
        pincode: '400001' 
      },
      contact: { mobile: '9876543210', email: 'demo@company.com' },
      isActive: true
    });

    // Create admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@saleserp.com',
      password: 'Admin@123',
      phoneNumber: '9876543210',
      role: 'admin',
      companyId: company._id,
      isActive: true
    });

    // Create branch with new fields
    const branch = await Branch.create({
      branchName: 'Mumbai HQ',
      branchCode: 'BR00001',
      address: 'Floor 5, Business Tower, Mumbai',
      phoneNumber: '9876543211',
      email: 'mumbai@saleserp.com',
      branchManagerName: 'Branch Manager',
      openingHours: '9:00 AM - 6:00 PM',
      establishedDate: new Date('2020-01-15'),
      noOfUsers: 2,
      servicesOffered: ['Sales', 'Support', 'Billing'],
      isHeadOffice: true,
      companyId: company._id,
      isActive: true,
      isDeleted: false
    });

    // Create branch manager
    await User.create({
      name: 'Branch Manager',
      email: 'branch@saleserp.com',
      password: 'Branch@123',
      phoneNumber: '9876543212',
      role: 'branch',
      branchId: branch._id,
      companyId: company._id,
      isActive: true
    });

    // Create regular user
    await User.create({
      name: 'Staff User',
      email: 'user@saleserp.com',
      password: 'User@123',
      phoneNumber: '9876543213',
      role: 'user',
      branchId: branch._id,
      companyId: company._id,
      isActive: true
    });

    // Create user-panel user (admin-created)
    await User.create({
      name: 'Panel User',
      email: 'panel@saleserp.com',
      password: 'Panel@123',
      phoneNumber: '9876543214',
      role: 'user-panel',
      companyId: company._id,
      isActive: true,
      moduleAccess: {
        isDashboard: true,
        isUserManagement: true,
        isBranchManagement: true,
        isReports: true,
        isSettings: false
      }
    });

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Demo Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Admin:       admin@saleserp.com / Admin@123');
    console.log('Branch:      branch@saleserp.com / Branch@123');
    console.log('User:        user@saleserp.com / User@123');
    console.log('User Panel:  panel@saleserp.com / Panel@123');
    console.log('─────────────────────────────────────\n');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
