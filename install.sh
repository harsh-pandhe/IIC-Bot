#!/bin/bash
# Quick Installation Script for IIC Bot v3.0.0
# Run this after setting up environment variables

echo "🚀 IIC Bot v3.0.0 - Quick Setup Script"
echo "====================================="
echo ""

# Check if Node.js is installed
echo "✓ Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "  Node.js version: $NODE_VERSION"

# Backend Setup
echo ""
echo "📦 Installing backend dependencies..."
cd iic-bot-backend

if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "✗ Please edit iic-bot-backend/.env with your API keys!"
    echo "  Required: MONGODB_URI, JWT_SECRET, PINECONE_API_KEY, GROQ_API_KEY, HUGGINGFACEHUB_API_TOKEN"
    cd ..
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "✗ Backend installation failed"
    cd ..
    exit 1
fi

echo "✓ Backend dependencies installed"

# Seed admin user
echo ""
echo "👤 Creating admin user..."
npm run seed
if [ $? -ne 0 ]; then
    echo "⚠️  Admin user creation failed. Check MongoDB connection."
else
    echo "✓ Admin user created"
    echo "  Username: admin"
    echo "  Password: Admin@123456"
    echo "  ⚠️  Change this password after first login!"
fi

cd ..

# Frontend Setup
echo ""
echo "📦 Installing frontend dependencies..."
cd iic-bot-frontend

if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
fi

npm install
if [ $? -ne 0 ]; then
    echo "✗ Frontend installation failed"
    cd ..
    exit 1
fi

echo "✓ Frontend dependencies installed"
cd ..

# Final Instructions
echo ""
echo "✅ Installation Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start backend:  cd iic-bot-backend && npm run dev"
echo "2. Start frontend: cd iic-bot-frontend && npm run dev"
echo "3. Open: http://localhost:3000"
echo "4. Login with admin credentials"
echo ""
echo "📚 Documentation:"
echo "• Setup Guide: SETUP.md"
echo "• Implementation: IMPLEMENTATION_SUMMARY.md"
echo "• Contributing: CONTRIBUTING.md"
echo ""
echo "🎉 Happy coding!"
