# 🔐 Security & Production Deployment

## Security Overview

WallWhale Server implements enterprise-grade security features designed for production environments. This guide covers security configuration, deployment strategies, and best practices.

## Authentication & Authorization

### JWT Token Security

**Token Configuration:**
```bash
# Production requirements
JWT_SECRET=your-cryptographically-secure-secret-32-chars-minimum
JWT_EXPIRATION=3600  # 1 hour
JWT_REFRESH_EXPIRATION=604800  # 7 days
```

**Security Features:**
- **HS256 Algorithm**: Industry-standard HMAC SHA-256 signing
- **Short Expiration**: 1-hour access tokens with refresh capability
- **Secure Headers**: Automatic security header injection
- **Token Rotation**: Refresh token rotation on use

### API Key Security

**Key Generation:**
- Cryptographically secure random generation
- Minimum 32-character length
- Prefix identification (`ak_` prefix)
- Scoped permissions system

**Security Model:**
```typescript
interface ApiKeyConfig {
  scopes: string[];           // Granular permissions
  rateLimit?: number;         // Requests per minute
  quotaDaily?: number;        // Daily request limit
  quotaMonthly?: number;      // Monthly request limit
  maxConcurrent?: number;     // Concurrent request limit
  maxRuntimeSeconds?: number; // Maximum execution time
  ipAllowList?: string[];     // IP restrictions
  expiresAt?: Date;          // Automatic expiration
}
```

### Role-Based Access Control

**User Roles:**
- **ADMIN**: Full system access, user management, configuration
- **USER**: Limited access to own resources and downloads

**API Key Scopes:**
- `download:read` - Read download jobs and files
- `download:write` - Create and manage downloads
- `download:*` - All download permissions
- `admin:read` - Read administrative data
- `admin:write` - Modify system configuration
- `admin:*` - Full administrative access

## Encryption & Data Protection

### Password Encryption

**Steam Account Passwords:**
```typescript
// AES-256-GCM encryption
const encrypted = encrypt(password, ENCRYPTION_SECRET);
// Stored as: { encrypted: string, iv: string, tag: string }
```

**User Passwords:**
```typescript
// bcrypt with configurable rounds
const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### Security Configuration

**Production Encryption Settings:**
```bash
# Strong encryption key (32+ characters)
ENCRYPTION_SECRET=your-32-character-encryption-key-here

# High bcrypt rounds for user passwords
BCRYPT_ROUNDS=14

# Secure API key salt
API_KEY_SALT=your-secure-salt-16-chars-minimum
```

## Network Security

### TLS/HTTPS Configuration

**Certificate Options:**

1. **Let's Encrypt (Production)**
   ```bash
   npm run cert:letsencrypt --domain yourdomain.com --email admin@yourdomain.com
   ```

2. **Self-Signed (Development)**
   ```bash
   npm run cert:generate --domain localhost
   ```

3. **Custom Certificates**
   ```bash
   TLS_ENABLE=true
   TLS_CERT_PATH=/path/to/certificate.crt
   TLS_KEY_PATH=/path/to/private.key
   ```

### IP Access Control

**Configuration:**
```bash
# Allow specific networks
IP_ALLOW_LIST=192.168.1.0/24,10.0.0.0/8,172.16.0.0/12

# Block specific IPs
IP_DENY_LIST=192.168.1.100,10.0.0.50

# Corporate network example
IP_ALLOW_LIST=203.0.113.0/24,198.51.100.0/24
```

### CORS Security

**Production CORS:**
```bash
# Specific origins only
CORS_ORIGINS=https://app.company.com,https://admin.company.com

# No wildcards in production
CORS_ORIGINS=*  # ❌ Never use in production
```

## Rate Limiting & DDoS Protection

### Multi-Layer Rate Limiting

**Global Rate Limiting:**
```bash
RATE_LIMIT_WINDOW=60000    # 1 minute window
RATE_LIMIT_MAX=300         # 300 requests per minute
RATE_LIMIT_SKIP_FAILED_REQUESTS=true
```

**Per-API-Key Limiting:**
```json
{
  "rateLimit": 60,           // 60 requests per minute
  "quotaDaily": 5000,        // 5000 requests per day
  "quotaMonthly": 150000,    // 150K requests per month
  "maxConcurrent": 5         // 5 concurrent requests
}
```

**DDoS Protection Strategy:**
- **Layer 4**: Use CloudFlare or AWS Shield
- **Layer 7**: Nginx rate limiting + application limits
- **Geographic Filtering**: Block suspicious regions
- **Behavioral Analysis**: Monitor for unusual patterns

## Audit Logging & Compliance

### Comprehensive Audit Trail

**Logged Events:**
- All API requests and responses
- Authentication attempts (success/failure)
- API key usage and violations
- Administrative actions
- Download job lifecycle events
- Configuration changes

**Audit Log Format:**
```json
{
  "id": "audit_abc123",
  "timestamp": "2024-08-13T10:00:00Z",
  "correlationId": "req_def456",
  "userId": "user_123",
  "apiKeyId": "key_789",
  "action": "download:create",
  "resource": "download_abc123",
  "ipAddress": "192.168.1.100",
  "userAgent": "API Client/1.0",
  "details": {
    "pubfileId": "123456789",
    "accountName": "steam_account"
  },
  "outcome": "success"
}
```

### Compliance Features

**GDPR Compliance:**
- User data export capabilities
- Right to be forgotten (data deletion)
- Consent tracking for data processing
- Data retention policies

**Enterprise Compliance:**
- Complete audit trails
- Access control documentation
- Security incident logging
- Regular security assessments

## Production Deployment

### Docker Security

**Secure Dockerfile:**
```dockerfile
FROM node:18-alpine as production

# Create non-root user
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Install dependencies
COPY --chown=nodeuser:nodeuser package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application
COPY --chown=nodeuser:nodeuser dist ./dist
COPY --chown=nodeuser:nodeuser DepotDownloaderMod ./DepotDownloaderMod

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]
```

**Security Scanning:**
```bash
# Scan for vulnerabilities
docker scan wallwhale-server:latest

# Use minimal base images
FROM node:18-alpine  # ✅ Good
FROM node:18-slim    # ✅ Better than full image
FROM node:18         # ❌ Avoid full images
```

### Kubernetes Security

**Security Context:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: depot-server
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
      - name: depot-server
  image: wallwhale-server:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
```

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: depot-server-netpol
spec:
  podSelector:
    matchLabels:
      app: depot-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

### Reverse Proxy Security

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name depot.company.com;
    
    # TLS Configuration
    ssl_certificate /etc/ssl/certs/depot.crt;
    ssl_certificate_key /etc/ssl/private/depot.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Client body size
    client_max_body_size 100M;
    
    # Proxy Configuration
    location / {
        proxy_pass http://depot_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # SSE for real-time logs (no buffering)
    location ~* ^/v1/downloads/.*/logs {
        proxy_pass http://depot_backend;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

## Security Monitoring

### Prometheus Security Metrics

```typescript
// Security-focused metrics
const securityMetrics = {
  authFailures: new Counter({
    name: 'depot_auth_failures_total',
    help: 'Authentication failures',
    labelNames: ['method', 'reason']
  }),
  
  rateLimitHits: new Counter({
    name: 'depot_rate_limit_hits_total',
    help: 'Rate limit violations',
    labelNames: ['endpoint', 'keyId']
  }),
  
  suspiciousActivity: new Counter({
    name: 'depot_suspicious_activity_total',
    help: 'Suspicious activity detected',
    labelNames: ['type', 'severity']
  })
};
```

### Alert Rules

**Grafana Alerts:**
```yaml
# High authentication failure rate
- alert: HighAuthFailureRate
  expr: rate(depot_auth_failures_total[5m]) > 10
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High authentication failure rate detected"

# Excessive rate limiting
- alert: ExcessiveRateLimiting
  expr: rate(depot_rate_limit_hits_total[1m]) > 5
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Possible DDoS attack detected"

# API key abuse
- alert: ApiKeyAbuse
  expr: rate(depot_api_key_usage_total[1m]) by (keyId) > 100
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "API key {{ $labels.keyId }} showing unusual activity"
```

## Security Best Practices

### Production Security Checklist

#### Essential Security
- [ ] **Strong Secrets**: All secrets 32+ characters, cryptographically random
- [ ] **HTTPS Only**: Force HTTPS redirects, HSTS headers
- [ ] **CORS Restriction**: Specific origins, no wildcards
- [ ] **IP Filtering**: Implement allow/deny lists
- [ ] **Rate Limiting**: Aggressive rate limits with burst protection
- [ ] **API Key Scopes**: Minimal required permissions
- [ ] **Regular Rotation**: Secret and certificate rotation schedule

#### Application Security
- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **SQL Injection**: Prisma ORM prevents SQL injection
- [ ] **XSS Protection**: Security headers and CSP
- [ ] **CSRF Protection**: Token-based CSRF protection
- [ ] **File Upload Security**: Size limits, type validation
- [ ] **Error Handling**: No sensitive data in error responses
- [ ] **Logging Security**: Sensitive data excluded from logs

#### Infrastructure Security
- [ ] **Container Security**: Non-root user, minimal image
- [ ] **Network Segmentation**: Proper firewall rules
- [ ] **Database Security**: Encrypted connections, access controls
- [ ] **Secrets Management**: External secret store (Vault, K8s secrets)
- [ ] **Monitoring**: Security monitoring and alerting
- [ ] **Backup Security**: Encrypted backups, access controls
- [ ] **Update Process**: Regular security updates

### Security Incident Response

**Incident Types:**
1. **Authentication Bypass**: Unauthorized access attempts
2. **DDoS Attack**: Excessive traffic patterns
3. **Data Breach**: Unauthorized data access
4. **API Abuse**: Rate limit violations, unusual patterns
5. **Malware**: Suspicious file uploads or downloads

**Response Procedures:**
1. **Detection**: Automated monitoring and alerts
2. **Assessment**: Determine severity and impact
3. **Containment**: Block malicious traffic, revoke compromised keys
4. **Investigation**: Analyze logs, determine root cause
5. **Recovery**: Restore services, patch vulnerabilities
6. **Post-Incident**: Update security measures, documentation

### Regular Security Tasks

**Daily:**
- Monitor security alerts and metrics
- Review authentication failure logs
- Check for failed intrusion attempts

**Weekly:**
- Review API key usage patterns
- Analyze security logs for anomalies
- Update IP allow/deny lists

**Monthly:**
- Rotate API keys and secrets
- Review user access permissions
- Update security dependencies
- Security vulnerability scans

**Quarterly:**
- Comprehensive security audit
- Penetration testing
- Security training updates
- Disaster recovery testing

### Security Testing

**Automated Security Testing:**
```bash
# Dependency scanning
npm audit

# Static analysis
npm run lint:security

# Container scanning
docker scan wallwhale-server:latest

# Infrastructure scanning
terraform plan -out=plan.out
checkov -f plan.out
```

**Manual Security Testing:**
- API endpoint security testing
- Authentication bypass attempts
- Rate limiting validation
- Input validation testing
- File upload security testing
- SQL injection testing (via Prisma)

This comprehensive security approach ensures enterprise-grade protection for production deployments while maintaining usability and performance.
