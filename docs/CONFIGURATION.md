# ⚙️ Configuration Guide

## Environment Variables

### Required Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ADMIN_EMAIL` | Admin user email | `admin@company.com` | Yes |
| `ADMIN_PASSWORD` | Admin user password | `secure-password-123` | Yes |
| `SAVE_ROOT` | Download base directory | `./downloads` | Yes |
| `DEPOTDOWNLOADER_PATH` | DepotDownloader executable path | `DepotDownloaderMod/DepotDownloaderMod.exe` | Yes |
| `ENCRYPTION_SECRET` | Password encryption key (32+ chars) | `your-32-character-encryption-key` | Yes |

### Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3000` | `8080` |
| `HOST` | Server bind address | `0.0.0.0` | `127.0.0.1` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `LOG_LEVEL` | Logging level | `info` | `debug`, `warn`, `error` |
| `LOG_FORMAT` | Log output format | `pretty` | `json` |

### Security Configuration

| Variable | Description | Default | Production Required |
|----------|-------------|---------|-------------------|
| `JWT_SECRET` | JWT signing secret (32+ chars) | `dev-secret-change-in-production` | Yes |
| `API_KEY_SALT` | API key salt (16+ chars) | `dev-salt-change-in-production` | Yes |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` | No |

### Network Security

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `IP_ALLOW_LIST` | Comma-separated allowed IPs | None | `192.168.1.0/24,10.0.0.1` |
| `IP_DENY_LIST` | Comma-separated blocked IPs | None | `192.168.1.100,10.0.0.50` |
| `CORS_ORIGINS` | CORS allowed origins | `*` | `https://app.example.com,https://admin.example.com` |

### TLS/HTTPS Configuration

| Variable | Description | Default | Required If TLS Enabled |
|----------|-------------|---------|------------------------|
| `TLS_ENABLE` | Enable HTTPS | `false` | - |
| `TLS_KEY_PATH` | Private key file path | `certs/key.pem` | Yes |
| `TLS_CERT_PATH` | Certificate file path | `certs/cert.pem` | Yes |

### Database Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | Database connection string | `file:./prisma/dev.db` | `postgresql://user:pass@localhost:5432/depot` |

### Performance Configuration

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `GLOBAL_CONCURRENCY` | Max concurrent downloads | `2` | `1-20` |
| `PER_KEY_CONCURRENCY` | Max concurrent per API key | `1` | `1-10` |
| `MAX_UPLOAD_SIZE` | Maximum request body size | `100MB` | `1MB-1GB` |
| `REQUEST_TIMEOUT` | Request timeout (ms) | `30000` | `5000-300000` |

### Rate Limiting

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` | `1000-3600000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | `10-10000` |
| `RATE_LIMIT_SKIP_FAILED_REQUESTS` | Skip failed requests | `true` | `true`, `false` |

### Feature Flags

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `ENABLE_METRICS` | Enable Prometheus metrics | `true` | `true`, `false` |
| `ENABLE_HEALTH_CHECKS` | Enable health endpoints | `true` | `true`, `false` |
| `DOCS_ENABLED` | Enable API documentation | `true` | `true`, `false` |
| `AUTO_CLEANUP_ENABLED` | Enable automatic file cleanup | `true` | `true`, `false` |

### Redis Configuration (Optional)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_URL` | Redis connection string | None | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis password | None | `redis-password` |
| `REDIS_DB` | Redis database number | `0` | `0-15` |

### Email Configuration (Optional)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SMTP_HOST` | SMTP server host | None | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` | `587`, `465`, `25` |
| `SMTP_USER` | SMTP username | None | `notifications@company.com` |
| `SMTP_PASS` | SMTP password | None | `smtp-password` |

### Webhook Configuration (Optional)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `WEBHOOK_SUCCESS_URL` | Success notification webhook | None | `https://api.company.com/webhooks/success` |
| `WEBHOOK_FAILURE_URL` | Failure notification webhook | None | `https://api.company.com/webhooks/failure` |
| `WEBHOOK_SECRET` | Webhook signing secret | None | `webhook-secret-key` |

### File Management

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CLEANUP_INTERVAL` | Cleanup check interval (ms) | `86400000` (24h) | `3600000` (1h) |
| `MAX_FILE_AGE` | Maximum file age (ms) | `604800000` (7d) | `259200000` (3d) |
| `REQUIRE_SUBPATH` | Required path component | None | `projects\\myprojects` |

## Environment File Examples

### Development (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Admin Configuration
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=change-me-in-production

# Security (Development Only - Change in Production!)
JWT_SECRET=development-jwt-secret-change-in-production
API_KEY_SALT=dev-salt-change-in-production
ENCRYPTION_SECRET=development-encryption-secret-32-chars

# Storage
SAVE_ROOT=./downloads
DEPOTDOWNLOADER_PATH=DepotDownloaderMod/DepotDownloaderMod.exe

# Database
DATABASE_URL=file:./prisma/dev.db

# Features
DOCS_ENABLED=true
ENABLE_METRICS=true
TLS_ENABLE=false

# Performance
GLOBAL_CONCURRENCY=2
RATE_LIMIT_MAX=1000
```

### Production (.env.production)
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=warn
LOG_FORMAT=json

# Admin Configuration
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=your-secure-production-password

# Security (CHANGE THESE!)
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
API_KEY_SALT=your-production-api-key-salt-16-chars-minimum
ENCRYPTION_SECRET=your-production-encryption-secret-32-chars

# Storage
SAVE_ROOT=/var/lib/depot-downloader/downloads
DEPOTDOWNLOADER_PATH=/usr/local/bin/DepotDownloaderMod.exe

# Database
DATABASE_URL=postgresql://depot_user:secure_password@db:5432/depot_production?sslmode=require

# TLS/HTTPS
TLS_ENABLE=true
TLS_KEY_PATH=/etc/ssl/private/depot.key
TLS_CERT_PATH=/etc/ssl/certs/depot.crt

# Network Security
CORS_ORIGINS=https://app.company.com,https://admin.company.com
IP_ALLOW_LIST=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Performance
GLOBAL_CONCURRENCY=10
PER_KEY_CONCURRENCY=3
RATE_LIMIT_MAX=300
REQUEST_TIMEOUT=60000

# Features
DOCS_ENABLED=false
ENABLE_METRICS=true
AUTO_CLEANUP_ENABLED=true

# Redis (Optional)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=secure-redis-password

# Email Notifications (Optional)
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=notifications@company.com
SMTP_PASS=smtp-password

# Webhooks (Optional)
WEBHOOK_SUCCESS_URL=https://api.company.com/webhooks/download-success
WEBHOOK_FAILURE_URL=https://api.company.com/webhooks/download-failure
WEBHOOK_SECRET=webhook-signing-secret
```

### Docker (.env.docker)
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Admin Configuration
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=docker-admin-password

# Security
JWT_SECRET=docker-jwt-secret-32-characters-minimum
API_KEY_SALT=docker-api-key-salt-16-chars-minimum
ENCRYPTION_SECRET=docker-encryption-secret-32-characters

# Storage (Docker volumes)
SAVE_ROOT=/app/downloads
DEPOTDOWNLOADER_PATH=/app/DepotDownloaderMod/DepotDownloaderMod.exe

# Database (Docker service)
DATABASE_URL=postgresql://depot:depot@postgres:5432/depot

# Redis (Docker service)
REDIS_URL=redis://redis:6379

# Features
ENABLE_METRICS=true
AUTO_CLEANUP_ENABLED=true
```

## Configuration Validation

The server validates all environment variables on startup and provides helpful error messages:

### Validation CLI
```bash
# Check configuration
npm run config:validate

# Show current configuration
npm run config:show

# Test database connection
npm run db:test
```

### Validation Example Output
```
✅ Configuration Validation Results

Server Configuration:
✅ PORT: 3000 (valid)
✅ HOST: 0.0.0.0 (valid)
✅ NODE_ENV: production (valid)

Security Configuration:
✅ JWT_SECRET: *** (32 characters, secure)
✅ API_KEY_SALT: *** (16 characters, secure)
✅ ENCRYPTION_SECRET: *** (32 characters, secure)
⚠️  CORS_ORIGINS: * (wildcard - consider restricting in production)

Database Configuration:
✅ DATABASE_URL: postgresql://*** (valid connection)

File System:
✅ SAVE_ROOT: /var/lib/depot/downloads (writable)
✅ DEPOTDOWNLOADER_PATH: /usr/bin/DepotDownloaderMod.exe (executable)

TLS Configuration:
✅ TLS_ENABLE: true
✅ TLS_CERT_PATH: /etc/ssl/certs/depot.crt (valid certificate)
✅ TLS_KEY_PATH: /etc/ssl/private/depot.key (valid private key)

All validations passed! ✅
```

## Steam Account Configuration

### Adding Steam Accounts via API

```bash
curl -X POST "http://localhost:3000/v1/admin/steam-users" \
  -H "X-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_steam_username",
    "password": "your_steam_password",
    "displayName": "Primary Account"
  }'
```

### Adding Steam Accounts via Database

```sql
-- Using Prisma Studio or direct database access
INSERT INTO SteamUser (id, username, encryptedPassword, displayName, status)
VALUES (
  'steam_user_123',
  'your_steam_username',
  'encrypted_password_here',
  'Primary Account',
  'ACTIVE'
);
```

### Steam Account Security

- **Encryption**: Passwords encrypted with AES-256-GCM
- **Key Derivation**: Uses ENCRYPTION_SECRET for key derivation
- **Database Storage**: Only encrypted passwords stored
- **Memory Handling**: Passwords cleared from memory after use

## Related implementation docs

- `docs/CRYPTO.md` — Exact implementation details for `src/utils/crypto.ts` including format `iv:authTag:ciphertext`, key derivation, and migration instructions.
- `docs/ENV.md` — Detailed description of environment schema, validation behaviors, and helper utilities exported by `src/utils/env.ts`.

## Configuration Best Practices

### Development
- Use `.env` file for local configuration
- Enable debug logging and pretty formatting
- Use SQLite for simplicity
- Enable API documentation
- Use self-signed certificates or mkcert

### Staging
- Mirror production configuration
- Use reduced resource limits
- Enable detailed logging
- Test with production-like data
- Use staging certificates

### Production
- Use environment variables or secret management
- Strong, unique secrets (32+ characters)
- PostgreSQL with connection pooling
- Structured JSON logging
- Valid TLS certificates
- Restricted CORS origins
- IP allowlists where possible
- Disable API documentation
- Enable all security features

### Security Checklist

- [ ] Change all default secrets
- [ ] Use strong passwords (12+ characters)
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up IP filtering if needed
- [ ] Use secure database connections
- [ ] Enable audit logging
- [ ] Set appropriate rate limits
- [ ] Configure file cleanup
- [ ] Use non-root user for processes
- [ ] Secure file permissions
- [ ] Regular secret rotation

### Performance Tuning

#### For High Load
```bash
# Increase concurrency
GLOBAL_CONCURRENCY=20
PER_KEY_CONCURRENCY=5

# Increase rate limits
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000

# Increase timeouts
REQUEST_TIMEOUT=120000

# Use PostgreSQL with connection pooling
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20

# Enable Redis for caching
REDIS_URL=redis://redis:6379
```

#### For Low Resource
```bash
# Reduce concurrency
GLOBAL_CONCURRENCY=1
PER_KEY_CONCURRENCY=1

# Reduce rate limits
RATE_LIMIT_MAX=50

# Use SQLite
DATABASE_URL=file:./data/production.db

# Disable optional features
ENABLE_METRICS=false
DOCS_ENABLED=false
```

## Troubleshooting Configuration

### Common Issues

1. **Invalid JWT Secret**
   ```
   Error: JWT_SECRET must be at least 32 characters
   Solution: Generate a secure 32+ character secret
   ```

2. **Database Connection Failed**
   ```
   Error: Cannot connect to database
   Solution: Check DATABASE_URL and database availability
   ```

3. **File Permission Errors**
   ```
   Error: Cannot write to download directory
   Solution: Check SAVE_ROOT permissions (755 or 775)
   ```

4. **DepotDownloader Not Found**
   ```
   Error: DepotDownloader executable not found
   Solution: Check DEPOTDOWNLOADER_PATH and file permissions
   ```

5. **Certificate Issues**
   ```
   Error: Invalid TLS certificate
   Solution: Regenerate certificates or check file paths
   ```

### Debugging Commands

```bash
# Check environment variables
npm run config:show

# Validate configuration
npm run config:validate

# Test database connection
npm run db:test

# Check file permissions
npm run fs:check

# Verify certificates
npm run cert:check

# Test Steam integration
npm run steam:test
```
