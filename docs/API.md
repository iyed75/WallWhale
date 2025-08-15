# 📚 API Reference

## Authentication

The API supports two authentication methods:

### 1. JWT Bearer Tokens (User Sessions)
```bash
Authorization: Bearer <jwt-token>
```

### 2. API Keys (Programmatic Access)
```bash
X-API-Key: <api-key>
```

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## API Endpoints

### Authentication Endpoints

#### Login User
```http
POST /v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

#### Refresh Token
```http
POST /v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

### Download Management

#### List Downloads
```http
GET /v1/downloads
```

**Query Parameters:**
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (`queued`, `running`, `success`, `failed`, `canceled`)
- `pubfileId` (optional): Filter by Workshop ID

**Response:**
```json
{
  "downloads": [
    {
      "id": "download_abc123",
      "pubfileId": "123456789",
      "status": "success",
      "accountName": "steam_account",
      "saveRoot": "/downloads/path",
      "zipPath": "/downloads/workshop_123456789.zip",
      "progress": 100,
      "createdAt": "2024-08-13T10:00:00Z",
      "completedAt": "2024-08-13T10:05:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Create Download Job
```http
POST /v1/downloads
```

**Request Body:**
```json
{
  "urlOrId": "https://steamcommunity.com/sharedfiles/filedetails/?id=123456789",
  "accountName": "steam_account",
  "saveRoot": "/custom/path" // optional
}
```

**Response:**
```json
{
  "id": "download_abc123",
  "pubfileId": "123456789",
  "status": "queued",
  "accountName": "steam_account",
  "saveRoot": "/custom/path",
  "progress": 0,
  "createdAt": "2024-08-13T10:00:00Z"
}
```

#### Get Download Status
```http
GET /v1/downloads/:id
```

**Response:**
```json
{
  "id": "download_abc123",
  "pubfileId": "123456789",
  "status": "running",
  "accountName": "steam_account",
  "progress": 45.5,
  "startedAt": "2024-08-13T10:01:00Z",
  "estimatedCompletion": "2024-08-13T10:06:00Z"
}
```

#### Stream Job Logs (Server-Sent Events)
```http
GET /v1/downloads/:id/logs
```

**Headers:**
```
Accept: text/event-stream
Cache-Control: no-cache
```

**SSE Response:**
```
data: {"type":"progress","message":"Downloading...","progress":25.5}

data: {"type":"info","message":"Processing files...","progress":75.0}

data: {"type":"success","message":"Download completed","progress":100}

event: end
data: {"status":"success","zipPath":"/downloads/workshop_123456789.zip"}
```

#### Cancel Download
```http
POST /v1/downloads/:id/cancel
```

**Response:**
```json
{
  "id": "download_abc123",
  "status": "canceled",
  "canceledAt": "2024-08-13T10:03:00Z"
}
```

#### Download ZIP File
```http
GET /v1/downloads/:id/zip
```

**Response:**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="workshop_123456789.zip"`
- Binary file content

### Administrative Endpoints

#### Get Server Statistics
```http
GET /v1/admin/stats
```

**Required Scope:** `admin:read` or `admin:*`

**Response:**
```json
{
  "server": {
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production"
  },
  "downloads": {
    "total": 1250,
    "active": 3,
    "queued": 5,
    "completed": 1200,
    "failed": 42
  },
  "users": {
    "total": 25,
    "active": 18
  },
  "apiKeys": {
    "total": 45,
    "active": 40
  },
  "storage": {
    "totalSize": "2.5 GB",
    "filesCount": 1200
  }
}
```

#### List API Keys
```http
GET /v1/admin/api-keys
```

**Required Scope:** `admin:read` or `admin:*`

**Response:**
```json
{
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "Production Bot",
      "scopes": ["download:read", "download:write"],
      "rateLimit": 60,
      "quotaDaily": 1000,
      "lastUsedAt": "2024-08-13T09:30:00Z",
      "requestCount": 245,
      "isActive": true,
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  ]
}
```

#### Create API Key
```http
POST /v1/admin/api-keys
```

**Required Scope:** `admin:write` or `admin:*`

**Request Body:**
```json
{
  "name": "New Bot Key",
  "scopes": ["download:read", "download:write"],
  "rateLimit": 100,
  "quotaDaily": 2000,
  "quotaMonthly": 50000,
  "maxConcurrent": 5,
  "maxRuntimeSeconds": 7200,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "key_def456",
  "name": "New Bot Key",
  "key": "ak_1234567890abcdef...",
  "scopes": ["download:read", "download:write"],
  "rateLimit": 100,
  "quotaDaily": 2000,
  "isActive": true,
  "createdAt": "2024-08-13T10:00:00Z"
}
```

#### Update API Key
```http
PUT /v1/admin/api-keys/:id
```

**Required Scope:** `admin:write` or `admin:*`

**Request Body:**
```json
{
  "name": "Updated Bot Key",
  "rateLimit": 120,
  "isActive": false
}
```

#### Revoke API Key
```http
DELETE /v1/admin/api-keys/:id
```

**Required Scope:** `admin:write` or `admin:*`

**Response:**
```json
{
  "id": "key_def456",
  "revoked": true,
  "revokedAt": "2024-08-13T10:00:00Z"
}
```

#### List Steam Accounts
```http
GET /v1/admin/steam-users
```

**Required Scope:** `admin:read` or `admin:*`

**Response:**
```json
{
  "steamUsers": [
    {
      "id": "steam_abc123",
      "username": "steam_account",
      "displayName": "Primary Account",
      "status": "ACTIVE",
      "lastUsedAt": "2024-08-13T09:30:00Z",
      "createdAt": "2024-08-01T12:00:00Z"
    }
  ]
}
```

#### Add Steam Account
```http
POST /v1/admin/steam-users
```

**Required Scope:** `admin:write` or `admin:*`

**Request Body:**
```json
{
  "username": "new_steam_account",
  "password": "steam_password",
  "displayName": "Secondary Account"
}
```

**Response:**
```json
{
  "id": "steam_def456",
  "username": "new_steam_account",
  "displayName": "Secondary Account",
  "status": "ACTIVE",
  "createdAt": "2024-08-13T10:00:00Z"
}
```

#### Update Steam Account
```http
PUT /v1/admin/steam-users/:id
```

**Required Scope:** `admin:write` or `admin:*`

**Request Body:**
```json
{
  "password": "new_password",
  "displayName": "Updated Account",
  "status": "INACTIVE"
}
```

#### Get Audit Logs
```http
GET /v1/admin/audit-logs
```

**Required Scope:** `admin:read` or `admin:*`

**Query Parameters:**
- `limit` (optional): Number of results (1-100, default: 50)
- `offset` (optional): Pagination offset
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Response:**
```json
{
  "auditLogs": [
    {
      "id": "audit_abc123",
      "userId": "user_123",
      "action": "download:create",
      "resource": "download_abc123",
      "ipAddress": "192.168.1.100",
      "userAgent": "curl/7.68.0",
      "details": {
        "pubfileId": "123456789",
        "accountName": "steam_account"
      },
      "timestamp": "2024-08-13T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 2500,
    "limit": 50,
    "offset": 0
  }
}
```

## API Key Scopes

### Download Scopes
- `download:read` - Read download jobs and files
- `download:write` - Create and manage download jobs
- `download:*` - All download permissions

### Admin Scopes
- `admin:read` - Read administrative data
- `admin:write` - Manage users and system configuration
- `admin:*` - Full administrative access

## Rate Limiting

### Headers
All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1691928000
```

### Limits
- **Default**: 100 requests per minute
- **Per API Key**: Configurable per key
- **Burst**: Short bursts allowed up to 2x limit

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "pubfileId",
      "issue": "Must be a valid Workshop ID"
    },
    "correlationId": "req_abc123def456"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Missing or invalid authentication |
| `INSUFFICIENT_PERMISSIONS` | API key lacks required scopes |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DOWNLOAD_FAILED` | Download job failed |
| `STEAM_ACCOUNT_UNAVAILABLE` | No available Steam accounts |
| `INTERNAL_ERROR` | Server error |

## Health & Monitoring

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-08-13T10:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Detailed Status
```http
GET /status
```

**Response:**
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "steam": "ready",
    "filesystem": "writable"
  },
  "metrics": {
    "memory": { "used": 256, "total": 512 },
    "activeJobs": 3,
    "queuedJobs": 1
  }
}
```

### Prometheus Metrics
```http
GET /metrics
```

**Response:**
```
# HELP depot_http_requests_total Total HTTP requests
# TYPE depot_http_requests_total counter
depot_http_requests_total{method="GET",route="/v1/downloads",status="200"} 1250

# HELP depot_download_jobs_active Active download jobs
# TYPE depot_download_jobs_active gauge
depot_download_jobs_active 3
```

## Interactive Documentation

Visit `/docs` on your running server for:
- **Swagger UI**: Interactive API testing
- **Request Examples**: Copy-paste ready examples
- **Response Schemas**: Complete response documentation
- **Authentication Testing**: Built-in API key testing

## Client Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
  }
});

// Create download
const download = await client.post('/v1/downloads', {
  urlOrId: '123456789',
  accountName: 'steam_account'
});

// Stream logs
const EventSource = require('eventsource');
const eventSource = new EventSource(`${baseURL}/v1/downloads/${download.data.id}/logs`, {
  headers: { 'X-API-Key': 'your-api-key' }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}%`);
};
```

### Python
```python
import requests
import sseclient

headers = {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
}

# Create download
response = requests.post('https://api.example.com/v1/downloads', 
    json={
        'urlOrId': '123456789',
        'accountName': 'steam_account'
    },
    headers=headers
)
download = response.json()

# Stream logs
messages = sseclient.SSEClient(
    f"https://api.example.com/v1/downloads/{download['id']}/logs",
    headers=headers
)

for msg in messages:
    if msg.data:
        data = json.loads(msg.data)
        print(f"Progress: {data['progress']}%")
```

### cURL
```bash
# Create download
curl -X POST "https://api.example.com/v1/downloads" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "urlOrId": "123456789",
    "accountName": "steam_account"
  }'

# Get status
curl "https://api.example.com/v1/downloads/download_abc123" \
  -H "X-API-Key: your-api-key"

# Stream logs
curl -N "https://api.example.com/v1/downloads/download_abc123/logs" \
  -H "X-API-Key: your-api-key" \
  -H "Accept: text/event-stream"
```
