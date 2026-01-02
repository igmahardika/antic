# ANTIC HMS - API Endpoint Documentation

**Base URL:** `http://localhost:3001` (Development)  
**Production URL:** `https://api.hms.nexa.net.id`

**Last Updated:** 2 Januari 2026

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users Management](#users-management)
3. [Menu Permissions](#menu-permissions)
4. [Tickets Management](#tickets-management)
5. [Customers Management](#customers-management)
6. [Agent Photos](#agent-photos)
7. [Migration Tools](#migration-tools)
8. [PDF Reports](#pdf-reports)
9. [Health Check](#health-check)

---

## 🔐 Authentication

All API endpoints (except `/login`, `/health`) require JWT authentication.

**Header Required:**
```
Authorization: Bearer <JWT_TOKEN>
```

### POST /login

**Description:** Authenticate user and receive JWT token

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super admin"
  },
  "sessionId": "sess_1767337993132_ame7cidajt4"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

### POST /logout

**Description:** Logout user and invalidate session

**Authentication:** Required (JWT + Session)

**Request:** No body required

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/logout \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 👥 Users Management

### GET /api/users

**Description:** Get all users (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Query Parameters:**
- `search` (optional): Search by username
- `role` (optional): Filter by role
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "super admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_login": "2024-01-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3001/api/users?page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### POST /api/users

**Description:** Create new user (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": 7
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","role":"user"}'
```

---

### PUT /api/users/:id

**Description:** Update user (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "username": "updatedname",
  "role": "admin",
  "is_active": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/users/7 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"username":"updateduser","role":"admin"}'
```

---

### DELETE /api/users/:id

**Description:** Delete user (Super Admin only)

**Authentication:** Required (Super Admin)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/users/7 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🔑 Menu Permissions

### GET /api/menu-permissions

**Description:** Get menu permissions for roles

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "permissions": [
    {
      "id": 1,
      "role": "super admin",
      "menus": ["dashboard", "users", "tickets", "analytics", "settings"]
    }
  ]
}
```

---

### POST /api/menu-permissions

**Description:** Create/Update menu permissions (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "role": "user",
  "menus": ["dashboard", "tickets", "analytics"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Menu permissions updated successfully"
}
```

---

## 🎫 Tickets Management

### GET /api/tickets

**Description:** Get all tickets with filtering

**Authentication:** Required

**Query Parameters:**
- `search` (optional): Search by name/description
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `page` (optional): Page number
- `limit` (optional): Items per page
- `sortBy` (optional): Sort field
- `sortOrder` (optional): asc/desc

**Response (200):**
```json
{
  "success": true,
  "tickets": [
    {
      "id": "uuid-string",
      "customerId": "CUST001",
      "name": "Customer Name",
      "category": "Technical",
      "status": "Open",
      "duration": {
        "rawHours": 2.5,
        "formatted": "2h 30m"
      },
      "openTime": "2024-01-01T10:00:00.000Z",
      "closeTime": "2024-01-01T12:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3001/api/tickets?page=1&limit=50" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### POST /api/tickets

**Description:** Create single ticket

**Authentication:** Required

**Request Body:**
```json
{
  "customerId": "CUST001",
  "name": "Customer Name",
  "category": "Technical Support",
  "description": "Issue description",
  "openTime": "2024-01-01T10:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "uuid-string"
}
```

---

### POST /api/tickets/bulk

**Description:** Bulk create tickets (for Excel upload)

**Authentication:** Required

**Request Body:**
```json
{
  "tickets": [
    {
      "customerId": "CUST001",
      "name": "Customer 1",
      "category": "Technical",
      "openTime": "2024-01-01T10:00:00.000Z"
    },
    {
      "customerId": "CUST002",
      "name": "Customer 2",
      "category": "Complaint",
      "openTime": "2024-01-01T11:00:00.000Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bulk tickets created successfully",
  "created": 2
}
```

---

## 👤 Customers Management

### GET /api/customers

**Description:** Get all customers

**Authentication:** Required

**Query Parameters:**
- `search` (optional): Search by name
- `jenisKlien` (optional): Filter by client type
- `layanan` (optional): Filter by service
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "success": true,
  "customers": [
    {
      "id": "uuid",
      "nama": "PT Example Corp",
      "jenisKlien": "Corporate",
      "layanan": "Dedicated Internet",
      "kategori": "Enterprise"
    }
  ]
}
```

---

### POST /api/customers

**Description:** Create customer

**Authentication:** Required

**Request Body:**
```json
{
  "nama": "PT New Company",
  "jenisKlien": "Corporate",
  "layanan": "Broadband",
  "kategori": "SME"
}
```

---

### POST /api/customers/bulk

**Description:** Bulk create customers

**Authentication:** Required

**Request Body:**
```json
{
  "customers": [
    {
      "nama": "Customer 1",
      "jenisKlien": "Retail",
      "layanan": "Home Internet"
    }
  ]
}
```

---

## 📸 Agent Photos

### POST /api/upload-agent-photo

**Description:** Upload agent photo

**Authentication:** Not required (file upload)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `photo` (file): Image file (PNG, JPG, JPEG)
- `agentName` (string): Agent name

**Response (200):**
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "filePath": "/agent-photos/AgentName.png"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/upload-agent-photo \
  -F "photo=@agent.png" \
  -F "agentName=John Doe"
```

---

### GET /api/photo-info

**Description:** Get agent photo information

**Authentication:** Not required

**Query Parameters:**
- `agentName` (required): Agent name

**Response (200):**
```json
{
  "exists": true,
  "filePath": "/agent-photos/JohnDoe.png",
  "fileName": "JohnDoe.png",
  "fileSize": 45123,
  "uploadDate": "2024-01-01T10:00:00.000Z"
}
```

**Example:**
```bash
curl -X GET "http://localhost:3001/api/photo-info?agentName=John%20Doe"
```

---

### DELETE /api/delete-agent-photo

**Description:** Delete agent photo

**Authentication:** Not required

**Query Parameters:**
- `agentName` (required): Agent name

**Response (200):**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

---

## 🔄 Migration Tools

### POST /api/migration/customers/bulk

**Description:** Migrate customers in bulk (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "customers": [...]
}
```

---

### POST /api/migration/tickets/bulk

**Description:** Migrate tickets in bulk (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "tickets": [...]
}
```

---

### GET /api/migration/status

**Description:** Get migration status (Admin+ only)

**Authentication:** Required (Admin/Super Admin)

**Response (200):**
```json
{
  "success": true,
  "migrations": [
    {
      "id": 1,
      "type": "tickets",
      "status": "completed",
      "recordCount": 1000,
      "startedAt": "2024-01-01T10:00:00.000Z",
      "completedAt": "2024-01-01T10:05:00.000Z"
    }
  ]
}
```

---

## 📄 PDF Reports

### POST /api/generate-pdf

**Description:** Generate PDF report

**Authentication:** Not required

**Request Body:**
```json
{
  "reportType": "monthly",
  "data": {...}
}
```

**Response (200):**
```
Content-Type: application/pdf
Binary PDF data
```

---

## ❤️ Health Check

### GET /health

**Description:** Check server health

**Authentication:** Not required

**Response (200):**
```json
{
  "status": "ok",
  "time": "2026-01-02T07:12:57.360Z"
}
```

**Example:**
```bash
curl http://localhost:3001/health
```

---

## 🔒 Authentication & Authorization

### Role Hierarchy

1. **Super Admin** - Full access to all endpoints
2. **Admin** - Access to most endpoints except user deletion
3. **User** - Read-only access, limited to viewing data

### Token Expiry

- JWT tokens expire after **24 hours**
- Sessions are stored in Redis with **24 hour** TTL
- Automatic cleanup of expired sessions

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while processing your request"
}
```

---

## 📊 API Summary

| Category | Endpoints | Methods |
|----------|-----------|---------|
| Authentication | 2 | POST |
| Users | 4 | GET, POST, PUT, DELETE |
| Permissions | 2 | GET, POST |
| Tickets | 3 | GET, POST |
| Customers | 3 | GET, POST |
| Agent Photos | 3 | GET, POST, DELETE |
| Migration | 3 | GET, POST |
| PDF | 1 | POST |
| Health | 1 | GET |
| **Total** | **22** | **Various** |

---

## ⚡ Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per window per IP
- **Response when exceeded:**
  ```json
  {
    "error": "Too Many Requests",
    "message": "Rate limit exceeded. Try again later."
  }
  ```

---

## 🔗 Useful Resources

- [Backend README](../helpdesk-backend/README.md)
- [Main Project README](../README.md)
- [Testing Report](../../testing_report.md)

---

**Note:** All endpoints with `/api/` prefix require JWT authentication unless explicitly stated otherwise.

**Last Verified:** 2 Januari 2026, 14:30 WIB
