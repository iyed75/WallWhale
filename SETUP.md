# 🚀 WallWhale Server and cli Setup Guide

This guide will help you quickly set up and run the WallWhale Server using the interactive setup wizard or Docker.


> [!CAUTION]
>
> Even though no harm is expected nor has happened during development and testing, this project is still in early development and may contain bugs or incomplete features. The most risky part is the automated setup of the project that WILL in some cases ask for admin privileges, in order to install required software such as mkcert or letsencrypt.


## Quick Start

### Option 1: Interactive Setup Wizard (Recommended)

The setup wizard will guide you through configuring your environment, database, Steam accounts, and deployment options.

```bash
# Run the interactive setup wizard
npm run setup
```

The wizard will:
- ✅ Configure your environment (development/production)
- ✅ Set up database (SQLite/PostgreSQL)
- ✅ Configure authentication and security
- ✅ Set up Steam accounts
- ✅ Configure networking and features
- ✅ Set up Docker deployment (optional)
- ✅ Generate all necessary configuration files
- ✅ Initialize the database

### Option 2: Quick Setup (Non-interactive)

For quick testing with default settings:

> [!CAUTION]
>
> Even though no harm is expected, WallWhale is still in early development and may contain bugs or incomplete features. the most risky part is the automated setup of the project that WILL in some cases ask for admin privileges, in order to install required sofwtare such as mkcert or letsencrypt.

```bash
# Quick setup with defaults
npm run setup:quick --steam-account "username:password"

# Or with custom options
npm run setup:quick \
  --env production \
  --database postgresql \
  --port 3000 \
  --admin-email admin@example.com \
  --admin-password securepassword \
  --steam-account "username:password" \
  --docker
```

### Option 3: Manual Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure your settings
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

The setup wizard can configure Docker Compose for you, or you can use it manually:

```bash
# Start with default services
npm run docker:up

# Start with additional services (PostgreSQL, Redis, Nginx, Monitoring)
COMPOSE_PROFILES=postgres,redis,nginx docker-compose up -d

# Stop services
npm run docker:down
```

### Using Docker Scripts

We provide cross-platform scripts that handle everything automatically:

**Linux/macOS:**
```bash
# Run the interactive Docker setup script
npm run docker:start

# Or directly
bash scripts/docker/start.sh
```

**Windows:**
```batch
# Run the interactive Docker setup script
npm run docker:start:win

# Or directly
scripts\docker\start.bat
```

The Docker scripts will:
- ✅ Check Docker availability
- ✅ Create necessary directories
- ✅ Generate `.env` file if missing
- ✅ Build the Docker image
- ✅ Start services (Docker or Docker Compose)
- ✅ Show logs and service status

### Using Plain Docker

```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run

# View logs
npm run docker:logs

# Stop and remove
npm run docker:stop
npm run docker:remove
```

## Environment Check

Before starting, you can verify your environment:

```bash
# Check all dependencies and configuration
npm run check
```

This will verify:
- ✅ Node.js version (18+)
- ✅ Environment configuration (.env file)
- ✅ DepotDownloader executable
- ✅ Database setup
- ✅ Required directories

## Configuration Files

After running the setup wizard, you'll have:

- **`.env`** - Main environment configuration
- **`docker-compose.override.yml`** - Docker Compose customizations (if using Docker Compose)
- **`scripts/start.sh`** / **`scripts/start.bat`** - Platform-specific startup scripts

## Available Services and Profiles

When using Docker Compose, you can enable additional services:

- **`postgres`** - PostgreSQL database (alternative to SQLite)
- **`redis`** - Redis cache for session storage and caching
- **`nginx`** - Nginx reverse proxy with SSL termination
- **`monitoring`** - Prometheus metrics and Grafana dashboards
- **`logging`** - Loki log aggregation and Promtail collection

Enable profiles by setting the `COMPOSE_PROFILES` environment variable:

```bash
# Example: Enable PostgreSQL and Nginx
COMPOSE_PROFILES=postgres,nginx docker-compose up -d
```

## Database Options

### SQLite (Default)
- ✅ **Pros:** Simple setup, no external dependencies, good for development
- ❌ **Cons:** Single-writer, not suitable for high-concurrency production

### PostgreSQL
- ✅ **Pros:** Production-ready, supports concurrent operations, better performance
- ❌ **Cons:** Requires additional setup, more resource usage

The setup wizard will help you choose and configure the appropriate database for your needs.

## Post-Setup

After successful setup:

1. **Review Configuration:** Check the generated `.env` file and adjust settings as needed
2. **Add Steam Accounts:** Ensure you have valid Steam credentials in the `STEAM_ACCOUNTS` setting
3. **Test the Server:** Access the API documentation at `http://localhost:3000/docs`
4. **Monitor Health:** Check server status at `http://localhost:3000/health`

## Useful Commands

```bash
# Development
npm run dev              # Start in development mode
npm run dev:debug        # Start with debugger

# Production
npm run build           # Build for production
npm run start:prod      # Start in production mode

# Database
npm run db:studio       # Open Prisma Studio
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with initial data

# Certificates (for HTTPS)
npm run cert:setup      # Interactive certificate setup
npm run cert:generate   # Generate self-signed certificate

# Health & Monitoring
npm run health:check    # Quick health check
npm run check          # Comprehensive environment check
```

## Troubleshooting

### Common Issues

1. **Docker not found**
   - Install Docker Desktop from [docker.com](https://docs.docker.com/get-docker/)
   - Ensure Docker is running

2. **Permission denied (Linux/macOS)**
   ```bash
   chmod +x scripts/docker/start.sh
   ```

3. **Port already in use**
   - Change the `PORT` in `.env` file
   - Or stop the conflicting service

4. **Steam authentication fails**
   - Verify Steam credentials in `.env`
   - Ensure Steam Guard is properly configured
   - Check for Steam account limitations

5. **Database connection issues**
   - For SQLite: Ensure the `data` directory exists and is writable
   - For PostgreSQL: Verify connection string and database accessibility

### Getting Help

1. Check the [documentation](./docs/) directory
2. Review server logs: `npm run docker:logs` or `docker logs depot-server`
3. Use the health check endpoint: `http://localhost:3000/health`
4. Check the [troubleshooting guide](./docs/TROUBLESHOOTING.md)

## Security Considerations

- 🔒 **Change default passwords** in production
- 🔒 **Use strong JWT secrets** (automatically generated by setup wizard)
- 🔒 **Enable HTTPS** for production deployments
- 🔒 **Configure proper firewall rules**
- 🔒 **Regularly update dependencies**

The setup wizard generates secure random secrets automatically, but always review and customize security settings for production use.

---

**Need help?** Run `npm run setup --help` or check the [full documentation](./docs/README.md).
