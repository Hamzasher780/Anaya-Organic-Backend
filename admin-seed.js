require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../Backend/src/Models/user'); // Adjust the path according to your project structure

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected...');
    createAdminUser();
}).catch(err => console.error('MongoDB connection error:', err));

async function createAdminUser() {
    const email = 'admin@example.com';
    const password = 'adminpassword';

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('Admin user already exists');
            mongoose.disconnect();
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const adminUser = new User({
            username: 'admin',
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        mongoose.disconnect();
    } catch (err) {
        console.error('Error creating admin user:', err);
        mongoose.disconnect();
    }
}
