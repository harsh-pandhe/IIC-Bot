require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    permissions: {
        canChat: { type: Boolean, default: true },
        canViewAnalytics: { type: Boolean, default: false },
        canAccessLearnedDocs: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Generate secure random password
function generateSecurePassword(length = 24) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const password = crypto.randomBytes(length)
        .toString('base64')
        .slice(0, length)
        .split('')
        .map((char, i) => charset[crypto.randomBytes(1)[0] % charset.length])
        .join('');
    return password;
}

async function rotateAccounts() {
    try {
        console.log('🔄 Starting account rotation...\n');

        // Delete all existing users
        const deleteResult = await User.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} existing accounts\n`);

        // Generate new secure passwords
        const adminPassword = generateSecurePassword(24);
        const userPassword = generateSecurePassword(24);

        // Hash passwords
        const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
        const userHashedPassword = await bcrypt.hash(userPassword, 10);

        // Create new admin account
        const newAdmin = await User.create({
            username: 'admin',
            password: adminHashedPassword,
            email: 'admin@iicbot.com',
            role: 'admin',
            permissions: {
                canChat: true,
                canViewAnalytics: true,
                canAccessLearnedDocs: true
            }
        });

        // Create new demo user account
        const newUser = await User.create({
            username: 'user',
            password: userHashedPassword,
            email: 'user@iicbot.com',
            role: 'user',
            permissions: {
                canChat: true,
                canViewAnalytics: false,
                canAccessLearnedDocs: false
            }
        });

        console.log('✅ New accounts created successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔐 NEW CREDENTIALS - SAVE THESE SECURELY!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('ADMIN ACCOUNT:');
        console.log(`  Username: admin`);
        console.log(`  Password: ${adminPassword}`);
        console.log(`  Email: admin@iicbot.com`);
        console.log(`  Role: admin\n`);
        console.log('USER ACCOUNT:');
        console.log(`  Username: user`);
        console.log(`  Password: ${userPassword}`);
        console.log(`  Email: user@iicbot.com`);
        console.log(`  Role: user\n`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  IMPORTANT: Save these credentials immediately!');
        console.log('⚠️  They will not be displayed again.');
        console.log('═══════════════════════════════════════════════════════\n');

        // Close connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error rotating accounts:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the rotation
rotateAccounts();
