# Contributing to IIC Compliance Bot

Thank you for your interest in contributing! 🎉

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Git
- A code editor (VS Code recommended)

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/IIC-Bot.git
   cd IIC-Bot
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd iic-bot-backend
   npm install
   
   # Frontend
   cd ../iic-bot-frontend
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy example env files
   cp .env.example .env
   
   # Fill in your API keys
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd iic-bot-backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd iic-bot-frontend
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style
- Use **2 spaces** for indentation
- Follow existing code patterns
- Add comments for complex logic
- Use descriptive variable names

### Commit Messages
Follow conventional commits:
```
feat: add voice input support
fix: resolve authentication bug
docs: update README with new features
style: format code with prettier
refactor: simplify vector search logic
test: add unit tests for auth
chore: update dependencies
```

### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/component-name` - Code refactoring

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, maintainable code
   - Add tests if applicable
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm run test
   npm run lint
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Open Pull Request**
   - Provide clear description
   - Reference related issues
   - Add screenshots for UI changes

## 🐛 Reporting Bugs

Use the [GitHub Issues](https://github.com/harsh-pandhe/IIC-Bot/issues) page:

**Include:**
- Clear bug description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs
- Environment details (OS, Node version)

## 💡 Feature Requests

We welcome suggestions! Open an issue with:
- Feature description
- Use case/motivation
- Possible implementation approach

## 🎯 Good First Issues

Look for issues tagged with `good-first-issue` - these are perfect for newcomers!

## 🏗️ Project Structure

```
IIC-Bot/
├── iic-bot-backend/        # Express.js API
│   ├── server.js           # Main server file
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   └── utils/              # Helper functions
│
├── iic-bot-frontend/       # Next.js app
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   └── public/             # Static assets
│
└── documents/              # SOPs and knowledge base
```

## ✅ Code Review Checklist

Before submitting:
- [ ] Code follows project style
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No sensitive data exposed
- [ ] Tests pass
- [ ] No TypeScript errors

## 🤝 Community

- Be respectful and inclusive
- Help others when you can
- Give constructive feedback
- Follow our Code of Conduct

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🎓 Learning Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [LangChain JS Docs](https://js.langchain.com/)
- [Pinecone Vector DB](https://docs.pinecone.io/)
- [Next.js Documentation](https://nextjs.org/docs)

## 💬 Questions?

Feel free to:
- Open a discussion on GitHub
- Comment on related issues
- Reach out to maintainers

---

**Thank you for making IIC Bot better! 🚀**
