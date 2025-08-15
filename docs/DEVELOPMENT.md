# 🛠️ Development Guide

## Development Environment Setup

### Prerequisites
- **Node.js** 18.0.0 or later
- **npm** 8.0.0 or later
- **Git** for version control
- **VS Code** (recommended) with extensions

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/MIKTHATGUY/WallpaperEngineDepotDownloaderServer.git
   cd WallpaperEngineDepotDownloaderServer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your development settings
   ```

4. **Database Setup**
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:push        # Create database schema
   npm run db:seed        # Populate with test data
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Development Scripts

### Core Development
```bash
# Development server with hot reload
npm run dev

# Development server with debugger
npm run dev:debug

# Build for production
npm run build

# Start production build
npm run start

# Clean build artifacts
npm run clean
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and apply migrations
npm run db:migrate

# Reset database to clean state
npm run db:reset

# Seed database with test data
npm run db:seed

# Open Prisma Studio (visual database editor)
npm run db:studio
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Code Quality
```bash
# Lint and fix code issues
npm run lint

# Check linting without fixing
npm run lint:check

# Format code with Prettier
npm run format

# Check formatting without fixing
npm run format:check

# Type check TypeScript
npm run type-check

# Run all quality checks
npm run validate
```

### Certificate Management
```bash
# Interactive certificate setup
npm run cert:setup

# Generate self-signed certificate
npm run cert:generate

# Generate trusted local certificate
npm run cert:mkcert

# Check certificate status
npm run cert:check
```

### Utility Scripts
```bash
# Display current configuration
npm run config:show

# Validate environment configuration
npm run config:validate

# Check server health
npm run health:check

# Security audit
npm run security:audit
```

## Project Structure

```
├── src/                          # Source code
│   ├── index.ts                  # Application entry point
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts             # Core types
│   │   └── errors.ts            # Error types
│   ├── utils/                    # Utility functions
│   │   ├── env.ts               # Environment configuration
│   │   ├── crypto.ts            # Encryption utilities
│   │   ├── audit.ts             # Audit logging
│   │   ├── certificates.ts      # Certificate management
│   │   ├── directDownload.ts    # CLI download functionality
│   │   └── fileHosting.ts       # File sharing utilities
│   ├── plugins/                  # Fastify plugins
│   │   ├── register.ts          # Plugin registration
│   │   ├── prisma.ts            # Database plugin
│   │   ├── auth.ts              # Authentication plugin
│   │   └── audit.ts             # Audit logging plugin
│   ├── routes/                   # API route handlers
│   │   ├── register.ts          # Route registration
│   │   └── v1/                  # API v1 routes
│   │       ├── admin.ts         # Admin endpoints
│   │       └── downloads.ts     # Download endpoints
│   └── services/                 # Business logic services
│       └── downloadService.ts   # Download orchestration
├── test/                         # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   ├── fixtures/                # Test data
│   └── setup/                   # Test configuration
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Database seed data
│   └── migrations/              # Migration files
├── docs/                         # Documentation
├── certs/                        # TLS certificates
├── downloads/                    # Download storage
└── DepotDownloaderMod/          # DepotDownloader executable
```

## Code Style Guide

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### ESLint Rules

Key linting rules enforced:
- **TypeScript Best Practices**: Strict type checking
- **Security Rules**: No dangerous patterns
- **Import/Export**: Consistent import ordering
- **Async/Await**: Proper async patterns
- **Error Handling**: Comprehensive error handling

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Code Organization

#### File Naming
- **PascalCase**: For class names and types
- **camelCase**: For functions and variables
- **kebab-case**: For file names
- **SCREAMING_SNAKE_CASE**: For constants

#### Import Organization
```typescript
// 1. Node.js built-in modules
import { promises as fs } from 'fs';
import path from 'path';

// 2. External dependencies
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// 3. Internal modules (absolute imports)
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';

// 4. Relative imports
import './types.js';
```

#### Function Structure
```typescript
/**
 * Creates a new download job
 * @param request - Download request parameters
 * @param user - Authenticated user
 * @returns Promise resolving to download job
 */
export async function createDownloadJob(
  request: CreateDownloadRequest,
  user: AuthenticatedUser
): Promise<DownloadJob> {
  // Validation
  const validation = validateDownloadRequest(request);
  if (!validation.isValid) {
    throw new ValidationError(validation.errors);
  }

  // Business logic
  const job = await downloadService.createJob(request, user);
  
  // Audit logging
  await auditLogger.log({
    action: 'download:create',
    userId: user.id,
    resource: job.id,
    details: { pubfileId: request.pubfileId }
  });

  return job;
}
```

## Testing Strategy

### Test Structure

```
test/
├── unit/                         # Unit tests (isolated components)
│   ├── auth.plugin.spec.ts      # Authentication logic
│   ├── crypto.spec.ts           # Encryption utilities
│   ├── env.spec.ts              # Environment validation
│   └── healthcheck.spec.ts      # Health check logic
├── integration/                  # Integration tests (API endpoints)
│   ├── admin.routes.spec.ts     # Admin API endpoints
│   └── downloads.routes.spec.ts # Download API endpoints
├── e2e/                          # End-to-end tests (full workflows)
│   └── complete-workflow.spec.ts
├── fixtures/                     # Test data and mocks
│   ├── test-data.json           # Sample API responses
│   └── mock-steam-accounts.json # Test Steam accounts
└── setup/                        # Test configuration
    ├── global-setup.ts          # Global test setup
    ├── test-setup.ts            # Per-test setup
    └── appFactory.ts            # Test app factory
```

### Testing Patterns

#### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto.js';

describe('Crypto Utils', () => {
  const testSecret = 'test-secret-key-32-characters-long';
  
  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = testSecret;
  });

  it('should encrypt and decrypt data correctly', () => {
    const plaintext = 'sensitive-password';
    
    const encrypted = encrypt(plaintext);
    expect(encrypted).toHaveProperty('encrypted');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('tag');
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
```

#### Integration Test Example
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../test/setup/appFactory.js';
import type { FastifyInstance } from 'fastify';

describe('Downloads API', () => {
  let app: FastifyInstance;
  let adminApiKey: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    
    // Get admin API key for testing
    adminApiKey = await getTestAdminApiKey(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a download job', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/downloads',
      headers: {
        'X-API-Key': adminApiKey,
        'Content-Type': 'application/json'
      },
      payload: {
        urlOrId: '123456789',
        accountName: 'test_account'
      }
    });

    expect(response.statusCode).toBe(201);
    
    const job = response.json();
    expect(job).toHaveProperty('id');
    expect(job).toHaveProperty('pubfileId', '123456789');
    expect(job).toHaveProperty('status', 'queued');
  });
});
```

### Test Coverage Goals

- **Overall Coverage**: 80%+ line coverage
- **Critical Paths**: 95%+ coverage for security and core business logic
- **Error Handling**: All error paths tested
- **Edge Cases**: Boundary conditions and edge cases covered

### Running Tests

```bash
# Run all tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- downloads.routes.spec.ts

# Run tests matching pattern
npm run test -- --grep "authentication"

# Debug tests
npm run test:debug
```

## Development Workflow

### Git Workflow

#### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Feature development branches
- **hotfix/***: Production hotfixes
- **release/***: Release preparation

#### Commit Convention
```bash
# Format: type(scope): description
feat(api): add real-time download progress streaming
fix(auth): resolve JWT token expiration handling
docs(readme): update installation instructions
test(downloads): add integration tests for cancel endpoint
refactor(crypto): improve encryption performance
perf(db): optimize download query performance
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Feature**
   - Write tests first (TDD approach)
   - Implement functionality
   - Update documentation

3. **Quality Checks**
   ```bash
   npm run validate  # Runs lint, format, type-check, test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(downloads): add job cancellation endpoint"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

6. **PR Requirements**
   - All tests pass
   - Code coverage maintained
   - Documentation updated
   - Code review approved

### Code Review Guidelines

#### What to Look For
- **Security**: No hardcoded secrets, proper input validation
- **Performance**: Efficient algorithms, proper resource management
- **Maintainability**: Clear code structure, good naming
- **Testing**: Adequate test coverage, meaningful tests
- **Documentation**: Code comments, API documentation updates

#### Review Checklist
- [ ] Code follows project conventions
- [ ] No security vulnerabilities
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] Performance considerations addressed
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate

## Debugging

### VS Code Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/index.ts",
      "args": ["server"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debugging Techniques

#### Logging Strategy
```typescript
import { logger } from '../utils/logger.js';

// Structured logging with context
logger.info('Starting download job', {
  jobId: job.id,
  pubfileId: job.pubfileId,
  accountName: job.accountName
});

// Error logging with stack traces
logger.error('Download failed', {
  jobId: job.id,
  error: error.message,
  stack: error.stack
});

// Debug logging for development
logger.debug('Processing download step', {
  jobId: job.id,
  step: 'file-extraction',
  progress: 75
});
```

#### Performance Monitoring
```typescript
import { performance } from 'perf_hooks';

const startTime = performance.now();

// ... operation

const endTime = performance.now();
logger.info('Operation completed', {
  operation: 'downloadJob',
  duration: endTime - startTime,
  jobId: job.id
});
```

### Common Development Issues

#### Database Connection Issues
```bash
# Reset database
npm run db:reset

# Check connection
npm run db:studio

# Regenerate client
npm run db:generate
```

#### Certificate Problems
```bash
# Regenerate certificates
npm run cert:setup

# Check certificate status
npm run cert:check
```

#### Permission Errors
```bash
# Fix download directory permissions
chmod 755 downloads/

# Fix certificate permissions
chmod 600 certs/key.pem
chmod 644 certs/cert.pem
```

## IDE Integration

### VS Code Extensions

Recommended extensions (`.vscode/extensions.json`):
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### VS Code Settings

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

This comprehensive development guide provides everything needed to contribute effectively to the WallWhale Server project, from initial setup through advanced debugging and deployment strategies.
