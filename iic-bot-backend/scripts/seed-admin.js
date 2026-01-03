// scripts/seed-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ username: 'admin' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = new User({
            username: 'admin',
            password: process.env.ADMIN_PASSWORD || 'Admin@123456',
            email: 'admin@iic.edu',
            name: 'Administrator',
            role: 'Administrator',
            permissions: ['analytics', 'all-sops', 'teach-bot', 'manage-users']
        });

        await admin.save();
        console.log('✅ Admin user created successfully');
        console.log(`   Username: admin`);
        console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
        console.log('\n⚠️  Please change the admin password after first login!');

        // Create a demo user
        const user = new User({
            username: 'user',
            password: process.env.USER_PASSWORD || 'User@123456',
            email: 'user@iic.edu',
            name: 'IIC Member',
            role: 'Club Member',
            permissions: ['member-sops']
        });

        await user.save();
        console.log('✅ Demo user created successfully');
        console.log(`   Username: user`);
        console.log(`   Password: ${process.env.USER_PASSWORD || 'User@123456'}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
}

seedAdmin();
