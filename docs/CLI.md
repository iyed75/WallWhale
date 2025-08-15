# 🔧 CLI Tools & Advanced Features

## CLI Overview

WallWhale Server includes a comprehensive command-line interface providing direct download capabilities, server management, certificate automation, and administrative tools.

## Certificate Management

### Interactive Certificate Wizard

The certificate wizard guides you through setting up TLS certificates for your deployment:

```bash
npm run cert:setup
```

**Interactive Options:**
1. **Self-Signed Certificate** - Quick setup for development
2. **mkcert Certificate** - Trusted local certificates for development
3. **Let's Encrypt Certificate** - Production certificates with automatic renewal

### Self-Signed Certificates

Generate self-signed certificates for development and testing:

```bash
# Basic self-signed certificate
npm run cert:generate

# With custom options
npm run cert:generate --domain localhost --organization "My Company" --days 365
```

**Generated Files:**
- `certs/cert.pem` - Public certificate
- `certs/key.pem` - Private key
- `certs/ca.pem` - Certificate authority (self-signed)

### mkcert Integration

Generate browser-trusted certificates for local development:

```bash
# Install mkcert and generate certificate
npm run cert:mkcert

# With custom domains
npm run cert:mkcert --domains "localhost,127.0.0.1,myapp.local"
```

**Features:**
- **Automatic Installation**: Installs mkcert if not present
- **CA Installation**: Installs root CA in system trust store
- **Multi-Domain**: Supports multiple domains in single certificate
- **Zero Warnings**: No browser security warnings

**Windows Integration:**
- Visible PowerShell window for transparency
- UAC prompt for certificate authority installation
- Automatic PATH detection and updates
- Progress feedback during installation

### Let's Encrypt Certificates

Obtain production certificates from Let's Encrypt:

```bash
# Interactive setup
npm run cert:letsencrypt

# With parameters
npm run cert:letsencrypt --domain yourdomain.com --email admin@yourdomain.com
```

**Requirements:**
- Public domain name
- Port 80 accessible for ACME challenge
- Valid DNS resolution

**Features:**
- Automatic certificate generation
- 90-day validity with renewal reminders
- Multiple domain support
- Rate limiting awareness

### Certificate Status & Management

```bash
# Check certificate status
npm run cert:check

# Certificate information
npm run cert:info

# Renew certificates (Let's Encrypt)
npm run cert:renew
```

**Status Output:**
```
📋 Certificate Status Report

TLS Configuration:
✅ TLS_ENABLE: true
✅ Certificate Path: certs/cert.pem
✅ Private Key Path: certs/key.pem

Certificate Details:
✅ Valid: true
✅ Subject: localhost
✅ Issuer: mkcert development CA
✅ Valid From: 2024-08-13 10:00:00 UTC
✅ Valid Until: 2025-08-13 10:00:00 UTC
✅ Days Remaining: 365
✅ Certificate Type: mkcert (trusted local)

All checks passed! 🎉
```

## Direct Download Operations

### CLI Download Commands

The CLI provides direct download capabilities without running the full server:

```bash
# Basic download
npm run cli download direct -i <workshop-id> -a <steam-account>

# Download with custom output
npm run cli download direct \
  -i "123456789" \
  -a "steam_account" \
  -o "./my_downloads" \
  --no-zip \
  --keep-temp

# Batch download
npm run cli download direct \
  -i "123456789,987654321,555444333" \
  -a "steam_account" \
  --parallel 3
```

**Parameters:**
- `-i, --id`: Workshop ID(s) (comma-separated for multiple)
- `-a, --account`: Steam account name
- `-o, --output`: Output directory (default: ./downloads)
- `--no-zip`: Skip ZIP compression
- `--keep-temp`: Keep temporary files
- `--parallel`: Number of parallel downloads

### File Hosting & Sharing

Host downloaded files for easy sharing:

```bash
# Basic file hosting
npm run cli download host \
  -i "123456789,987654321" \
  -a "steam_account" \
  -p 8080

# Secure hosting with password
npm run cli download host \
  -i "123456789" \
  -a "steam_account" \
  -p 8080 \
  --password "secret123" \
  --expire 24 \
  --ssl

# Advanced hosting options
npm run cli download host \
  -i "123456789,987654321,555444333" \
  -a "steam_account" \
  -p 8080 \
  --password "download2024" \
  --expire 48 \
  --max-downloads 100 \
  --bandwidth-limit "10MB/s" \
  --custom-domain "files.mycompany.com"
```

**Hosting Features:**
- **Password Protection**: Optional password-based access
- **Auto-Expiration**: Time-based automatic cleanup
- **Download Limits**: Maximum download count per file
- **Bandwidth Control**: Transfer rate limiting
- **QR Code Generation**: Mobile-friendly access codes
- **HTTPS Support**: SSL/TLS encryption
- **Custom Domains**: Use your own domain name
- **Analytics**: Download tracking and statistics

**Generated Web Interface:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Download Portal</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        /* Beautiful, responsive CSS included */
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Steam Workshop Downloads</h1>
        <div class="file-list">
            <div class="file-item">
                <h3>Workshop Item 123456789</h3>
                <p>Size: 45.2 MB • Downloaded: 23 times</p>
                <button onclick="downloadFile('123456789')">Download</button>
            </div>
        </div>
        <div class="qr-code">
            <img src="/qr/123456789" alt="QR Code">
            <p>Scan for mobile access</p>
        </div>
    </div>
</body>
</html>
```

### Download Management

```bash
# List recent downloads
npm run cli download list

# List with filters
npm run cli download list \
  --limit 50 \
  --status success \
  --account steam_account \
  --since "2024-08-01"

# Download history
npm run cli download history \
  --format json \
  --export downloads.json

# Cleanup old downloads
npm run cli download cleanup \
  --older-than 7d \
  --dry-run
```

## Server Management

### Server Operations

```bash
# Start server
npm run start

# Start with custom options
npm run start --port 4000 --host 0.0.0.0

# Production mode
npm run start:prod

# Development mode
npm run dev

# Debug mode
npm run dev:debug
```

### Health Monitoring

```bash
# Basic health check
npm run health

# Detailed health check
npm run health --url https://localhost:3000 --detailed

# Continuous monitoring
npm run health --monitor --interval 30
```

**Health Check Output:**
```
🏥 Server Health Report

Connection Status:
✅ Server: https://localhost:3000 (200 OK)
✅ Response Time: 45ms
✅ TLS: Valid certificate

Service Status:
✅ Database: Connected (PostgreSQL 16.0)
✅ Steam Integration: Ready (2 accounts active)
✅ File System: Writable (/app/downloads)
✅ Redis Cache: Connected (optional)

Performance Metrics:
📊 Uptime: 2d 14h 32m
📊 Memory Usage: 256MB / 512MB (50%)
📊 Active Downloads: 3
📊 Queued Jobs: 1
📊 Total Downloads: 1,247

All systems operational! 🎉
```

### Configuration Management

```bash
# Display current configuration
npm run config:show

# Validate configuration
npm run config:validate

# Configuration wizard
npm run config:setup

# Environment check
npm run config:env-check
```

**Configuration Display:**
```
⚙️  WallWhale Server Configuration

Server Settings:
• Environment: production
• Port: 3000
• Host: 0.0.0.0
• TLS: Enabled (Let's Encrypt)

Security Settings:
• JWT Secret: *** (configured, 32 characters)
• API Key Salt: *** (configured, 16 characters)
• Encryption Secret: *** (configured, 32 characters)
• CORS Origins: https://app.company.com

Database:
• Type: PostgreSQL
• URL: postgresql://***@db:5432/depot
• Status: Connected

Performance:
• Global Concurrency: 10
• Per-Key Concurrency: 3
• Rate Limit: 300 req/min

Features:
✅ Metrics Enabled
✅ Health Checks Enabled
❌ API Docs Disabled (production)
✅ Auto Cleanup Enabled
```

## Database Management

### Database Operations

```bash
# Generate Prisma client
npm run db:generate

# Apply schema changes
npm run db:push

# Create and apply migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed with test data
npm run db:seed
```

### Advanced Database Tools

```bash
# Open Prisma Studio
npm run db:studio

# Database backup
npm run db:backup --output backup.sql

# Database restore
npm run db:restore --input backup.sql

# Database optimization
npm run db:optimize

# Database statistics
npm run db:stats
```

**Database Statistics:**
```
📊 Database Statistics

Tables:
• Users: 25 records
• API Keys: 45 records (40 active)
• Downloads: 1,247 records
• Steam Users: 5 records (3 active)
• Audit Logs: 15,234 records

Storage:
• Database Size: 45.2 MB
• Downloads Storage: 2.3 GB
• Total Files: 1,247

Performance:
• Average Query Time: 12ms
• Connection Pool: 8/20 connections
• Cache Hit Rate: 94.5%
```

## Advanced CLI Features

### API Key Management

```bash
# List API keys
npm run cli apikey list

# Create API key
npm run cli apikey create \
  --name "Production Bot" \
  --scopes "download:read,download:write" \
  --rate-limit 100 \
  --quota-daily 5000

# Update API key
npm run cli apikey update key_123 \
  --rate-limit 200 \
  --quota-daily 10000

# Revoke API key
npm run cli apikey revoke key_123
```

### User Management

```bash
# List users
npm run cli user list

# Create admin user
npm run cli user create \
  --email admin@company.com \
  --password secure123 \
  --role ADMIN

# Reset user password
npm run cli user reset-password \
  --email user@company.com \
  --new-password newpass123
```

### Steam Account Management

```bash
# List Steam accounts
npm run cli steam list

# Add Steam account
npm run cli steam add \
  --username steam_user \
  --password steam_pass \
  --display-name "Production Account"

# Test Steam account
npm run cli steam test --username steam_user

# Update Steam account
npm run cli steam update steam_user \
  --password new_password \
  --status ACTIVE
```

### Audit & Monitoring

```bash
# View audit logs
npm run cli audit logs --limit 100

# Export audit logs
npm run cli audit export \
  --format csv \
  --output audit-2024-08.csv \
  --date-range "2024-08-01,2024-08-31"

# Audit statistics
npm run cli audit stats

# Security report
npm run cli security report
```

### Maintenance Operations

```bash
# Cleanup old files
npm run cli maintenance cleanup \
  --older-than 30d \
  --confirm

# Optimize database
npm run cli maintenance optimize-db

# Update dependencies
npm run cli maintenance update-deps

# Security scan
npm run cli maintenance security-scan

# System diagnostics
npm run cli maintenance diagnostics
```

## Scripting & Automation

### Batch Operations

Create custom scripts for common operations:

```bash
#!/bin/bash
# bulk-download.sh

# Download multiple workshop items
items=(
  "123456789"
  "987654321"
  "555444333"
  "111222333"
)

for item in "${items[@]}"; do
  echo "Downloading workshop item: $item"
  npm run cli download direct -i "$item" -a "steam_account"
done

echo "Bulk download completed!"
```

### Monitoring Scripts

```bash
#!/bin/bash
# health-monitor.sh

while true; do
  npm run health --quiet
  if [ $? -ne 0 ]; then
    echo "$(date): Server health check failed!" | tee -a health.log
    # Send alert notification
    curl -X POST "https://hooks.slack.com/webhook" -d '{"text":"Server health check failed"}'
  fi
  sleep 60
done
```

### Backup Automation

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
npm run db:backup --output "$BACKUP_DIR/db_$DATE.sql"

# Configuration backup
cp .env "$BACKUP_DIR/config_$DATE.env"

# Downloads backup (if needed)
tar -czf "$BACKUP_DIR/downloads_$DATE.tar.gz" downloads/

echo "Backup completed: $DATE"
```

## Environment-Specific CLI Usage

### Development
```bash
# Quick development setup
npm run dev:setup

# Generate test certificates
npm run cert:mkcert

# Seed test data
npm run db:seed --env development

# Start development server
npm run dev
```

### Production
```bash
# Production deployment
npm run prod:deploy

# Let's Encrypt certificates
npm run cert:letsencrypt --domain yourdomain.com

# Database migrations
npm run db:migrate --env production

# Start production server
npm run start:prod
```

### Docker
```bash
# Docker-specific commands
npm run docker:build
npm run docker:run
npm run docker:logs
npm run docker:health
```

This comprehensive CLI provides powerful tools for managing every aspect of the WallWhale Server, from development through production deployment and ongoing maintenance.
