# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### Server Startup Issues

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. **Find and kill process using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <process_id> /F

   # Linux/macOS
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use a different port:**
   ```bash
   PORT=3001 npm start
   ```

3. **Update environment configuration:**
   ```env
   PORT=3001
   HOST=localhost
   ```

#### TLS Certificate Issues
```
Error: ENOENT: no such file or directory, open 'certs/cert.pem'
```

**Solutions:**
1. **Generate certificates:**
   ```bash
   npm run cert:setup
   ```

2. **Disable TLS for development:**
   ```env
   TLS_ENABLE=false
   ```

3. **Check certificate paths:**
   ```bash
   npm run cert:check
   ```

#### Database Connection Issues
```
Error: P1001: Can't reach database server at localhost:5432
```

**Solutions:**
1. **Check database status:**
   ```bash
   npm run db:status
   ```

2. **Start database (Docker):**
   ```bash
   docker-compose up -d db
   ```

3. **Verify connection string:**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/depot"
   ```

4. **Test database connection:**
   ```bash
   npm run db:test-connection
   ```

### Download Issues

#### Steam Authentication Failures
```
Error: Steam login failed for account 'steam_user'
```

**Diagnostic Steps:**
1. **Verify account credentials:**
   ```bash
   npm run cli steam test --username steam_user
   ```

2. **Check account status:**
   ```bash
   npm run cli steam list
   ```

3. **Re-add Steam account:**
   ```bash
   npm run cli steam add --username steam_user --password new_password
   ```

4. **Check for Steam Guard requirements:**
   - Ensure 2FA is properly configured
   - Use app-specific passwords if needed

**Common Causes:**
- Incorrect username/password
- Steam Guard/2FA issues
- Account temporarily locked
- Rate limiting from Steam

#### DepotDownloader Execution Failures
```
Error: DepotDownloader process exited with code 1
```

**Diagnostic Commands:**
1. **Check DepotDownloader version:**
   ```bash
   ./DepotDownloaderMod/DepotDownloaderMod.exe --version
   ```

2. **Test manual execution:**
   ```bash
   ./DepotDownloaderMod/DepotDownloaderMod.exe -app 431960 -depot 431961 -username test_user -remember-password
   ```

3. **Check file permissions:**
   ```bash
   # Linux/macOS
   chmod +x DepotDownloaderMod/DepotDownloaderMod.exe
   ```

4. **Verify .NET runtime:**
   ```bash
   dotnet --version
   ```

#### Workshop ID Not Found
```
Error: Workshop item 123456789 not found or inaccessible
```

**Troubleshooting Steps:**
1. **Verify workshop ID:**
   - Check Steam Workshop URL
   - Ensure ID is numeric only
   - Test with a known working ID

2. **Check workshop item accessibility:**
   - Item may be private/removed
   - Account may not have access
   - Regional restrictions may apply

3. **Test with different account:**
   ```bash
   npm run cli download direct -i "123456789" -a "different_account"
   ```

### Performance Issues

#### Slow Download Speeds
**Diagnostic Steps:**
1. **Check concurrent downloads:**
   ```bash
   npm run health --detailed
   ```

2. **Monitor system resources:**
   ```bash
   # Windows
   perfmon

   # Linux
   htop
   iotop
   ```

3. **Optimize concurrency settings:**
   ```env
   GLOBAL_CONCURRENCY=5
   PER_KEY_CONCURRENCY=2
   ```

4. **Check disk space:**
   ```bash
   # Windows
   dir /s downloads

   # Linux/macOS
   du -sh downloads/
   df -h
   ```

#### High Memory Usage
**Solutions:**
1. **Restart server periodically:**
   ```bash
   npm run restart
   ```

2. **Optimize garbage collection:**
   ```env
   NODE_OPTIONS="--max-old-space-size=2048 --gc-interval=100"
   ```

3. **Enable cleanup automation:**
   ```env
   AUTO_CLEANUP_ENABLED=true
   AUTO_CLEANUP_OLDER_THAN_DAYS=7
   ```

4. **Monitor memory usage:**
   ```bash
   npm run health --monitor --interval 30
   ```

### SSL/TLS Issues

#### Certificate Validation Errors
```
Error: unable to verify the first certificate
```

**Solutions:**
1. **For development (self-signed certificates):**
   ```env
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

2. **For production (proper certificates):**
   ```bash
   npm run cert:letsencrypt --domain yourdomain.com
   ```

3. **Check certificate validity:**
   ```bash
   npm run cert:info
   openssl x509 -in certs/cert.pem -text -noout
   ```

#### mkcert Installation Issues
**Windows-specific solutions:**
1. **Run as Administrator:**
   ```cmd
   # Run PowerShell as Administrator
   npm run cert:mkcert
   ```

2. **Manual mkcert installation:**
   ```cmd
   choco install mkcert
   # or
   scoop install mkcert
   ```

3. **Certificate store issues:**
   ```cmd
   mkcert -install
   ```

### API Issues

#### Authentication Failures
```
Error: 401 Unauthorized
```

**Troubleshooting:**
1. **Verify API key:**
   ```bash
   npm run cli apikey list
   ```

2. **Test API key:**
   ```bash
   curl -H "Authorization: Bearer your_api_key" https://localhost:3000/v1/downloads
   ```

3. **Check key permissions:**
   ```bash
   npm run cli apikey info your_api_key
   ```

#### Rate Limiting Issues
```
Error: 429 Too Many Requests
```

**Solutions:**
1. **Check rate limits:**
   ```bash
   npm run cli apikey list --show-limits
   ```

2. **Increase rate limits:**
   ```bash
   npm run cli apikey update your_key --rate-limit 1000
   ```

3. **Implement backoff strategy:**
   ```javascript
   const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
   
   async function apiCallWithRetry(url, options, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(url, options);
         if (response.status === 429) {
           const retryAfter = response.headers.get('Retry-After') || 60;
           await delay(retryAfter * 1000);
           continue;
         }
         return response;
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await delay(1000 * Math.pow(2, i)); // Exponential backoff
       }
     }
   }
   ```

### Docker Issues

#### Container Startup Failures
```
Error: Container 'wallwhale-server' failed to start
```

**Diagnostic Steps:**
1. **Check container logs:**
   ```bash
   docker logs wallwhale-server
   ```

2. **Verify Docker Compose configuration:**
   ```bash
   docker-compose config
   ```

3. **Check port conflicts:**
   ```bash
   docker ps -a
   netstat -an | grep :3000
   ```

4. **Rebuild container:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

#### Volume Mount Issues
**Linux/macOS Permission Issues:**
```bash
# Fix ownership
sudo chown -R $(id -u):$(id -g) ./downloads
sudo chown -R $(id -u):$(id -g) ./prisma

# Fix permissions
chmod -R 755 ./downloads
chmod -R 755 ./prisma
```

**Windows Path Issues:**
```yaml
# docker-compose.yml - Use forward slashes
volumes:
  - ./downloads:/app/downloads
  - ./prisma:/app/prisma
```

### Environment Configuration Issues

#### Missing Environment Variables
```
Error: Environment variable DATABASE_URL is required
```

**Solution:**
1. **Copy example environment:**
   ```bash
   cp .env.example .env
   ```

2. **Validate configuration:**
   ```bash
   npm run config:validate
   ```

3. **Use configuration wizard:**
   ```bash
   npm run config:setup
   ```

#### Invalid Environment Values
```
Error: Invalid PORT value: 'abc'. Expected number.
```

**Common Validation Errors:**
- `PORT`: Must be a number (1-65535)
- `TLS_ENABLE`: Must be "true" or "false"
- `DATABASE_URL`: Must be valid connection string
- `GLOBAL_CONCURRENCY`: Must be positive integer

**Fix with configuration wizard:**
```bash
npm run config:setup --fix-validation
```

## Debugging Tools

### Enable Debug Logging
```env
# Enable all debug logs
DEBUG=*

# Enable specific module logs
DEBUG=app:*,download:*,steam:*

# Enable only error logs
LOG_LEVEL=error
```

### Diagnostic Commands
```bash
# Complete system diagnosis
npm run cli maintenance diagnostics

# Health check with detailed output
npm run health --detailed --verbose

# Configuration validation
npm run config:validate --verbose

# Database connection test
npm run db:test-connection --verbose

# Steam account verification
npm run cli steam test --all --verbose
```

### Log Analysis
```bash
# View recent logs
npm run logs --tail 100

# Filter logs by level
npm run logs --level error --since "1 hour ago"

# Export logs for analysis
npm run logs --export --format json --output debug-logs.json
```

### Performance Profiling
```bash
# Enable performance monitoring
npm run start --profile

# Memory usage analysis
npm run health --memory-report

# CPU profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt
```

## Getting Help

### Log Collection
When reporting issues, collect relevant logs:

```bash
# Create diagnostic package
npm run cli maintenance diagnostics --export diagnostic-package.zip
```

**Package includes:**
- Server configuration (sanitized)
- Recent logs (last 1000 lines)
- System information
- Database schema version
- Certificate status
- Performance metrics

### Issue Reporting Template
```markdown
**Environment:**
- OS: Windows 10/Ubuntu 20.04/macOS 12.0
- Node.js: v18.17.0
- Docker: 24.0.5 (if applicable)
- WallWhale Server: v1.0.0

**Issue Description:**
Brief description of the problem

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Error Messages:**
```
Copy exact error messages here
```

**Configuration:**
```env
# Relevant environment variables (sanitized)
PORT=3000
TLS_ENABLE=true
```

**Additional Context:**
Any other relevant information
```

### Community Resources
- **Documentation**: All docs in `/docs` directory
- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: General questions and help
- **Wiki**: Community-contributed guides

### Emergency Recovery
If the server is completely broken:

1. **Stop all processes:**
   ```bash
   docker-compose down
   # or
   pkill -f "node.*index"
   ```

2. **Backup current state:**
   ```bash
   cp .env .env.backup
   npm run db:backup --output emergency-backup.sql
   ```

3. **Reset to clean state:**
   ```bash
   npm run clean
   npm install
   npm run db:reset
   ```

4. **Restore from backup:**
   ```bash
   npm run db:restore --input emergency-backup.sql
   cp .env.backup .env
   ```

5. **Start with minimal configuration:**
   ```bash
   npm run start --safe-mode
   ```

This troubleshooting guide covers the most common issues. For complex problems, use the diagnostic tools to gather information before seeking help.
