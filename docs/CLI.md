# CLI Tools Reference

WallWhale provides a comprehensive command-line interface for server
management, Steam Workshop downloads, certificate handling, and deployment
automation. All commands are executed through the main entry point with
enterprise-grade features including security, monitoring, and scalability.

## How WallWhale CLI Works

The WallWhale CLI is built on **Commander.js** with a beautiful, modern interface
powered by **boxen**, **chalk**, and **ora** for visual feedback. Each command
provides:

- **Rich visual feedback** with spinners, progress bars, and colored output
- **Enterprise-grade error handling** with detailed error messages and recovery suggestions
- **Production-ready logging** using Pino with structured JSON output
- **Graceful shutdown** handling with cleanup routines
- **Environment validation** before executing operations
- **Security-first design** with encrypted credentials and secure defaults

### CLI Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 WallWhale CLI Entry Point              │
│                     (src/index.ts)                     │
├─────────────────────────────────────────────────────────┤
│  Command Parser (Commander.js) → Route to Handlers     │
├─────────────────────────────────────────────────────────┤
│  Handlers → Services → External Tools → Feedback       │
└─────────────────────────────────────────────────────────┘

Commands → FastifyApp|DepotDownloader|Docker|Certificates
```

## Quick Start Guide

```bash
# 1. First-time setup (interactive wizard)
npm start setup

# 2. Start the server with beautiful output
npm start

# 3. Check everything is working
npm start health

# 4. For production deployment
npm start docker --setup
```

### Development Workflow
```bash
# Complete development setup in 3 commands
npm start setup --depot-only         # Build DepotDownloader
npm start cert mkcert               # Local trusted certificates  
npm run dev                         # Start with hot reload
```

## Core Commands

### Server Management

**Start Server** (default command)
```bash
npm start [start] [options]

Options:
  -p, --port <port>      Server port (default: 3000)
  -h, --host <host>      Server host (default: 0.0.0.0)
  --dev                  Enable development mode with enhanced logging
  --production           Enable production mode with optimizations
```

**How it works:**
The start command initializes a **Fastify** server with enterprise features:

1. **Beautiful CLI Banner** - Shows server status, features, and system info
2. **TLS/HTTPS Support** - Automatic certificate loading and validation
3. **Health Monitoring** - Built-in health checks and memory monitoring
4. **Rate Limiting** - Per-API-key and global rate limits
5. **Metrics Collection** - Prometheus-compatible metrics endpoint
6. **Graceful Shutdown** - Handles SIGTERM/SIGINT with cleanup

**Visual Feedback Example:**
```
🎯 WallWhale CLI v1.0.0
Enterprise Steam Workshop Management Platform

🚀 Server Status: OPERATIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Primary Endpoint:    https://localhost:3000
📚 API Documentation:   https://localhost:3000/docs
📊 Metrics Dashboard:   https://localhost:3000/metrics
💚 Health Monitor:      https://localhost:3000/health

✨ Enterprise Features:
  ✓ Prometheus Metrics      Real-time performance monitoring
  ✓ Health Monitoring       Automated health checks & alerts
  ✓ API Documentation       Interactive Swagger UI
  ✓ TLS/HTTPS Security      Production-grade encryption
  ✓ Auto File Cleanup       Automated maintenance routines
```

**Development vs Production Mode:**
- **Development**: Pretty logs, hot reload, debug info, relaxed security
- **Production**: JSON logs, optimizations, strict security, monitoring

**Health Check**
```bash
npm start health [options]

Options:
  -u, --url <url>        Server URL (default: http://localhost:3000)
  -d, --detailed         Show detailed status information
```

**How it works:**
Performs comprehensive health checks:
- **HTTP connectivity** test
- **Database connection** validation  
- **DepotDownloader** availability check
- **Certificate** expiration status
- **Memory and CPU** usage
- **Disk space** availability

**Environment Check**
```bash
npm start check
```

**How it works:**
Validates the complete environment before starting services:

1. **Node.js Version** - Ensures compatible runtime
2. **Required Dependencies** - Checks npm packages
3. **DepotDownloader Binary** - Validates executable
4. **Database Connectivity** - Tests connection strings
5. **File Permissions** - Checks read/write access
6. **Port Availability** - Tests if ports are free
7. **Certificate Validity** - Checks TLS certificates
8. **Environment Variables** - Validates required config

### Setup & Configuration

**Interactive Setup Wizard**
```bash
npm start setup [options]

Options:
  --force                Force setup even if configuration exists
  --depot-only           Only build DepotDownloader, skip other setup steps
  --docker-only          Skip to Docker configuration and deployment
```

**How the Setup Wizard Works:**

The setup wizard is an **interactive, multi-step process** using **inquirer.js**:

```
📋 Setup Wizard Flow:
┌─────────────────────┐
│ 1. Welcome Screen   │ → Beautiful banner + system info
├─────────────────────┤
│ 2. Environment      │ → Development vs Production
├─────────────────────┤  
│ 3. Database         │ → SQLite vs PostgreSQL
├─────────────────────┤
│ 4. Security         │ → TLS certificates setup
├─────────────────────┤
│ 5. Steam Accounts   │ → Credential management
├─────────────────────┤
│ 6. DepotDownloader  │ → Binary building/validation
├─────────────────────┤
│ 7. Final Config     │ → Environment file generation
└─────────────────────┘
```

**What each step does:**

1. **Environment Selection**: Sets up `.env` file with appropriate defaults
2. **Database Configuration**: Creates database connections and runs migrations
3. **Certificate Setup**: Generates or configures TLS certificates
4. **Steam Account Setup**: Encrypts and stores Steam credentials
5. **DepotDownloader Build**: Compiles the Steam workshop downloader
6. **Validation**: Tests all components work together

**Files Created:**
- `.env` - Environment configuration
- `accounts.safe` - Encrypted Steam credentials
- `data/depot.db` - SQLite database (if chosen)
- `certs/` - TLS certificates
- `DepotDownloaderMod/` - Compiled binaries

**Quick Setup** (non-interactive)
```bash
npm start quick-setup [options]

Options:
  -e, --env <env>        Environment (development|production) [default: development]
  -d, --database <db>    Database (sqlite|postgresql) [default: sqlite]
  -p, --port <port>      Server port [default: 3000]
  --admin-email <email>  Admin email [default: admin@example.com]
  --admin-password <password>  Admin password [default: admin123]
  --steam-account <account>    Steam account (username:password)
  --docker               Setup for Docker deployment
```

**How Quick Setup Works:**

Quick setup **bypasses interactive prompts** and uses provided options:

1. **Validates inputs** - Ensures all required parameters are valid
2. **Creates configuration** - Generates `.env` with provided settings
3. **Sets up database** - Initializes chosen database type
4. **Creates admin user** - Sets up initial API access
5. **Builds dependencies** - Compiles DepotDownloader if needed
6. **Tests configuration** - Validates the complete setup

**Example:**
```bash
# Complete non-interactive setup for production
npm start quick-setup \
  --env production \
  --database postgresql \
  --port 443 \
  --admin-email admin@mycompany.com \
  --admin-password "MySecurePassword123!" \
  --steam-account "mysteamuser:mysteampass" \
  --docker
```

**Build DepotDownloader**
```bash
npm start build-depot [options]

Options:
  --target-dir <dir>     Target directory for binaries [default: ./DepotDownloaderMod]
  --force                Force rebuild even if binaries exist
```

**How DepotDownloader Building Works:**

DepotDownloader is the **core component** for Steam Workshop downloads:

1. **Source Detection** - Looks for C# source code or pre-built binaries
2. **Dependency Check** - Validates .NET SDK availability
3. **Compilation** - Uses `dotnet build` to compile the project
4. **Binary Validation** - Tests the executable works correctly
5. **Permission Setup** - Sets execute permissions on Unix systems
6. **Integration Test** - Verifies integration with WallWhale

**Technical Details:**
- **Language**: C# with .NET runtime
- **Platform**: Cross-platform (Windows, Linux, macOS)
- **Dependencies**: .NET 6.0+ SDK for building
- **Output**: Executable binary + supporting DLLs
- **Size**: ~50MB compiled binary package

**Build Process:**
```bash
# What happens during build-depot:
dotnet restore          # Download NuGet packages
dotnet build            # Compile source code  
dotnet publish          # Create deployment package
chmod +x executable     # Set permissions (Unix)
./executable --help     # Validation test
```

## Docker Management

**Docker Commands**
```bash
npm start docker [options]

Options:
  --setup                Run Docker setup wizard
  --start                Start Docker services
  --stop                 Stop Docker services
  --logs                 View Docker service logs
  --rebuild              Rebuild and restart Docker services
  --status               Check Docker and service status
```

**How Docker Management Works:**

WallWhale's Docker integration provides **enterprise-grade containerization**:

### Docker Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 Docker Compose Stack                   │
├─────────────────────────────────────────────────────────┤
│  📦 WallWhale App    │  🗄️ PostgreSQL     │  🔄 Redis   │
│  - Node.js Runtime  │  - Primary DB       │  - Caching  │
│  - API Server       │  - Data Storage     │  - Sessions │
│  - DepotDownloader  │  - User Management  │  - Queues   │
├─────────────────────────────────────────────────────────┤
│  🌐 Nginx Reverse Proxy (Load Balancer + TLS)          │
├─────────────────────────────────────────────────────────┤
│  📊 Monitoring Stack (Optional)                        │
│  - Prometheus (Metrics) │ Grafana (Dashboards)        │
└─────────────────────────────────────────────────────────┘
```

### Setup Process (`--setup`)

The Docker setup wizard **generates production-ready configurations**:

1. **Environment Detection**
   - Checks Docker and Docker Compose availability
   - Validates system resources (CPU, memory, disk)
   - Tests network port availability

2. **Configuration Generation**
   ```
   generated/
   ├── docker-compose.yml      # Main orchestration file
   ├── Dockerfile             # Multi-stage build
   ├── .env.docker            # Docker environment variables
   ├── nginx.conf             # Reverse proxy config
   ├── start-docker.bat       # Windows startup script
   ├── start-docker.sh        # Unix startup script
   ├── logs-docker.bat        # Log viewing script
   └── README.md              # Docker-specific documentation
   ```

3. **Security Configuration**
   - Generates secure random passwords
   - Sets up container-to-container networking
   - Configures TLS termination at nginx
   - Sets proper file permissions and user privileges

4. **Production Optimizations**
   - Multi-stage Docker build for smaller images
   - Health checks for all services
   - Resource limits and reservations
   - Restart policies for high availability

### Service Management

**Start Services (`--start`)**
```bash
npm start docker --start
```

**What happens:**
1. **Pre-flight checks** - Validates Docker setup
2. **Image building** - Builds WallWhale container if needed
3. **Network creation** - Sets up isolated Docker networks
4. **Service orchestration** - Starts all containers in order:
   - PostgreSQL database
   - Redis cache
   - WallWhale application
   - Nginx reverse proxy
5. **Health monitoring** - Waits for services to be ready
6. **Status reporting** - Shows service URLs and status

**Stop Services (`--stop`)**
```bash
npm start docker --stop
```

**Graceful shutdown process:**
1. **Signal handling** - Sends SIGTERM to containers
2. **Graceful timeout** - Allows 30 seconds for cleanup
3. **Force stop** - SIGKILL if graceful shutdown fails
4. **Network cleanup** - Removes Docker networks
5. **Volume preservation** - Keeps data volumes intact

**View Logs (`--logs`)**
```bash
npm start docker --logs
```

**Advanced logging features:**
- **Real-time streaming** with colored output
- **Service filtering** - View specific container logs
- **Timestamp synchronization** across services
- **Log rotation** and size management
- **JSON structured logs** for production analysis

### Service Status (`--status`)

Comprehensive status monitoring:

```bash
npm start docker --status

# Example output:
┌─────────────────────────────────────────────────────────┐
│                   🐳 Docker Status                     │
├─────────────────────────────────────────────────────────┤
│  Service          │ Status    │ Health    │ Ports       │
├─────────────────────────────────────────────────────────┤
│  wallwhale-app    │ ✅ Up     │ ✅ Healthy │ 3000->3000  │
│  wallwhale-db     │ ✅ Up     │ ✅ Healthy │ 5432->5432  │
│  wallwhale-redis  │ ✅ Up     │ ✅ Healthy │ 6379->6379  │
│  wallwhale-nginx  │ ✅ Up     │ ✅ Healthy │ 80->80,443  │
└─────────────────────────────────────────────────────────┘

🌐 Access URLs:
  - Main API: https://localhost (HTTPS)
  - API Docs: https://localhost/docs
  - Database: localhost:5432 (PostgreSQL)
  - Cache: localhost:6379 (Redis)

📊 Resource Usage:
  - Total Memory: 512MB / 2GB available
  - CPU Usage: 5% average
  - Disk Space: 1.2GB / 50GB available
```

**Rebuild Services (`--rebuild`)**
```bash
npm start docker --rebuild
```

**Complete rebuild process:**
1. **Backup data** - Exports database and config
2. **Stop services** - Graceful shutdown
3. **Clean images** - Removes old containers and images
4. **Rebuild** - Fresh build with latest code
5. **Restore data** - Imports previous data
6. **Restart** - Brings services back online
7. **Validation** - Tests all services are working

**Examples:**
```bash
# Complete Docker setup for production
npm start docker --setup
npm start docker --start

# Monitor services
npm start docker --status
npm start docker --logs

# Maintenance operations
npm start docker --rebuild  # Update with new code
npm start docker --stop     # Shutdown for maintenance
```

### Docker Integration Features

**Production-Ready Features:**
- ✅ **High Availability** - Automatic service restart
- ✅ **Load Balancing** - Nginx reverse proxy
- ✅ **TLS Termination** - Automatic HTTPS
- ✅ **Health Checks** - Container-level monitoring
- ✅ **Resource Limits** - Memory and CPU constraints
- ✅ **Data Persistence** - Database and upload volumes
- ✅ **Security** - Isolated networks and non-root users
- ✅ **Monitoring** - Prometheus metrics and Grafana dashboards

**Development Features:**
- 🔧 **Hot Reload** - Code changes without rebuild
- 🔧 **Debug Access** - Container shell access
- 🔧 **Log Streaming** - Real-time development logs
- 🔧 **Port Forwarding** - Direct service access

## Database Management

**Database Operations**
```bash
npm start db <command>

Commands:
  migrate                Run database migrations
  seed                   Seed the database with test data
  studio                 Open Prisma Studio (database GUI)
```

**How Database Management Works:**

WallWhale uses **Prisma ORM** for enterprise-grade database management with **type-safe queries** and **automatic migrations**.

### Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Prisma Database Layer                  │
├─────────────────────────────────────────────────────────┤
│  📋 Schema (prisma/schema.prisma)                      │
│  - Models: User, ApiKey, Download, SteamAccount        │
│  - Relations: Foreign keys and indexes                 │
│  - Constraints: Validation and business rules          │
├─────────────────────────────────────────────────────────┤
│  🔄 Migrations (prisma/migrations/)                    │
│  - Version-controlled schema changes                   │
│  - Forward and rollback capabilities                   │
│  - Production-safe deployment                          │
├─────────────────────────────────────────────────────────┤
│  🌱 Seeding (prisma/seed.ts)                          │
│  - Test data generation                                │
│  - Admin user creation                                 │
│  - Sample Steam accounts                              │
└─────────────────────────────────────────────────────────┘
```

### Migration Management (`migrate`)

```bash
npm start db migrate
```

**How Prisma Migrations Work:**

1. **Schema Analysis** 
   - Compares current `schema.prisma` with database state
   - Detects additions, modifications, and deletions
   - Calculates safe migration steps

2. **Migration Generation**
   ```sql
   -- Example migration: 20250811203714_add_steam_user_fields/migration.sql
   ALTER TABLE "SteamAccount" ADD COLUMN "lastUsed" TIMESTAMP(3);
   ALTER TABLE "SteamAccount" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
   CREATE INDEX "SteamAccount_status_idx" ON "SteamAccount"("status");
   ```

3. **Safety Checks**
   - ✅ **Data Preservation** - Won't drop columns with data
   - ✅ **Index Safety** - Creates indexes without locking
   - ✅ **Constraint Validation** - Tests new constraints
   - ✅ **Rollback Preparation** - Creates backup points

4. **Production Deployment**
   ```bash
   # Development
   npm start db migrate        # Interactive prompts

   # Production  
   npm run db:migrate:prod     # Non-interactive, safe
   ```

**Migration Safety Features:**
- **Shadow Database** - Tests migrations in isolation
- **Drift Detection** - Identifies manual database changes
- **Backup Recommendations** - Suggests backup before major changes
- **Rollback Support** - Provides rollback scripts when possible

### Database Seeding (`seed`)

```bash
npm start db seed
```

**How Seeding Works:**

The seed script (`prisma/seed.ts`) creates **realistic test data**:

1. **Admin User Creation**
   ```typescript
   const adminUser = await prisma.user.create({
     data: {
       email: 'admin@wallwhale.local',
       username: 'admin',
       password: await bcrypt.hash('admin123', 12),
       role: 'ADMIN',
       isActive: true
     }
   });
   ```

2. **API Key Generation**
   ```typescript
   const apiKey = await prisma.apiKey.create({
     data: {
       keyId: 'dev-key-' + randomUUID(),
       keySecret: generateSecureSecret(),
       userId: adminUser.id,
       permissions: ['DOWNLOAD', 'UPLOAD', 'ADMIN'],
       rateLimit: 1000
     }
   });
   ```

3. **Sample Data Creation**
   - Steam accounts (encrypted credentials)
   - Download history with various statuses
   - Configuration presets
   - Test workshop items

**Seeding Features:**
- **Idempotent** - Safe to run multiple times
- **Environment-aware** - Different data for dev/test/prod
- **Realistic Data** - Uses faker.js for realistic content
- **Performance Optimized** - Bulk insertions with transactions

### Database Studio (`studio`)

```bash
npm start db studio
```

**Prisma Studio Features:**

Prisma Studio is a **visual database browser** that opens at `http://localhost:5555`:

1. **Visual Schema Explorer**
   - Interactive model relationships
   - Real-time data browsing
   - Query builder interface

2. **Data Management**
   ```
   📊 Table View:
   ┌─────────────────────────────────────────────────────────┐
   │  Users Table                                   [+ Add]  │
   ├─────────────────────────────────────────────────────────┤
   │  ID  │ Username │ Email           │ Role  │ Created    │
   ├─────────────────────────────────────────────────────────┤
   │  1   │ admin    │ admin@wall...   │ ADMIN │ 2024-01-15 │
   │  2   │ user1    │ user1@test...   │ USER  │ 2024-01-16 │
   └─────────────────────────────────────────────────────────┘
   ```

3. **Advanced Features**
   - **Filtering and Sorting** - Complex queries with UI
   - **Relationship Navigation** - Click to explore relations
   - **Data Editing** - Safe CRUD operations with validation
   - **Export/Import** - CSV and JSON data exchange

**Examples:**
```bash
# Complete database setup from scratch
npm start db migrate          # Apply schema
npm start db seed            # Add test data
npm start db studio          # Open GUI for management

# Development workflow
npm start db migrate         # After schema changes
npm run test                 # Run tests against seeded data
npm start db studio         # Debug data issues

# Production maintenance
npm run db:migrate:prod      # Deploy schema changes
npm run db:generate          # Update Prisma client
npm start health            # Verify database connectivity
```

### Database Configuration

**Supported Databases:**
- ✅ **SQLite** - Development and small deployments
- ✅ **PostgreSQL** - Production recommended
- ✅ **MySQL** - Enterprise compatibility
- ✅ **SQL Server** - Windows environments

**Connection Examples:**
```bash
# SQLite (file-based)
DATABASE_URL="file:./data/depot.db"

# PostgreSQL (recommended for production)
DATABASE_URL="postgresql://user:password@localhost:5432/wallwhale"

# Docker PostgreSQL
DATABASE_URL="postgresql://wallwhale:secure_password@wallwhale-db:5432/wallwhale"
```

**Performance Optimization:**
- **Connection Pooling** - Configurable pool size
- **Query Optimization** - Automatic query analysis
- **Index Management** - Database-specific indexes
- **Prepared Statements** - SQL injection protection

## Certificate Management

**Certificate Commands**
```bash
npm start cert <command> [options]

Commands:
  setup                  Interactive certificate setup wizard
  generate               Generate self-signed certificate
  mkcert                 Generate trusted local certificate using mkcert
  letsencrypt            Obtain Let's Encrypt certificate
  check                  Check certificate status
```

**How Certificate Management Works:**

WallWhale provides **enterprise-grade TLS certificate management** with multiple certificate types for different deployment scenarios.

### Certificate Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Certificate Management System              │
├─────────────────────────────────────────────────────────┤
│  🔐 Certificate Types:                                 │
│  ├── Self-Signed (Development)                         │
│  ├── mkcert (Local Development with Trust)             │
│  ├── Let's Encrypt (Production)                        │
│  └── Custom CA (Enterprise)                            │
├─────────────────────────────────────────────────────────┤
│  📁 Certificate Storage:                               │
│  ├── certs/server.crt (Public Certificate)            │
│  ├── certs/server.key (Private Key)                   │
│  ├── certs/ca.crt (Certificate Authority)             │
│  └── certs/dhparam.pem (Diffie-Hellman Parameters)    │
├─────────────────────────────────────────────────────────┤
│  🔄 Automatic Features:                               │
│  ├── Certificate Validation                           │
│  ├── Expiration Monitoring                            │
│  ├── Auto-Renewal (Let's Encrypt)                     │
│  └── Security Best Practices                          │
└─────────────────────────────────────────────────────────┘
```

### Certificate Setup Wizard (`setup`)

```bash
npm start cert setup
```

**Interactive certificate selection wizard:**

```
🔐 Certificate Setup Wizard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? What type of certificate do you need?
❯ 🏠 Local Development (mkcert - trusted by browser)
  🔨 Development Testing (self-signed - browser warnings)  
  🌐 Production Deployment (Let's Encrypt - fully trusted)
  🏢 Enterprise (custom CA certificate)
  ❌ Skip TLS setup (HTTP only - not recommended)

? Domain names (comma-separated):
❯ localhost, 127.0.0.1, wallwhale.local

? Organization name:
❯ WallWhale Development

? Certificate validity period:
❯ 365 days
```

**What the wizard does:**

1. **Environment Detection**
   - Checks if running in Docker or bare metal
   - Detects available certificate tools
   - Validates domain DNS resolution

2. **Certificate Generation** 
   - Creates appropriate certificate type
   - Sets up proper file permissions
   - Configures Fastify TLS options

3. **Security Configuration**
   - Generates strong Diffie-Hellman parameters
   - Sets up HSTS headers
   - Configures secure cipher suites

### Self-Signed Certificates (`generate`)

```bash
npm start cert generate [options]

Options:
  -d, --domain <domain>  Domain name [default: localhost]
  -o, --organization <org>  Organization name [default: WallWhale]
  --days <days>          Validity period in days [default: 365]
```

**How Self-Signed Certificates Work:**

1. **Private Key Generation**
   ```bash
   # 2048-bit RSA private key with strong encryption
   openssl genrsa -out server.key 2048
   ```

2. **Certificate Signing Request (CSR)**
   ```bash
   # Subject details with organization info
   openssl req -new -key server.key -out server.csr \
     -subj "/CN=${domain}/O=${organization}/C=US"
   ```

3. **Self-Signing Process**
   ```bash
   # Sign with own private key - creates the certificate
   openssl x509 -req -in server.csr -signkey server.key \
     -out server.crt -days ${days} \
     -extensions v3_req -extfile openssl.conf
   ```

4. **Security Enhancements**
   - **SAN (Subject Alternative Names)** - Multiple domain support
   - **Key Usage Extensions** - Restricts certificate usage
   - **Extended Key Usage** - TLS server authentication only

**Self-Signed Limitations:**
- ⚠️ **Browser Warnings** - "Your connection is not private"
- ⚠️ **Manual Trust** - Users must accept security exception
- ⚠️ **API Clients** - May reject untrusted certificates
- ✅ **Encryption** - Traffic is still encrypted end-to-end

### mkcert - Trusted Local Development (`mkcert`)

```bash
npm start cert mkcert [options]

Options:
  -d, --domains <domains>  Domains (comma-separated) [default: localhost,127.0.0.1]
```

**How mkcert Works:**

mkcert is a **zero-config tool** that creates locally-trusted development certificates:

1. **Auto-Installation** (if not present)
   ```bash
   # macOS
   brew install mkcert
   
   # Windows (Chocolatey)
   choco install mkcert
   
   # Linux
   curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
   ```

2. **Root CA Installation**
   ```bash
   # Install local Certificate Authority in system trust store
   mkcert -install
   ```

3. **Certificate Generation**
   ```bash
   # Generate trusted certificate for specified domains
   mkcert localhost 127.0.0.1 wallwhale.local
   ```

**mkcert Benefits:**
- ✅ **Zero Browser Warnings** - Fully trusted certificates
- ✅ **Automatic Trust** - Installs CA in system store
- ✅ **Multiple Domains** - Supports wildcards and IPs
- ✅ **Cross-Platform** - Works on Windows, macOS, Linux
- ✅ **Development Perfect** - Ideal for local HTTPS testing

**Security Note:** mkcert certificates only work on the machine where the CA was installed.

### Let's Encrypt - Production Certificates (`letsencrypt`)

```bash
npm start cert letsencrypt [options]

Options:
  -d, --domain <domain>  Domain name (required)
  -e, --email <email>    Contact email (required)
  --staging              Use staging environment
```

**How Let's Encrypt Works:**

Let's Encrypt provides **free, automated, and trusted** TLS certificates:

1. **Domain Validation Process**
   ```
   📋 ACME Challenge Flow:
   ┌─────────────────────┐
   │ 1. Request Cert    │ → Let's Encrypt CA
   ├─────────────────────┤
   │ 2. HTTP Challenge  │ → Place file at /.well-known/acme-challenge/
   ├─────────────────────┤
   │ 3. Validation      │ → CA verifies domain control
   ├─────────────────────┤
   │ 4. Certificate     │ → Issued signed certificate
   └─────────────────────┘
   ```

2. **Automatic Challenge Handling**
   ```javascript
   // WallWhale automatically handles ACME challenges
   app.get('/.well-known/acme-challenge/:token', (request, reply) => {
     const token = request.params.token;
     const response = challenges[token];
     reply.type('text/plain').send(response);
   });
   ```

3. **Certificate Installation**
   - Downloads certificate chain
   - Validates certificate integrity
   - Configures automatic renewal
   - Sets up renewal monitoring

**Let's Encrypt Requirements:**
- ✅ **Public Domain** - Must resolve to your server
- ✅ **Port 80 Access** - Required for HTTP challenge
- ✅ **Valid DNS** - Domain must point to server IP
- ✅ **Internet Access** - Server must reach Let's Encrypt

**Auto-Renewal:**
```bash
# WallWhale checks certificate expiration daily
# Automatically renews certificates < 30 days from expiry
# Sends notifications on renewal success/failure
```

### Certificate Status Checking (`check`)

```bash
npm start cert check
```

**Comprehensive certificate validation:**

```
🔐 Certificate Status Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Certificate Information:
  Type: Let's Encrypt (Production)
  Subject: CN=api.wallwhale.com
  Issuer: Let's Encrypt Authority X3
  Serial: 03:7F:2A:8B:9C:4E:1D:6F:8A:2B:5C:9E:3F:1A:7D:4C

🕐 Validity Period:
  Issued: 2024-01-15 09:30:00 UTC
  Expires: 2024-04-15 09:30:00 UTC  
  Valid For: 89 days remaining ✅
  Status: VALID ✅

🔒 Security Details:
  Key Algorithm: RSA 2048-bit ✅
  Signature: SHA256withRSA ✅
  Key Usage: Digital Signature, Key Encipherment ✅
  Extended Usage: TLS Web Server Authentication ✅

🌐 Domain Coverage:
  ✅ api.wallwhale.com (Primary)
  ✅ www.wallwhale.com (SAN)
  ✅ wallwhale.com (SAN)

⚠️  Recommendations:
  - Certificate expires in 89 days
  - Auto-renewal configured ✅
  - Consider wildcard certificate for subdomain growth
```

**Status Checks Include:**
- **File Existence** - Certificate and key files present
- **Validity Period** - Current date within certificate dates
- **Key Matching** - Private key matches certificate
- **Chain Validation** - Certificate chain is complete
- **Domain Matching** - Certificate covers configured domains
- **Permissions** - Files have correct security permissions
- **Expiration Alerts** - Warns when renewal needed

### Certificate Best Practices

**Development Environment:**
```bash
# Recommended: mkcert for local development
npm start cert mkcert -d "localhost,127.0.0.1,wallwhale.local"
```

**Staging Environment:**
```bash
# Use Let's Encrypt staging for testing
npm start cert letsencrypt -d "staging.wallwhale.com" -e "admin@wallwhale.com" --staging
```

**Production Environment:**
```bash
# Production Let's Encrypt certificate
npm start cert letsencrypt -d "api.wallwhale.com" -e "admin@wallwhale.com"
```

**Enterprise Environment:**
```bash
# Custom CA certificate (manual setup)
# Copy enterprise certificates to certs/ directory
# Ensure certificate chain is complete
```

## Download Management

**Download Commands**
```bash
npm start download <command> [options]

Commands:
  direct                 Download directly to local PC
  host                   Download and host files for public access
  list                   List recent downloads
```

**How WallWhale Download System Works:**

WallWhale provides **enterprise-grade Steam Workshop download management** with multiple delivery methods, built on top of the **DepotDownloader** engine.

### Download Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Download Processing Pipeline           │
├─────────────────────────────────────────────────────────┤
│  📥 Request Processing                                 │
│  ├── Workshop ID/URL parsing                          │
│  ├── Steam account selection                          │
│  ├── Authentication validation                        │
│  └── Download queue management                        │
├─────────────────────────────────────────────────────────┤
│  🔽 DepotDownloader Engine                            │
│  ├── Steam content servers connection                 │
│  ├── Binary content downloading                       │
│  ├── File integrity verification                      │
│  └── Progress monitoring                              │
├─────────────────────────────────────────────────────────┤
│  📦 Post-Processing                                   │
│  ├── Archive creation (ZIP)                          │
│  ├── File hosting preparation                        │
│  ├── Database logging                                │
│  └── Cleanup automation                              │
└─────────────────────────────────────────────────────────┘
```

### Direct Downloads (`direct`)

```bash
npm start download direct [options]

Options:
  -i, --id <id>          Steam Workshop ID or URL (required)
  -a, --account <account>  Steam account name (required)
  -o, --output <path>    Output directory [default: ./downloads]
  --no-zip               Skip creating zip archive
  --keep-temp            Keep temporary files (don't cleanup)
```

**How Direct Downloads Work:**

Direct downloads provide **local file delivery** with enterprise features:

1. **Input Processing**
   ```javascript
   // Supports multiple input formats:
   // Workshop ID: "123456789"
   // Workshop URL: "https://steamcommunity.com/sharedfiles/filedetails/?id=123456789"
   // Steam URL: "steam://url/CommunityFilePage/123456789"
   
   const workshopId = extractWorkshopId(input);
   if (!workshopId) throw new Error('Invalid Workshop ID or URL');
   ```

2. **Steam Account Selection**
   ```javascript
   // Loads encrypted Steam credentials
   const accounts = await loadSteamAccounts();
   const account = accounts.find(acc => acc.username === accountName);
   
   // Validates account status and availability
   if (!account || account.status !== 'active') {
     throw new Error('Steam account not available');
   }
   ```

3. **DepotDownloader Execution**
   ```bash
   # Actual command executed by WallWhale
   ./DepotDownloaderMod/DepotDownloaderMod 
     -app 760 
     -pubfile ${workshopId} 
     -username ${account.username} 
     -password ${decryptedPassword} 
     -dir ${tempDirectory} 
     -validate
   ```

4. **Download Process Monitoring**
   ```
   📊 Download Progress:
   ┌─────────────────────────────────────────────────────────┐
   │ Workshop Item: 123456789                                │
   │ Title: "Epic Game Mod v2.1"                           │
   │ Size: 1.2 GB                                          │
   ├─────────────────────────────────────────────────────────┤
   │ Progress: ████████████████████░░░░ 75% (900MB/1.2GB)  │
   │ Speed: 15.2 MB/s                                      │
   │ ETA: 2m 15s                                           │
   │ Files: 1,234 / 1,500                                  │
   └─────────────────────────────────────────────────────────┘
   ```

5. **Archive Creation** (unless `--no-zip`)
   ```javascript
   // Creates optimized ZIP archive
   const archive = archiver('zip', {
     zlib: { level: 6 },  // Balanced compression
     forceLocalTime: true,
     comment: `WallWhale - Workshop ${workshopId} - ${new Date().toISOString()}`
   });
   
   // Preserves file structure and metadata
   archive.directory(downloadPath, false);
   ```

6. **Final Delivery**
   ```
   ✅ Download Complete!
   
   📁 Files saved to: ./downloads/workshop_123456789/
   📦 Archive created: ./downloads/workshop_123456789.zip (1.1 GB compressed)
   🕐 Total time: 5m 32s
   📊 Average speed: 12.8 MB/s
   
   🗂️ Contents:
   ├── mod_files/
   │   ├── textures/ (245 files)
   │   ├── sounds/ (67 files)
   │   └── scripts/ (89 files)
   ├── README.md
   └── mod_info.txt
   ```

**Direct Download Features:**
- ✅ **Progress Monitoring** - Real-time download progress
- ✅ **Resume Support** - Continue interrupted downloads
- ✅ **Integrity Validation** - Verify downloaded files
- ✅ **Automatic Compression** - Space-efficient ZIP archives
- ✅ **Metadata Preservation** - Maintains file timestamps
- ✅ **Error Recovery** - Automatic retry on network issues

### File Hosting (`host`)

```bash
npm start download host [options]

Options:
  -i, --ids <ids>        Comma-separated Workshop IDs or URLs (required)
  -a, --account <account>  Steam account name (required)
  -p, --port <port>      Hosting port [default: 8080]
  -h, --host <host>      Hosting host [default: 0.0.0.0]
  --password <password>  Optional password protection
  --expire <hours>       Auto-expire after hours (0 = no expiration) [default: 0]
  --ssl                  Enable HTTPS
```

**How File Hosting Works:**

File hosting provides **temporary public access** to downloaded Workshop items:

1. **Bulk Download Processing**
   ```javascript
   // Process multiple Workshop items concurrently
   const workshopIds = parseWorkshopIds(ids);
   const downloadPromises = workshopIds.map(id => 
     downloadWorkshopItem(id, account, {
       skipArchive: true,  // Raw files for hosting
       preserveStructure: true
     })
   );
   
   const results = await Promise.allSettled(downloadPromises);
   ```

2. **Hosting Server Creation**
   ```javascript
   // Creates dedicated file hosting server
   const hostingApp = fastify({
     logger: { level: 'info' },
     bodyLimit: 0  // No upload limits for hosting
   });
   
   // Configure static file serving
   await hostingApp.register(fastifyStatic, {
     root: hostingDirectory,
     prefix: '/files/',
     decorateReply: false
   });
   ```

3. **Security Layer Implementation**
   ```javascript
   // Optional password protection
   if (password) {
     hostingApp.register(fastifyAuth);
     hostingApp.addHook('preHandler', async (request, reply) => {
       const authHeader = request.headers.authorization;
       const provided = Buffer.from(authHeader?.split(' ')[1] || '', 'base64').toString();
       
       if (provided !== `wallwhale:${password}`) {
         reply.code(401).header('WWW-Authenticate', 'Basic realm="WallWhale"');
         throw new Error('Authentication required');
       }
     });
   }
   ```

4. **Hosting Interface**
   ```html
   <!-- Auto-generated file browser -->
   📁 WallWhale File Hosting - Active Downloads
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   🕐 Hosted since: 2024-01-15 14:30:00 UTC
   ⏰ Expires in: 23h 45m (auto-cleanup enabled)
   🔒 Password: Required (Basic Auth)
   
   📦 Available Downloads:
   ┌─────────────────────────────────────────────────────────┐
   │ Workshop ID │ Title              │ Size    │ Action     │
   ├─────────────────────────────────────────────────────────┤
   │ 123456789   │ Epic Game Mod v2.1 │ 1.2 GB  │ [Download] │
   │ 987654321   │ Cool Map Pack      │ 456 MB  │ [Download] │ 
   │ 555444333   │ Texture Bundle     │ 89 MB   │ [Download] │
   └─────────────────────────────────────────────────────────┘
   
   💡 Tips:
   - Right-click → "Save Link As" for direct downloads
   - Use wget/curl for automated downloads
   - Files are automatically cleaned up after expiration
   ```

5. **Auto-Expiration System**
   ```javascript
   // Automatic cleanup scheduling
   if (expireHours > 0) {
     const expirationTime = Date.now() + (expireHours * 60 * 60 * 1000);
     
     setTimeout(async () => {
       console.log(`🧹 Auto-cleanup: Removing hosted files (expired)`);
       await cleanupHostedFiles(hostingDirectory);
       hostingServer.close();
     }, expireHours * 60 * 60 * 1000);
   }
   ```

**File Hosting Features:**
- ✅ **Bulk Downloads** - Process multiple items simultaneously
- ✅ **Web Interface** - Beautiful file browser with metadata
- ✅ **Password Protection** - HTTP Basic Authentication
- ✅ **Auto-Expiration** - Automatic cleanup after specified time
- ✅ **HTTPS Support** - Optional TLS encryption
- ✅ **Direct Links** - RESTful file access URLs
- ✅ **Download Statistics** - Track access patterns
- ✅ **Mobile Friendly** - Responsive web interface

**Example Hosting URLs:**
```bash
# Main hosting interface
http://localhost:8080/

# Direct file access
http://localhost:8080/files/workshop_123456789/mod_files/texture.dds
http://localhost:8080/files/workshop_987654321.zip

# API endpoints
http://localhost:8080/api/status    # Hosting server status
http://localhost:8080/api/files     # File listing (JSON)
```

### Download History (`list`)

```bash
npm start download list [options]

Options:
  -l, --limit <limit>    Number of downloads to show [default: 10]
  --status <status>      Filter by status (queued|running|success|failed)
```

**How Download History Works:**

Download history provides **comprehensive tracking** of all download operations:

1. **Database Tracking**
   ```sql
   -- Download records stored in database
   CREATE TABLE downloads (
     id UUID PRIMARY KEY,
     workshop_id VARCHAR(255) NOT NULL,
     title VARCHAR(500),
     status download_status NOT NULL,
     user_id UUID REFERENCES users(id),
     steam_account VARCHAR(255),
     file_size BIGINT,
     download_speed REAL,
     created_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP,
     error_message TEXT
   );
   ```

2. **Status Management**
   ```javascript
   // Download status lifecycle
   const DownloadStatus = {
     QUEUED: 'queued',       // Waiting in download queue
     RUNNING: 'running',     // Currently downloading
     SUCCESS: 'success',     // Successfully completed
     FAILED: 'failed',       // Download failed
     CANCELLED: 'cancelled', // User cancelled
     EXPIRED: 'expired'      // Hosted files expired
   };
   ```

3. **Rich History Display**
   ```
   📊 Download History (Last 10 downloads)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   🕐 2024-01-15 14:30:00 | ✅ SUCCESS | 123456789 | Epic Game Mod v2.1
      📁 Size: 1.2 GB | ⚡ Speed: 12.8 MB/s | 👤 steam_user1
      
   🕐 2024-01-15 13:45:00 | 🔄 RUNNING | 987654321 | Cool Map Pack  
      📁 Size: 456 MB | ⚡ Speed: 8.5 MB/s | 👤 steam_user2
      📊 Progress: ████████████░░░░ 75% (342MB/456MB)
      
   🕐 2024-01-15 12:15:00 | ❌ FAILED | 555444333 | Broken Texture Bundle
      ❌ Error: Steam authentication failed
      👤 steam_user3 | 🔄 Retries: 3/3
      
   🕐 2024-01-15 11:20:00 | ✅ SUCCESS | 777888999 | Sound Pack Deluxe
      📁 Size: 89 MB | ⚡ Speed: 25.1 MB/s | 👤 steam_user1
      
   🕐 2024-01-15 10:05:00 | ⏰ EXPIRED | 444555666 | Old Map Collection
      📁 Hosted for: 24 hours | 👤 steam_user2
   
   📈 Statistics:
      Total Downloads: 1,234 | Success Rate: 92.5%
      Average Speed: 15.3 MB/s | Total Data: 45.6 GB
   ```

4. **Advanced Filtering**
   ```bash
   # Filter by status
   npm start download list --status running   # Show active downloads
   npm start download list --status failed    # Show failed downloads
   npm start download list --status success   # Show completed downloads
   
   # Show more results
   npm start download list -l 50              # Show last 50 downloads
   
   # Combine filters
   npm start download list --status failed -l 20  # Last 20 failed downloads
   ```

**Download History Features:**
- ✅ **Comprehensive Tracking** - All download operations logged
- ✅ **Rich Metadata** - File sizes, speeds, timestamps, errors
- ✅ **Status Filtering** - Filter by download status
- ✅ **Performance Analytics** - Download speed and success rate tracking
- ✅ **Error Reporting** - Detailed error messages and retry counts
- ✅ **User Attribution** - Track downloads by user and Steam account
- ✅ **Export Capability** - JSON/CSV export for analysis

### Download Status Icons and Colors

```javascript
function getStatusIcon(status) {
  switch (status) {
    case 'queued': return '⏳';
    case 'running': return '🔄';
    case 'success': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⏹️';
    case 'expired': return '⏰';
    default: return '❓';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'queued': return 'yellow';
    case 'running': return 'blue';
    case 'success': return 'green';
    case 'failed': return 'red';
    case 'cancelled': return 'gray';
    case 'expired': return 'gray';
    default: return 'white';
  }
}
```

## Configuration Management

**Configuration Commands**
```bash
npm start config <command>

Commands:
  show                   Show current configuration
  validate               Validate configuration and dependencies
```

### Configuration Display
```bash
npm start config show
```

Shows comprehensive configuration including:
- Environment settings (mode, host, port, TLS)
- Feature toggles (metrics, health checks, docs, cleanup)
- File paths (save root, DepotDownloader, required subpath)
- Security settings (rate limits, upload size, timeouts)
- Performance settings (concurrency, log level)

### Configuration Validation
```bash
npm start config validate
```

Validates:
- Environment variables
- File permissions
- DepotDownloader availability
- Database connectivity
- Certificate validity

## Package.json Script Shortcuts

WallWhale includes npm script shortcuts for common operations:

**Development**
```bash
npm run dev                    # Start development server with watch mode
npm run dev:debug              # Start with debugger attached
```

**Building & Production**
```bash
npm run build                  # Build for production
npm run build:prod             # Build with production config
npm run start:prod             # Start production server
```

**Database Management**
```bash
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema changes
npm run db:migrate             # Run migrations
npm run db:seed                # Seed database
npm run db:studio              # Open database GUI
npm run db:reset               # Reset database
```

**Certificate Management**
```bash
npm run cert:setup             # Interactive certificate setup
npm run cert:generate          # Generate self-signed certificate
npm run cert:mkcert            # Generate mkcert certificate
npm run cert:letsencrypt       # Get Let's Encrypt certificate
npm run cert:check             # Check certificate status
```

**Testing & Quality**
```bash
npm run test                   # Run all tests
npm run test:unit              # Run unit tests
npm run test:integration       # Run integration tests
npm run test:e2e               # Run end-to-end tests
npm run test:coverage          # Run tests with coverage
npm run lint                   # Run linter
npm run format                 # Format code
npm run type-check             # TypeScript type checking
```

**Docker Management**
```bash
npm run docker:build          # Build Docker image
npm run docker:run            # Run Docker container
npm run docker:up             # Start with docker-compose
npm run docker:down           # Stop docker-compose
npm run docker:logs           # View Docker logs
```

**Steam Account Management**
```bash
npm run accounts:encode        # Encode Steam account file
npm run accounts:decode        # Decode Steam account file  
npm run accounts:help          # Show account management help
```

**How Steam Account Management Works:**

WallWhale uses **military-grade encryption** to securely store Steam credentials using **AES-256-GCM** encryption.

### Account Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Steam Account Security System             │
├─────────────────────────────────────────────────────────┤
│  📝 accounts.template (Plain Text - Development)       │
│  ├── Format: username:password                         │
│  ├── Human readable and editable                       │
│  ├── Used for sharing with team (trusted only)         │
│  └── ⚠️ Should be in .gitignore                        │
├─────────────────────────────────────────────────────────┤
│  🔐 accounts.safe (Encrypted - Production)             │
│  ├── AES-256-GCM encrypted passwords                   │
│  ├── Authentication tags prevent tampering             │
│  ├── Unique IV per password                           │
│  └── Used by WallWhale application                     │
├─────────────────────────────────────────────────────────┤
│  🔑 Encryption System                                  │
│  ├── Master key: ENCRYPTION_SECRET environment var    │
│  ├── Key derivation: SHA-256 hash of secret           │
│  ├── Algorithm: AES-256-GCM (authenticated encryption) │
│  └── Random IV per encryption operation               │
└─────────────────────────────────────────────────────────┘
```

### Account File Workflow

**1. Initial Setup (Development)**
```bash
# Create plain text template for editing
cat > accounts.template << EOF
# Steam Accounts Template
# Format: username:password (one per line)
# This file contains PLAIN TEXT passwords - keep it secure!

my_steam_user:my_secure_password
backup_account:another_password
team_shared:shared_password
EOF
```

**2. Encryption for Production**
```bash
# Convert plain text to encrypted format
npm run accounts:encode

# Output:
✅ Encrypted 3 accounts to accounts.safe
🔐 Passwords are now AES-256-GCM encrypted with authentication
```

**3. What Happens During Encoding:**
```javascript
// Encryption process (simplified)
function encryptPassword(plaintext) {
  const key = createHash('sha256').update(process.env.ENCRYPTION_SECRET).digest();
  const iv = randomBytes(16);              // Random 128-bit IV
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();     // Authentication tag
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

**4. Encrypted File Format**
```bash
# accounts.safe (encrypted)
my_steam_user:a1b2c3d4e5f6789a:1a2b3c4d5e6f7890:9f8e7d6c5b4a3210fedcba9876543210
backup_account:f6e5d4c3b2a19876:0987654321abcdef:1234567890abcdef1234567890abcdef
team_shared:9876543210fedcba:abcdef1234567890:fedcba0987654321fedcba0987654321
```

**5. Runtime Decryption**
```javascript
// WallWhale automatically decrypts when loading accounts
const accounts = await loadSteamAccounts();
// accounts.safe → decrypted in memory → used for DepotDownloader
```

### Account Management Commands

**Encode Accounts (`accounts:encode`)**
```bash
npm run accounts:encode
```

**Detailed process:**
1. **Validates template file** - Checks `accounts.template` exists
2. **Parses account data** - Extracts username:password pairs
3. **Encrypts passwords** - AES-256-GCM with unique IVs
4. **Creates safe file** - Writes encrypted data to `accounts.safe`
5. **Security verification** - Tests decryption works correctly

```bash
# Example output:
📋 Processing accounts.template...
🔍 Found 3 valid Steam accounts
🔐 Encrypting passwords with AES-256-GCM...
   ✅ my_steam_user → encrypted
   ✅ backup_account → encrypted  
   ✅ team_shared → encrypted
💾 Saved to accounts.safe
🛡️ Encryption verification: ✅ PASSED

⚠️  Security Reminder:
   - Keep ENCRYPTION_SECRET secure and backed up
   - Add accounts.template to .gitignore if it contains real passwords
   - accounts.safe can be safely committed to git
```

**Decode Accounts (`accounts:decode`)**
```bash
npm run accounts:decode
```

**When to use:**
- Adding new Steam accounts
- Updating existing passwords
- Sharing credentials with trusted team members
- Debugging authentication issues

```bash
# Example output:
🔐 Decrypting accounts.safe...
🔍 Found 3 encrypted accounts
🔓 Decrypting passwords...
   ✅ my_steam_user → decrypted successfully
   ✅ backup_account → decrypted successfully
   ✅ team_shared → decrypted successfully
💾 Saved to accounts.template

⚠️  WARNING: Template file contains plain text passwords!
   - Edit accounts.template to add/modify accounts
   - Run 'npm run accounts:encode' when finished
   - Delete accounts.template if not needed
```

**Account Help (`accounts:help`)**
```bash
npm run accounts:help

# Shows comprehensive help:
Account Management Utility

Usage:
  npm run accounts:encode    # Convert accounts.template to accounts.safe (AES encrypt)
  npm run accounts:decode    # Convert accounts.safe to accounts.template (AES decrypt)
  npm run accounts:help      # Show this help

Files:
  accounts.template  - Plain text format (username:password) - for editing/sharing
  accounts.safe      - AES-256-GCM encrypted format - used by app

Security Features:
  🔐 AES-256-GCM encryption with authentication
  🔑 Key derivation from ENCRYPTION_SECRET environment variable
  🛡️ IV randomization for each password
  ✅ Authentication tags prevent tampering

Environment:
  ENCRYPTION_SECRET  - Master key for encryption (set in .env file)
                      Default: "dev-encryption-secret-change-me"

Security Notes:
  - Keep accounts.safe in your project (encrypted passwords)
  - Share accounts.template only with trusted people (plain text passwords)
  - Add accounts.template to .gitignore if it contains real passwords
  - Change ENCRYPTION_SECRET in production environments
  - Backup your ENCRYPTION_SECRET - lost keys = lost passwords!
```

### Security Best Practices

**Development Environment:**
```bash
# 1. Use development secrets (safe to share)
echo "ENCRYPTION_SECRET=dev-encryption-secret-change-me" >> .env

# 2. Create accounts template
cat > accounts.template << EOF
dev_steam_account:password123
test_account:testpass456
EOF

# 3. Encrypt for the application
npm run accounts:encode

# 4. Add template to gitignore (if using real passwords)
echo "accounts.template" >> .gitignore
```

**Production Environment:**
```bash
# 1. Generate strong encryption secret
ENCRYPTION_SECRET=$(openssl rand -hex 32)
echo "ENCRYPTION_SECRET=${ENCRYPTION_SECRET}" >> .env

# 2. Backup the encryption secret securely
echo "⚠️ CRITICAL: Backup this secret: ${ENCRYPTION_SECRET}"

# 3. Create production accounts
npm run accounts:decode  # If migrating from dev
# Edit accounts.template with production credentials
npm run accounts:encode

# 4. Verify encryption
npm run accounts:help    # Check security status
```

**Team Collaboration:**
```bash
# Share encrypted files safely
git add accounts.safe          # ✅ Safe - encrypted data
git add .env.example          # ✅ Safe - no real secrets
git commit -m "Add Steam accounts"

# Share decryption instructions (not the secret itself)
echo "To decrypt accounts: ENCRYPTION_SECRET=<ask_team_lead> npm run accounts:decode"
```

### Account Validation and Monitoring

WallWhale automatically validates Steam accounts during operation:

```javascript
// Account validation process
async function validateSteamAccount(account) {
  const validation = {
    username: account.username,
    status: 'unknown',
    lastUsed: account.lastUsed,
    failureCount: account.failureCount || 0,
    errors: []
  };

  try {
    // Test Steam login without downloading
    const result = await testSteamAuthentication(account);
    
    if (result.success) {
      validation.status = 'active';
      validation.steamId = result.steamId;
      validation.displayName = result.displayName;
    } else {
      validation.status = 'failed';
      validation.errors.push(result.error);
    }
  } catch (error) {
    validation.status = 'error';
    validation.errors.push(error.message);
  }

  return validation;
}
```

**Account Status Monitoring:**
```bash
# Check account status during server startup
🔍 Validating Steam accounts...
   ✅ my_steam_user (SteamID: 76561198123456789, Last used: 2h ago)
   ⚠️ backup_account (Authentication failed - check password)
   ✅ team_shared (SteamID: 76561198987654321, Last used: 1d ago)

📊 Account Summary: 2/3 accounts operational
```

### Advanced Security Features

**Password Rotation:**
```bash
# 1. Decode to template
npm run accounts:decode

# 2. Update passwords in template file
sed -i 's/old_password/new_password/g' accounts.template

# 3. Re-encrypt with new passwords
npm run accounts:encode

# 4. Test with new credentials
npm start download direct -i "123456789" -a "updated_account"
```

**Emergency Account Access:**
```bash
# If accounts.safe is corrupted or ENCRYPTION_SECRET is lost:

# 1. Check for backup encryption secret
grep ENCRYPTION_SECRET .env.backup

# 2. Try recovery with old secret
ENCRYPTION_SECRET=old_secret npm run accounts:decode

# 3. Re-create accounts if necessary
cat > accounts.template << EOF
# Recreate from password manager or team records
account1:password1
account2:password2
EOF
npm run accounts:encode
```

## Advanced Usage Examples

### Complete Development Setup
```bash
# 1. Initial setup with interactive wizard
npm start setup

# 2. Generate development certificates (trusted by browser)
npm start cert mkcert

# 3. Initialize database with migrations
npm start db migrate
npm start db seed

# 4. Prepare Steam accounts
npm run accounts:decode     # Edit accounts.template
npm run accounts:encode     # Encrypt for application

# 5. Start development server with hot reload
npm run dev
```

### Production Deployment (Manual)
```bash
# 1. Production setup with optimized defaults
npm start quick-setup \
  --env production \
  --database postgresql \
  --admin-email admin@yourdomain.com \
  --admin-password "YourSecurePassword123!" \
  --steam-account "production_steam:production_password"

# 2. Get production-grade TLS certificates
npm start cert letsencrypt \
  --domain api.yourdomain.com \
  --email admin@yourdomain.com

# 3. Run production database migrations
npm run db:migrate:prod

# 4. Build and start production server
npm run build:prod
npm run start:prod
```

### Docker Deployment (Recommended for Production)
```bash
# 1. Complete Docker setup wizard
npm start setup --docker-only

# 2. Start all services with orchestration
npm start docker --start

# 3. Monitor service health
npm start docker --status

# 4. View aggregated logs
npm start docker --logs
```

### Bulk Workshop Downloads with Hosting
```bash
# 1. Download multiple Workshop items and host them
npm start download host \
  -i "123456789,987654321,555444333,777888999" \
  -a "steam_production_account" \
  -p 8080 \
  --password "download2024" \
  --expire 48

# 2. Share access information
echo "📁 Files available at: http://yourserver:8080"
echo "🔒 Username: wallwhale"
echo "🔑 Password: download2024"
echo "⏰ Auto-expires in: 48 hours"

# 3. Monitor download progress
npm start download list --status running

# 4. Files automatically expire after 48 hours
```

### Development Workflow with Hot Reload
```bash
# Terminal 1: Start development server
npm run dev

# Terminal 2: Watch for database changes
npm run db:studio

# Terminal 3: Monitor logs
tail -f logs/wallwhale.log

# Terminal 4: Test downloads
npm start download direct -i "123456789" -a "dev_account"
```

### Team Collaboration Setup
```bash
# 1. Team lead sets up encrypted accounts
npm run accounts:decode
# Edit accounts.template with shared Steam accounts
npm run accounts:encode

# 2. Commit encrypted accounts (safe)
git add accounts.safe .env.example
git commit -m "Add shared Steam accounts"

# 3. Team members clone and setup
git clone <repository>
cp .env.example .env
# Get ENCRYPTION_SECRET from team lead
npm start setup --depot-only
npm start cert mkcert
npm run dev
```

### Enterprise Integration Example
```bash
# 1. Setup with enterprise database
npm start quick-setup \
  --env production \
  --database postgresql \
  --admin-email enterprise@company.com

# 2. Setup corporate certificates
# Copy corporate certificates to certs/ directory
npm start cert check

# 3. Configure enterprise monitoring
export ENABLE_METRICS=true
export ENABLE_HEALTH_CHECKS=true
export PROMETHEUS_ENDPOINT=http://prometheus.company.com:9090

# 4. Start with enterprise configuration
npm run start:prod
```

## Exit Codes

WallWhale CLI commands use standard exit codes for automation and monitoring:

- `0` - **Success** - Command completed successfully
- `1` - **General error** - Unexpected error or command failure
- `2` - **Configuration error** - Invalid configuration or missing settings
- `3` - **Dependency missing** - Required dependency not found
- `4` - **Permission error** - Insufficient file or network permissions
- `5` - **Network error** - Connection timeout or network failure

**Example usage in scripts:**
```bash
#!/bin/bash

# Check if WallWhale is healthy before deployment
npm start health --url https://api.wallwhale.com
if [ $? -eq 0 ]; then
    echo "✅ WallWhale is healthy, proceeding with deployment"
    ./deploy.sh
else
    echo "❌ WallWhale health check failed (exit code: $?)"
    exit 1
fi
```

## Environment Variables

Key environment variables for CLI operation:

### Core Configuration
```bash
NODE_ENV=development|production    # Environment mode
HOST=0.0.0.0                      # Server host binding
PORT=3000                         # Server port
TLS_ENABLE=true|false             # Enable TLS/HTTPS
```

### Database Configuration  
```bash
DATABASE_URL=postgresql://user:pass@host:port/db  # Database connection
DATABASE_POOL_SIZE=10                             # Connection pool size
DATABASE_TIMEOUT=30000                            # Query timeout (ms)
```

### Steam Integration
```bash
SAVE_ROOT=./downloads             # Download directory
DEPOT_DOWNLOADER_PATH=./DepotDownloaderMod/DepotDownloaderMod  # Executable path
ENCRYPTION_SECRET=your-secret-key # Steam account encryption key
```

### Security & Performance
```bash
LOG_LEVEL=info                    # Logging level (debug|info|warn|error)
RATE_LIMIT_MAX=100               # Requests per window
RATE_LIMIT_WINDOW=60000          # Rate limit window (ms)
MAX_UPLOAD_SIZE=100MB            # Maximum file upload size
REQUEST_TIMEOUT=30000            # HTTP request timeout (ms)
```

### Feature Toggles
```bash
ENABLE_METRICS=true              # Prometheus metrics
ENABLE_HEALTH_CHECKS=true        # Health monitoring
DOCS_ENABLED=true                # API documentation
AUTO_CLEANUP_ENABLED=true        # Automatic file cleanup
```

For complete environment configuration, see `docs/CONFIGURATION.md`.

## Troubleshooting

### Common Issues and Solutions

**1. DepotDownloader not found**
```bash
# Problem: DepotDownloader executable missing or not accessible
npm start build-depot

# Advanced: Manual build verification
./DepotDownloaderMod/DepotDownloaderMod --help
chmod +x ./DepotDownloaderMod/DepotDownloaderMod  # Unix permissions
```

**2. Certificate errors**
```bash
# Problem: TLS certificate issues or browser warnings
npm start cert check              # Check certificate status
npm start cert setup             # Interactive certificate setup

# For development: Generate trusted local certificates
npm start cert mkcert

# For production: Get proper certificates
npm start cert letsencrypt -d yourdomain.com -e admin@yourdomain.com
```

**3. Database connection issues**
```bash
# Problem: Cannot connect to database
npm start config validate         # Validate database configuration
npm start db migrate             # Apply missing migrations

# Check database status
npm start health --detailed

# Reset database if corrupted
npm run db:reset                 # ⚠️ DESTROYS ALL DATA
npm run db:migrate
npm run db:seed
```

**4. Steam authentication failures**
```bash
# Problem: Steam account login fails
npm run accounts:decode          # Check account credentials
npm run accounts:encode          # Re-encrypt after updates

# Test specific account
npm start download direct -i "123456789" -a "problem_account"

# Check account status in database
npm run db:studio               # Browse SteamAccount table
```

**5. Permission errors**
```bash
# Problem: File or directory permission denied
# Ensure proper file permissions
chmod +x DepotDownloaderMod/DepotDownloaderMod
chmod 755 downloads/
chmod 600 certs/server.key       # Private key security

# Check directory ownership
ls -la downloads/ certs/ data/
```

**6. Port already in use**
```bash
# Problem: Cannot bind to port (address already in use)
npm start --port 3001            # Use different port
npm start health --url http://localhost:3001  # Test new port

# Find what's using the port
netstat -tulpn | grep :3000      # Linux
netstat -ano | findstr :3000     # Windows
```

**7. Docker issues**
```bash
# Problem: Docker services won't start
npm start docker --status        # Check service status
docker ps -a                     # List all containers
docker logs wallwhale-app        # Check specific container logs

# Rebuild from scratch
npm start docker --stop
docker system prune -a           # Clean Docker cache
npm start docker --rebuild
```

**8. Memory or performance issues**
```bash
# Problem: High memory usage or slow performance
npm start health --detailed      # Check resource usage
npm start config show           # Review configuration

# Optimize configuration
export NODE_OPTIONS="--max-old-space-size=2048"  # Increase Node.js memory
export GLOBAL_CONCURRENCY=2     # Reduce concurrent downloads
export LOG_LEVEL=warn           # Reduce log verbosity
```

**9. Network connectivity issues**
```bash
# Problem: Cannot reach Steam servers or external services
npm start check                 # Validate network connectivity

# Test Steam connectivity manually
curl -I https://steamcommunity.com
ping steamcommunity.com

# Check proxy or firewall settings
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

**10. Download failures**
```bash
# Problem: Workshop downloads fail or timeout
npm start download list --status failed  # View failed downloads

# Check DepotDownloader logs
tail -f logs/depot-downloader.log

# Test with minimal example
npm start download direct -i "123456789" -a "working_account" --keep-temp

# Verify Steam account works
npm run accounts:decode
# Test login credentials manually on Steam website
```

### Advanced Debugging

**Enable Debug Logging:**
```bash
# Maximum verbosity for troubleshooting
export LOG_LEVEL=debug
export NODE_ENV=development
npm run dev
```

**Health Check Script:**
```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "🔍 WallWhale Health Check"
echo "========================"

# 1. Environment check
echo "1. Environment validation..."
npm start check || echo "❌ Environment check failed"

# 2. Service health
echo "2. Service health..."
npm start health --detailed || echo "❌ Service health check failed"

# 3. Database connectivity
echo "3. Database check..."
npm run db:migrate || echo "❌ Database migration failed"

# 4. Certificate validation
echo "4. Certificate check..."
npm start cert check || echo "❌ Certificate validation failed"

# 5. Steam account validation
echo "5. Steam accounts..."
npm run accounts:help || echo "❌ Account management failed"

# 6. DepotDownloader test
echo "6. DepotDownloader test..."
./DepotDownloaderMod/DepotDownloaderMod --help > /dev/null 2>&1 || echo "❌ DepotDownloader not working"

echo "✅ Health check complete"
```

**Performance Monitoring:**
```bash
# Monitor resource usage during downloads
npm start download direct -i "123456789" -a "test_account" &
DOWNLOAD_PID=$!

# Monitor in another terminal
watch -n 1 "ps aux | grep -E '(node|DepotDownloader)' | grep -v grep"
watch -n 1 "df -h ."                    # Disk usage
watch -n 1 "free -h"                    # Memory usage (Linux)

# Kill if needed
kill $DOWNLOAD_PID
```

For detailed troubleshooting, see `docs/TROUBLESHOOTING.md`.

### Getting Help

**Community Resources:**
- 📚 **Documentation**: Check the `docs/` directory for detailed guides
- 🐛 **Issues**: Report bugs at the project repository
- 💬 **Discussions**: Join community discussions for help and tips
- 📧 **Support**: Contact the WallWhale team for enterprise support

**Debug Information Collection:**
```bash
# Collect comprehensive debug information
npm start config show > debug-info.txt
npm start health --detailed >> debug-info.txt
npm start cert check >> debug-info.txt
echo "--- Environment ---" >> debug-info.txt
env | grep -E "(NODE_ENV|DATABASE_URL|TLS_ENABLE)" >> debug-info.txt
echo "--- System Info ---" >> debug-info.txt
node --version >> debug-info.txt
npm --version >> debug-info.txt
```
