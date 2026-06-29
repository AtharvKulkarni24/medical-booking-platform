# Authentication Routes - Manual Testing Guide

## Base URL

```
http://localhost:5000/api/auth
```

---

## 1. PATIENT REGISTRATION

### Endpoint

```
POST /patients/register
```

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone_number": "+91-9876543210"
}
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/patients/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "phone_number": "+91-9876543210"
  }'
```

### Expected Response (201 Created)

```json
{
  "success": true,
  "message": "Patient registers successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Cases

- **400 Bad Request** - Missing required fields
- **400 Bad Request** - Email already registered

---

## 2. PATIENT LOGIN

### Endpoint

```
POST /patients/login
```

### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/patients/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Cases

- **400 Bad Request** - Missing email or password
- **401 Unauthorized** - Invalid email or password

---

## 3. PATIENT LOGOUT

### Endpoint

```
POST /patients/logout
```

### Headers Required

```
Authorization: Bearer <accessToken>
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/patients/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "message": "Logout successful. All tokens have been invalidated."
}
```

### Error Cases

- **400 Bad Request** - Invalid or expired token
- **401 Unauthorized** - Missing token

---

## 4. LAB REGISTRATION

### Endpoint

```
POST /labs/register
```

### Request Body

```json
{
  "name": "Apollo Diagnostics",
  "email": "apollo@labs.com",
  "password": "LabPass123",
  "address_text": "123 Main Street, Mumbai",
  "latitude": 19.076,
  "longitude": 72.8777,
  "auth_document_url": "https://example.com/docs/apollo_auth.pdf"
}
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/labs/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apollo Diagnostics",
    "email": "apollo@labs.com",
    "password": "LabPass123",
    "address_text": "123 Main Street, Mumbai",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "auth_document_url": "https://example.com/docs/apollo_auth.pdf"
  }'
```

### Expected Response (201 Created)

```json
{
  "success": true,
  "message": "Lab registered successfully. Please wait for admin verification before attempting to login. You will receive a confirmation email once your auth_document_url has been verified.",
  "lab": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Diagnostics",
    "email": "apollo@labs.com",
    "is_verified": false
  }
}
```

### Important Notes
- **No access tokens are provided at registration**
- Lab must wait for manual verification by admin
- Admin must verify `auth_document_url` and set `is_verified = true` in the database
- Only after verification, lab can login and receive tokens

---

## 5. LAB LOGIN

### Endpoint

```
POST /labs/login
```

### Request Body

```json
{
  "email": "apollo@labs.com",
  "password": "LabPass123"
}
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/labs/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apollo@labs.com",
    "password": "LabPass123"
  }'
```

### Expected Response (200 OK) - Only if verified

```json
{
  "success": true,
  "message": "Lab Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "lab": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Diagnostics",
    "email": "apollo@labs.com"
  }
}
```

### Error Cases

- **401 Unauthorized** - Invalid email or password
- **403 Forbidden** - Lab not verified yet (pending manual verification)

---

## 6. LAB LOGOUT

### Endpoint

```
POST /labs/logout
```

### Headers Required

```
Authorization: Bearer <accessToken>
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/labs/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "message": "Logout successful. All tokens have been invalidated."
}
```

### Error Cases

- **400 Bad Request** - Invalid or expired token
- **401 Unauthorized** - Missing token

---

## 7. REFRESH ACCESS TOKEN

### Endpoint

```
POST /refresh
```

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### cURL Command

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Cases

- **400 Bad Request** - Refresh token not provided
- **401 Unauthorized** - Invalid or expired refresh token
- **401 Unauthorized** - Refresh token has been revoked (user logged out)

---

## 8. PATIENT PROFILE (With Role-Based Authorization)

### Endpoint

```
GET /api/patients/profile
```

### Headers Required

```
Authorization: Bearer <patient-accessToken>
```

### cURL Command

```bash
curl -X GET http://localhost:5000/api/patients/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Expected Response (200 OK)

```json
{
  "success": true,
  "patient": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+91-9876543210",
    "last_known_location": null
  }
}
```

### Error Cases

- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - User is not a patient (lab token used instead)

---

## Testing Workflow

### Complete Flow - Patient

```
1. Register patient → Get accessToken + refreshToken
2. Login patient → Get new accessToken + refreshToken
3. Access profile with accessToken → Success
4. Wait for accessToken to expire (15min) or simulate by using old token
5. Use refreshToken to get new accessToken → Success
6. Logout with accessToken → All tokens invalidated
7. Try to use old refreshToken → Fails (revoked)
```

### Complete Flow - Lab

```
1. Register lab → NO tokens returned, is_verified = false
2. Try to login lab → Fails (pending verification) - 403 Forbidden
3. ⚠️ ADMIN STEP: Manually verify auth_document in database
   UPDATE labs SET is_verified = TRUE WHERE lab_id = '...';
4. Lab tries to login again → SUCCESS, gets accessToken + refreshToken
5. Access lab routes with role-based middleware → Success
6. Logout lab → All tokens invalidated
7. Try to access routes with revoked token → Fails
```

---

## Using Postman/Insomnia

### Import as Collection

You can import these endpoints into Postman/Insomnia:

1. Create new Collection: "Medical Platform Auth"
2. Add folders: Patients, Labs, Tokens
3. Create requests for each endpoint above
4. Save responses as variables:
   - `accessToken` - Use in Authorization headers
   - `refreshToken` - Use for refresh endpoint

### Postman Variable Setup

After login, extract tokens:

```
Tests tab → Set variables:
pm.environment.set("accessToken", pm.response.json().accessToken);
pm.environment.set("refreshToken", pm.response.json().refreshToken);
```

Then use in headers:

```
Authorization: Bearer {{accessToken}}
```

---

## Environment Setup

Create `.env` file with:

```env
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=medical_platform
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your-super-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret-key
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Test Data Reference

### Patients

| Email            | Password       | Phone          |
| ---------------- | -------------- | -------------- |
| john@example.com | SecurePass123  | +91-9876543210 |
| jane@example.com | AnotherPass456 | +91-9876543211 |

### Labs

| Email              | Password   | Location                  |
| ------------------ | ---------- | ------------------------- |
| apollo@labs.com    | LabPass123 | Mumbai (19.0760, 72.8777) |
| thyrocare@labs.com | LabPass456 | Delhi (28.7041, 77.1025)  |

---

## Common Issues & Solutions

| Issue                         | Solution                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| Token expired error on logout | Use a fresh token immediately after login                   |
| Role-based access denied      | Ensure you're using the correct token type (patient vs lab) |
| Refresh token revoked         | You've already logged out; login again                      |
| Missing "Bearer" in header    | Use format: `Bearer <token>` not just `<token>`             |
| CORS error                    | Check if frontend origin is allowed in CORS settings        |
| Lab registration succeeds but login fails | Admin must verify the lab first. See [Admin Verification](#admin-verification) section |

---

## Admin Verification Process

### For Unverified Labs

After a lab registers, admins must manually verify the lab's authentication document before the lab can login.

### Step 1: Check Unverified Labs in Database

```sql
SELECT lab_id, name, email, auth_document_url, is_verified 
FROM labs 
WHERE is_verified = FALSE;
```

### Step 2: Review auth_document_url

- Visit the URL provided in `auth_document_url`
- Verify the document authenticity
- Check lab credentials and business registration

### Step 3: Approve Lab Registration

Once verified, run:

```sql
UPDATE labs 
SET is_verified = TRUE 
WHERE lab_id = '<lab-id-from-registration>';
```

### Step 4: Lab Can Now Login

Lab can now use `/api/auth/labs/login` with their credentials:

```bash
curl -X POST http://localhost:5000/api/auth/labs/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apollo@labs.com",
    "password": "LabPass123"
  }'
```

Response will now succeed with tokens:

```json
{
  "success": true,
  "message": "Lab Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "lab": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Diagnostics",
    "email": "apollo@labs.com"
  }
}
```

### Optional: Reject Lab Registration

If document verification fails, you can delete the lab:

```sql
DELETE FROM labs WHERE lab_id = '<lab-id>';
```

Or mark as rejected (if you add a status column):

```sql
UPDATE labs 
SET is_verified = FALSE, rejection_reason = 'Invalid documents' 
WHERE lab_id = '<lab-id>';
```
