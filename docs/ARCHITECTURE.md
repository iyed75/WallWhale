# 🏗️ Architecture Guide

## System Overview

WallWhale Server follows a modern, microservice-inspired architecture built on Node.js and TypeScript. The system is designed for enterprise deployment with horizontal scaling, security, and observability as core principles.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (nginx)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │Instance1│   │Instance2│   │Instance3│
   │:3000    │   │:3001    │   │:3002    │
   └─────────┘   └─────────┘   └─────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │      Shared Database      │
        │    (PostgreSQL/SQLite)    │
        └───────────────────────────┘
```

## Technology Stack

### Core Runtime
- **Node.js 18+**: Modern JavaScript runtime with ES modules
- **TypeScript 5.x**: Strict type checking and modern language features
- **Fastify 5.x**: High-performance HTTP server framework
- **Prisma 6.x**: Type-safe database ORM with migrations

### Security Layer
- **Helmet.js**: Security headers and protection middleware
- **JWT**: Stateless authentication with configurable expiration
- **bcrypt**: Password hashing with configurable rounds
- **CORS**: Configurable cross-origin resource sharing

### Monitoring & Observability
- **Pino**: High-performance structured logging
- **Prometheus**: Metrics collection and monitoring
- **OpenAPI 3.0**: API documentation and validation
- **Health Checks**: Kubernetes-ready health endpoints

### Database & Storage
- **SQLite**: Development database with zero configuration
- **PostgreSQL**: Production database with connection pooling
- **File System**: Organized download storage with cleanup
- **Redis** (Optional): Session and cache storage

## Application Structure

```
src/
├── index.ts                 # Application entry point & CLI
├── types/
│   ├── index.ts            # Core type definitions
│   └── errors.ts           # Custom error classes
├── utils/
│   ├── env.ts              # Environment configuration
│   ├── crypto.ts           # Encryption utilities
│   ├── audit.ts            # Audit logging
│   ├── certificates.ts     # TLS certificate management
│   ├── directDownload.ts   # CLI download functionality
│   └── fileHosting.ts      # File sharing utilities
├── plugins/
│   ├── register.ts         # Plugin orchestration
│   ├── prisma.ts           # Database plugin
│   ├── auth.ts             # Authentication plugin
│   └── audit.ts            # Audit logging plugin
├── routes/
│   ├── register.ts         # Route registration
│   └── v1/
│       ├── admin.ts        # Administrative endpoints
│       └── downloads.ts    # Download management
└── services/
    └── downloadService.ts  # Core business logic
```

## Data Flow Architecture

### Request Processing Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   nginx     │───▶│  Fastify    │
│ (Browser/   │    │ (TLS Term/  │    │  (Auth/     │
│  API Key)   │    │  Rate Limit)│    │  Validation)│
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         ▼                         │
              ┌─────▼─────┐            ┌─────────────┐            ┌─────▼─────┐
              │   Audit   │            │  Business   │            │ Database  │
              │  Logging  │            │   Logic     │            │  (Prisma) │
              └───────────┘            └─────────────┘            └───────────┘
                                              │
                                       ┌─────▼─────┐
                                       │ DepotDL   │
                                       │ Process   │
                                       └───────────┘
```

### Download Job Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Queued    │───▶│   Running   │───▶│  Success/   │───▶│   Cleanup   │
│  (Database) │    │  (Process)  │    │   Failed    │    │ (Schedule)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                   │
       │                  ▼                   ▼
       │            ┌─────────────┐    ┌─────────────┐
       │            │ Real-time   │    │   Audit     │
       │            │ Progress    │    │   Logs      │
       │            │ (SSE)       │    │             │
       └────────────┤             │    └─────────────┘
                    └─────────────┘
```

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    JWT      │  │  API Keys   │  │   Scopes    │         │
│  │ (Sessions)  │  │(Programmatic│  │(Permissions)│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Rate Limiting│  │IP Filtering │  │   Audit     │         │
│  │             │  │             │  │  Logging    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### API Key Security Model

```
API Key Creation:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Admin     │───▶│  Generate   │───▶│   Store     │
│  Request    │    │   Key +     │    │ with Scopes │
│             │    │   Scopes    │    │ & Limits    │
└─────────────┘    └─────────────┘    └─────────────┘

API Key Usage:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Request    │───▶│  Validate   │───▶│  Execute    │
│with API Key │    │Key & Scopes │    │  if Valid   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Rate Limit   │    │Scope Check  │    │Audit Log   │
│Check        │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Database Architecture

### Prisma Schema Design

```prisma
// Core user management
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  role      Role       @default(USER)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  
  // Relations
  apiKeys   ApiKey[]
  downloads Download[]
  auditLogs AuditLog[]
}

// API key management with scopes
model ApiKey {
  id                String        @id @default(cuid())
  name              String
  key               String        @unique
  userId            String
  scopes            ApiKeyScope[]
  
  // Rate limiting & quotas
  rateLimit         Int?          // requests per minute
  quotaDaily        Int?          // requests per day
  quotaMonthly      Int?          // requests per month
  maxConcurrent     Int?          // concurrent requests
  maxRuntimeSeconds Int?          // max execution time
  
  // Usage tracking
  lastUsedAt        DateTime?
  requestCount      Int           @default(0)
  
  // Lifecycle
  expiresAt         DateTime?
  createdAt         DateTime      @default(now())
  isActive          Boolean       @default(true)
  
  // Relations
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  usageLogs         ApiUsageLog[]
}

// Download job management
model Download {
  id          String         @id @default(cuid())
  pubfileId   String
  userId      String
  accountName String
  status      DownloadStatus @default(QUEUED)
  saveRoot    String?
  zipPath     String?
  
  // Progress tracking
  progress    Float          @default(0)
  startedAt   DateTime?
  completedAt DateTime?
  errorMessage String?
  
  // Lifecycle
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  // Relations
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs        JobLog[]
}

// Steam account management
model SteamUser {
  id                String          @id @default(cuid())
  username          String          @unique
  encryptedPassword String
  displayName       String?
  status            SteamUserStatus @default(ACTIVE)
  lastUsedAt        DateTime?
  
  // Lifecycle
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}
```

### Database Relationships

```
User (1) ──── (N) ApiKey
 │
 └── (1) ──── (N) Download
              │
              └── (1) ──── (N) JobLog

SteamUser (Independent) ──── Used By ──── Download Jobs

AuditLog ──── References ──── User, ApiKey, Download
```

## Plugin Architecture

### Fastify Plugin System

```typescript
// Plugin registration order
export async function registerPlugins(fastify: FastifyInstance) {
  // 1. Database connection
  await fastify.register(prismaPlugin);
  
  // 2. Authentication & authorization
  await fastify.register(authPlugin);
  
  // 3. Audit logging
  await fastify.register(auditPlugin);
  
  // 4. Route registration
  await fastify.register(routesPlugin);
}
```

### Plugin Dependencies

```
┌─────────────────┐
│   Routes        │
│ (admin, downloads) │
└─────────┬───────┘
          │ depends on
┌─────────▼───────┐    ┌─────────────┐
│   Auth Plugin   │───▶│ Audit Plugin│
│ (JWT, API Keys) │    │ (Logging)   │
└─────────┬───────┘    └─────────────┘
          │ depends on
┌─────────▼───────┐
│ Prisma Plugin   │
│ (Database ORM)  │
└─────────────────┘
```

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                Development Environment                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Node.js Dev │  │   SQLite    │  │   Hot       │         │
│  │   Server    │  │  Database   │  │  Reload     │         │
│  │   :3000     │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Self-Signed  │  │   Debug     │  │   Pretty    │         │
│  │Certificates │  │  Logging    │  │   Logs      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                Production Environment                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Nginx     │  │  Let's      │  │ Load        │         │
│  │ (Reverse    │  │ Encrypt     │  │ Balancer    │         │
│  │  Proxy)     │  │ (TLS)       │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Docker       │  │PostgreSQL   │  │   Redis     │         │
│  │Containers   │  │  Cluster    │  │   Cache     │         │
│  │(Multiple)   │  │             │  │ (Optional)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Prometheus   │  │   Grafana   │  │    Log      │         │
│  │ (Metrics)   │  │(Dashboard)  │  │Aggregation  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Container Architecture

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine as production
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser dist ./dist
USER nodeuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Scaling Considerations

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                    Scaling Strategy                         │
├─────────────────────────────────────────────────────────────┤
│ Stateless Design:                                           │
│ • Session data in JWT tokens                                │
│ • No server-side session storage                            │
│ • Database for persistent state                             │
├─────────────────────────────────────────────────────────────┤
│ Load Balancing:                                             │
│ • Round-robin or least-connections                          │
│ • Health check integration                                  │
│ • Sticky sessions not required                              │
├─────────────────────────────────────────────────────────────┤
│ Database Scaling:                                           │
│ • Connection pooling                                        │
│ • Read replicas for reporting                               │
│ • Horizontal partitioning if needed                         │
└─────────────────────────────────────────────────────────────┘
```

### Performance Characteristics

- **Request Throughput**: 1000+ requests/second per instance
- **Memory Usage**: ~128MB base + 50MB per concurrent download
- **CPU Usage**: Low except during active downloads
- **Database Connections**: 10-20 per instance with pooling
- **File I/O**: Optimized for large file downloads and archiving

## Monitoring & Observability

### Metrics Collection

```typescript
// Prometheus metrics
const metrics = {
  httpRequests: new Counter({
    name: 'depot_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),
  
  downloadJobs: new Gauge({
    name: 'depot_download_jobs_active',
    help: 'Active download jobs'
  }),
  
  apiKeyUsage: new Counter({
    name: 'depot_api_key_usage_total',
    help: 'API key usage',
    labelNames: ['keyId', 'endpoint']
  })
};
```

### Health Check System

```typescript
interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  services: {
    database: 'connected' | 'disconnected';
    steam: 'ready' | 'unavailable';
    filesystem: 'writable' | 'readonly';
  };
  metrics: {
    uptime: number;
    memory: { used: number; total: number };
    activeJobs: number;
  };
}
```

This architecture provides a robust, scalable foundation for enterprise Steam Workshop management with clear separation of concerns, security best practices, and operational excellence.
