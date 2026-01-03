# Quick Installation Script for IIC Bot v3.0.0
# Run this after setting up environment variables

Write-Host "🚀 IIC Bot v3.0.0 - Quick Setup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "✓ Checking prerequisites..." -ForegroundColor Green
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Node.js is not installed. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}

$nodeVersion = (node -v).Substring(1)
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray

# Backend Setup
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location iic-bot-backend

if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✗ Please edit iic-bot-backend/.env with your API keys!" -ForegroundColor Red
    Write-Host "  Required: MONGODB_URI, JWT_SECRET, PINECONE_API_KEY, GROQ_API_KEY, HUGGINGFACEHUB_API_TOKEN" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Seed admin user
Write-Host ""
Write-Host "👤 Creating admin user..." -ForegroundColor Yellow
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Admin user creation failed. Check MongoDB connection." -ForegroundColor Yellow
} else {
    Write-Host "✓ Admin user created" -ForegroundColor Green
    Write-Host "  Username: admin" -ForegroundColor Gray
    Write-Host "  Password: Admin@123456" -ForegroundColor Gray
    Write-Host "  ⚠️  Change this password after first login!" -ForegroundColor Yellow
}

Set-Location ..

# Frontend Setup
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location iic-bot-frontend

if (-not (Test-Path .env.local)) {
    Write-Host "⚠️  .env.local not found. Creating..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:5000" | Out-File -FilePath .env.local -Encoding UTF8
}

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..

# Final Instructions
Write-Host ""
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start backend:  cd iic-bot-backend && npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: cd iic-bot-frontend && npm run dev" -ForegroundColor White
Write-Host "3. Open: http://localhost:3000" -ForegroundColor White
Write-Host "4. Login with admin credentials" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "• Setup Guide: SETUP.md" -ForegroundColor White
Write-Host "• Implementation: IMPLEMENTATION_SUMMARY.md" -ForegroundColor White
Write-Host "• Contributing: CONTRIBUTING.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Green
