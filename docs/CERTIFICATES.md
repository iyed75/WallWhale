# 🔐 Certificate Management Guide

WallWhale Server supports multiple certificate types for HTTPS/TLS encryption.

## 📋 Quick Reference

| Certificate Type | Use Case | Browser Trust | Let's Encrypt Support |
|-----------------|----------|---------------|----------------------|
| **Self-Signed** | Development | ❌ (warnings) | ❌ No |
| **mkcert** | Development | ✅ Trusted | ❌ No |
| **Let's Encrypt** | Production | ✅ Trusted | ✅ Yes |

## 🚀 Getting Started

### 1. Interactive Setup (Recommended)
```bash
npm run cert:setup
```
Launches an interactive wizard to configure certificates.

### 2. Quick Commands

#### Self-Signed Certificate
```bash
# Generate with defaults (localhost)
npm run cert:generate

# Custom domain and organization
npm run cert:generate -- --domain myapp.local --organization "My Company"
```

#### mkcert Certificate (Trusted Development)
```bash
# Generate trusted certificate for localhost
npm run cert:mkcert

# Multiple domains
npm run cert:mkcert -- --domains "localhost,myapp.local,127.0.0.1"
```

#### Let's Encrypt Certificate (Production)
```bash
npm run cert:letsencrypt -- --domain yourdomain.com --email admin@yourdomain.com
```

#### Check Certificate Status
```bash
npm run cert:check
```

## 🔍 Certificate Types Explained

### 🔧 Self-Signed Certificates
- **Best for**: Basic development, testing
- **Pros**: Works everywhere, no external dependencies
- **Cons**: Browser security warnings, manual trust required
- **Setup time**: Instant

```bash
npm run cert:generate
```

### 🛡️ mkcert Certificates
- **Best for**: Professional development, demo environments
- **Pros**: Trusted by browsers, no warnings, easy setup
- **Cons**: Requires mkcert installation, development only
- **Setup time**: 1 minute

**Install mkcert first:**
- Windows: `choco install mkcert`
- macOS: `brew install mkcert`
- Linux: [Installation guide](https://github.com/FiloSottile/mkcert#installation)

```bash
npm run cert:mkcert
```

### 🌐 Let's Encrypt Certificates
- **Best for**: Production servers, public websites
- **Pros**: Fully trusted, free, automatic renewal possible
- **Cons**: Requires public domain, internet accessibility
- **Setup time**: 5-10 minutes

**Requirements:**
- Public domain name (e.g., `api.yourcompany.com`)
- Domain must resolve to your server's public IP
- HTTP port 80 accessible from internet
- Server publicly reachable for domain validation

```bash
npm run cert:letsencrypt -- --domain api.yourcompany.com --email admin@yourcompany.com
```

## ❌ Let's Encrypt Limitations

**Cannot be used for:**
- `localhost`
- `127.0.0.1`
- `192.168.x.x` (private networks)
- `10.x.x.x` (private networks)
- Internal hostnames without public DNS

**Why?** Let's Encrypt must validate domain ownership through public internet access.

## 🔄 Auto-Generation

The server automatically generates self-signed certificates in development mode if none exist:

```typescript
// In development, certificates are auto-generated
if (env.NODE_ENV === "development" && !certificatesExist) {
  console.log("🔧 Auto-generating self-signed certificate...");
  await generateSelfSignedCertificate();
}
```

## 📁 Certificate Storage

All certificates are stored in the `certs/` directory:
```
certs/
├── cert.pem    # Public certificate
└── key.pem     # Private key (restricted permissions)
```

## 🔒 Security Best Practices

1. **Development**: Use mkcert for trusted local certificates
2. **Staging**: Use Let's Encrypt staging environment first
3. **Production**: Use Let's Encrypt production certificates
4. **Private Keys**: Never commit to version control
5. **Permissions**: Private keys have restricted file permissions (600)

## 🛠️ Troubleshooting

### Certificate Not Trusted
```bash
# For development - use mkcert
npm run cert:mkcert

# Or add browser exception for self-signed
```

### Let's Encrypt Domain Validation Failed
```bash
# Ensure domain resolves correctly
nslookup yourdomain.com

# Test HTTP accessibility
curl http://yourdomain.com/.well-known/acme-challenge/test
```

### mkcert Not Found
```bash
# Windows
choco install mkcert

# macOS
brew install mkcert

# Then try again
npm run cert:mkcert
```

## 🔄 Certificate Renewal

### Let's Encrypt (90-day expiration)
```bash
# Check expiration
npm run cert:check

# Renew certificate
npm run cert:letsencrypt -- --domain yourdomain.com --email admin@yourdomain.com
```

### Self-Signed/mkcert (1-year expiration)
```bash
# Regenerate when needed
npm run cert:generate
# or
npm run cert:mkcert
```

## 📖 Environment Configuration

After generating certificates, update your `.env` file:

```env
# Enable TLS
TLS_ENABLE=true

# Certificate paths (auto-configured by setup wizard)
TLS_CERT_PATH=certs/cert.pem
TLS_KEY_PATH=certs/key.pem
```

The certificate setup wizard automatically updates your `.env` file! 🎉
