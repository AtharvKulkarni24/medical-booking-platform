# Auth System Improvements - Implementation Summary

## Changes Made

### 1. **Refresh Token Implementation**

#### Files Modified: `authController.js`

**What Changed:**

- Replaced single `generateToken()` with two functions:
  - `generateAccessToken()` - Short-lived (15 minutes, configurable)
  - `generateRefreshToken()` - Long-lived (7 days, configurable)

- Updated all login & registration endpoints to return **both** tokens:

  ```json
  {
    "accessToken": "short-lived JWT",
    "refreshToken": "long-lived JWT",
    "patient/lab": { ... }
  }
  ```

- Added new endpoint: `POST /api/auth/refresh`
  - Accepts `refreshToken` in request body
  - Returns new `accessToken` without requiring re-login
  - Validates refresh token against Redis store (prevents revoked tokens)

#### Files Modified: `redisClient.js`

**New Functions:**

- `storeRefreshToken(userId, token)` - Store token with 7-day TTL
- `getRefreshToken(userId)` - Retrieve stored token
- `revokeRefreshToken(userId)` - Revoke all tokens for user (on logout)

---

### 2. **Robust Logout Token Validation**

#### Files Modified: `authController.js`

**Enhanced `logoutPatient()` and `logoutLab()`:**

- Now verifies token is valid before blacklisting (prevents accepting garbage tokens)
- Returns 400 status if token is invalid/expired
- Blacklists the access token with remaining TTL
- Revokes ALL refresh tokens for the user (complete logout)
- Updated response message to reflect complete invalidation

**Example Flow:**

```javascript
// Before: Only checked if token existed
// After:
1. Verify token is valid JWT
2. Calculate expiry time
3. Blacklist access token
4. Revoke all refresh tokens
5. Return success
```

---

### 3. **Role-Based Authorization Middleware**

#### Files Created: `middlewares/roleMiddleware.js`

**New Middleware: `authorizeRole(...roles)`**

Usage:

```javascript
// Restrict route to only labs
router.use(authorizeRole("lab"));

// Allow multiple roles
router.use(authorizeRole("patient", "admin"));
```

Features:

- Checks `req.user.role` set by auth middleware
- Returns 403 Forbidden if role not allowed
- Returns 401 if no authenticated user
- Descriptive error message listing allowed roles

#### Files Modified: `routes/patientRoutes.js`

Applied role-based protection:

```javascript
router.use(authenticateToken);        // Ensure logged in
router.use(authorizeRole('patient')); // Ensure is patient

// All routes below now require patient role
router.get('/profile', ...);
router.patch('/profile', ...);
```

---

## Environment Variables to Add

Add these to your `.env` file:

```env
# Access token expiry (short-lived)
ACCESS_TOKEN_EXPIRES_IN=15m

# Refresh token expiry (long-lived)
REFRESH_TOKEN_EXPIRES_IN=7d

# Optional: separate secret for refresh tokens (recommended for production)
REFRESH_TOKEN_SECRET=your-different-secret-key
```

If `REFRESH_TOKEN_SECRET` is not set, it will fall back to `JWT_SECRET`.

---

## API Changes

### Before (Single Token)

```bash
POST /api/auth/patients/login
Response: { token: "...", patient: {...} }
```

### After (Dual Token)

```bash
POST /api/auth/patients/login
Response: { accessToken: "...", refreshToken: "...", patient: {...} }

# To refresh access token without re-logging in
POST /api/auth/refresh
Body: { "refreshToken": "..." }
Response: { accessToken: "..." }
```

---

## Security Benefits

1. **Access Token Expiry**: Short-lived tokens limit exposure if stolen
2. **Refresh Token Validation**: Stored in Redis/DB, can be revoked
3. **Complete Logout**: All tokens invalidated, not just current one
4. **Role Enforcement**: Prevents patients from accessing lab APIs
5. **Token Verification**: Rejects malformed/tampered tokens on logout

---

## Next Steps (Optional)

1. Add similar role-based protection to search routes (optional for public)
2. Implement lab-specific routes that require `authorizeRole('lab')`
3. Add role-based protection to appointment/payment endpoints
4. Consider adding admin role for dashboard/verification endpoints
5. Test token refresh flow with frontend
