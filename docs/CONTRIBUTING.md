# 🤝 Contributing to WallWhale Server

Welcome to the WallWhale Server project! We appreciate your interest in contributing. This guide will help you get started with contributing to our project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct:

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team. All complaints will be reviewed and investigated promptly and fairly.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Git** for version control
- **Docker** (optional, for containerized development)
- Basic knowledge of **TypeScript**, **Fastify**, and **Prisma**

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/DepotDownloaderServer.git
   cd DepotDownloaderServer
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/original-owner/DepotDownloaderServer.git
   ```

## 🛠️ Development Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Generate certificates (development):**
   ```bash
   npm run cert:mkcert
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Docker Development

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Access development environment:**
   ```bash
   docker-compose exec app bash
   ```

3. **Run commands inside container:**
   ```bash
   npm run dev
   npm test
   ```

### Verify Setup

Test your setup with:
```bash
# Run tests
npm test

# Check health
npm run health

# Validate configuration
npm run config:validate
```

## 📝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

#### 🐛 Bug Reports
- Clear, reproducible bug reports
- Include system information and error logs
- Use the issue template

#### ✨ Feature Requests
- Well-defined feature proposals
- Consider backwards compatibility
- Discuss implementation approach

#### 🔧 Code Contributions
- Bug fixes
- New features
- Performance improvements
- Code refactoring

#### 📚 Documentation
- API documentation improvements
- Tutorial creation
- Code comments
- README updates

#### 🧪 Testing
- Unit test improvements
- Integration test coverage
- End-to-end test scenarios
- Performance testing

### Contribution Workflow

1. **Check existing issues** to avoid duplicates
2. **Create or comment on an issue** to discuss your contribution
3. **Fork and create a branch** for your work
4. **Make your changes** following our standards
5. **Write or update tests** for your changes
6. **Update documentation** as needed
7. **Submit a pull request** with clear description

## 📏 Coding Standards

### TypeScript Guidelines

**File Structure:**
```typescript
// 1. External imports
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 2. Internal imports
import { downloadService } from '../services/downloadService.js';
import { AuditAction } from '../types/index.js';

// 3. Type definitions
interface DownloadRequest {
  workshopId: string;
  steamAccount: string;
}

// 4. Implementation
export async function downloadRoute(fastify: FastifyInstance) {
  // Implementation
}
```

**Naming Conventions:**
- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts`
- **Interfaces**: `PascalCase` (no "I" prefix)
- **Types**: `PascalCase`

**Code Style:**
```typescript
// ✅ Good
const downloadResult = await downloadService.downloadWorkshopItem({
  workshopId: request.body.workshopId,
  steamAccount: request.body.steamAccount,
  outputPath: config.downloadsPath,
});

// ❌ Avoid
const result = await downloadService.downloadWorkshopItem(request.body.workshopId, request.body.steamAccount, config.downloadsPath);
```

### Code Organization

**Directory Structure:**
```
src/
├── routes/           # API route handlers
│   ├── v1/          # API version 1
│   └── register.ts  # Route registration
├── services/        # Business logic
├── plugins/         # Fastify plugins
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

**File Naming:**
- Route files: `downloads.ts`, `admin.ts`
- Service files: `downloadService.ts`, `steamService.ts`
- Utility files: `crypto.ts`, `env.ts`
- Type files: `errors.ts`, `index.ts`

### Error Handling

**Standard Error Pattern:**
```typescript
import { AppError, ErrorCode } from '../types/errors.js';

// Throw standardized errors
throw new AppError(
  ErrorCode.WORKSHOP_ITEM_NOT_FOUND,
  `Workshop item ${workshopId} not found`,
  { workshopId }
);

// Handle errors in routes
try {
  const result = await downloadService.processDownload(request);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof AppError) {
    throw error; // Re-throw app errors
  }
  
  // Wrap unexpected errors
  throw new AppError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    { originalError: error.message }
  );
}
```

### Configuration Management

**Environment Variables:**
```typescript
// Use the env utility for all environment access
import { env } from '../utils/env.js';

const config = {
  port: env.PORT,
  database: env.DATABASE_URL,
  steam: {
    accounts: env.STEAM_ACCOUNTS,
  },
};
```

## 🧪 Testing Guidelines

### Test Structure

**Test Organization:**
```
test/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test data
└── setup/         # Test configuration
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { downloadService } from '../../src/services/downloadService.js';

describe('DownloadService', () => {
  beforeEach(() => {
    // Setup for each test
  });

  describe('downloadWorkshopItem', () => {
    it('should download workshop item successfully', async () => {
      // Arrange
      const workshopId = '123456789';
      const steamAccount = 'test_account';

      // Act
      const result = await downloadService.downloadWorkshopItem({
        workshopId,
        steamAccount,
        outputPath: '/tmp/test',
      });

      // Assert
      expect(result).toMatchObject({
        success: true,
        workshopId,
        filePath: expect.stringContaining('.zip'),
      });
    });

    it('should handle invalid workshop ID', async () => {
      // Arrange
      const workshopId = 'invalid';
      const steamAccount = 'test_account';

      // Act & Assert
      await expect(
        downloadService.downloadWorkshopItem({
          workshopId,
          steamAccount,
          outputPath: '/tmp/test',
        })
      ).rejects.toThrow('Invalid workshop ID format');
    });
  });
});
```

**Integration Test Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../setup/appFactory.js';

describe('Downloads API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build({ testing: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/downloads should create download', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/downloads',
      headers: {
        authorization: 'Bearer test-api-key',
      },
      payload: {
        workshopId: '123456789',
        steamAccount: 'test_account',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: expect.any(String),
        workshopId: '123456789',
        status: 'PENDING',
      },
    });
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- downloads.spec.ts
```

## 🔄 Pull Request Process

### Before Creating a PR

1. **Ensure tests pass:**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

2. **Update documentation** if needed

3. **Rebase on latest main:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Guidelines

**Title Format:**
- `feat: add workshop item caching`
- `fix: resolve Steam authentication timeout`
- `docs: update API documentation`
- `test: add integration tests for downloads`
- `refactor: improve error handling`

**Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. **Automated checks** must pass
2. **At least one review** from a maintainer
3. **All conversations resolved**
4. **Up-to-date with main branch**

### After Approval

- **Squash and merge** for feature branches
- **Maintain clean commit history**
- **Delete feature branch** after merge

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the Bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Environment**
- OS: [e.g. Windows 10, Ubuntu 20.04]
- Node.js version: [e.g. 18.17.0]
- Version: [e.g. 1.0.0]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 📚 Documentation

### Documentation Standards

**Code Comments:**
```typescript
/**
 * Downloads a workshop item from Steam
 * 
 * @param workshopId - The Steam workshop item ID
 * @param steamAccount - Steam account credentials
 * @param options - Additional download options
 * @returns Promise resolving to download result
 * 
 * @throws {AppError} When workshop item is not found
 * @throws {AppError} When Steam authentication fails
 * 
 * @example
 * ```typescript
 * const result = await downloadWorkshopItem(
 *   '123456789',
 *   { username: 'user', password: 'pass' },
 *   { outputPath: './downloads' }
 * );
 * ```
 */
async function downloadWorkshopItem(
  workshopId: string,
  steamAccount: SteamAccount,
  options: DownloadOptions
): Promise<DownloadResult> {
  // Implementation
}
```

**README Updates:**
- Keep README.md concise
- Link to detailed docs in `/docs`
- Update feature lists
- Maintain example snippets

**API Documentation:**
- Document all endpoints
- Include request/response examples
- Explain error codes
- Document rate limits

### Documentation Tools

```bash
# Generate API docs
npm run docs:api

# Build documentation site
npm run docs:build

# Serve documentation locally
npm run docs:serve
```

## 👥 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community help
- **Pull Requests**: Code review and collaboration

### Getting Help

1. **Search existing issues** first
2. **Check documentation** in `/docs`
3. **Ask in discussions** for general questions
4. **Create detailed issues** for bugs/features

### Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **GitHub contributor graphs**

## 🎯 Contribution Ideas

### Good First Issues

- Documentation improvements
- Adding unit tests
- Fixing typos
- Improving error messages
- Adding configuration validation

### Advanced Contributions

- Performance optimizations
- New download features
- Security enhancements
- Monitoring improvements
- CI/CD enhancements

### Documentation Needs

- Tutorial videos
- API usage examples
- Deployment guides
- Troubleshooting scenarios
- Performance tuning guides

## 📊 Project Roadmap

### Short Term (Next Release)
- Enhanced error handling
- Improved test coverage
- Performance optimizations
- Documentation improvements

### Medium Term (Next Quarter)
- New authentication methods
- Advanced monitoring features
- Multi-region support
- Plugin system

### Long Term (Next Year)
- Distributed downloads
- Advanced caching
- Web interface
- Enterprise features

Thank you for contributing to WallWhale Server! Your contributions help make this project better for everyone. 🚀
