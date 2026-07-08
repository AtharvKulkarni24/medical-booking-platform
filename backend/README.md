# Backend Documentation

This backend powers the MedBook medical booking platform. It exposes REST APIs for authentication, patient and lab management, test discovery, appointment booking, reviews, and search.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Redis
- JSON Web Tokens (JWT)
- bcrypt
- Razorpay
- dotenv

## Project Structure

- src/server.js — application entry point and route mounting
- src/config/db.js — PostgreSQL connection pool
- src/controllers/ — request handlers for each domain
- src/routes/ — Express route definitions
- src/middlewares/ — authentication and authorization middleware
- src/services/ — Redis and supporting services
- src/init_db.js — database initialization script
- database/schema.sql — database schema definition

## Installation

1. Change into the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file with the required environment variables.

## Environment Variables

The backend expects the following values:

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

## Running the Backend

### Development mode

```bash
npm run dev
```

### Initialize database

```bash
npm run db:init
```

The server starts on port 5000 by default unless PORT is overridden.

## API Overview

All API routes are mounted under `/api`.

### Authentication

- `POST /api/patients/register` — register a patient
- `POST /api/patients/login` — patient login
- `POST /api/labs/register` — register a diagnostic lab
- `POST /api/labs/login` — lab login
- `POST /api/refresh` — refresh access token
- `POST /api/logout` — logout and revoke token

### Patients

Protected routes for authenticated patients:

- `GET /api/patients/profile`
- `PATCH /api/patients/profile`
- `PATCH /api/patients/profile/password`
- `GET /api/patients/appointments/completed`
- `GET /api/patients/reviews/past`

### Labs

Protected routes for authenticated labs:

- `GET /api/labs/dashboard-stats`
- `GET /api/labs/profile`
- `PUT /api/labs/profile`
- `PATCH /api/labs/profile/password`
- `POST /api/labs/slots`
- `GET /api/labs/slots`
- `GET /api/labs/slots/:id`
- `PUT /api/labs/slots/:id`
- `DELETE /api/labs/slots/:id`
- `GET /api/labs/:lab_id/appointments`
- `PATCH /api/labs/appointments/:id/complete`

### Tests

- `GET /api/labs/tests` — list tests for a lab
- `POST /api/labs/tests` — create a test
- `GET /api/labs/tests/:id` — fetch test by ID
- `PUT /api/labs/tests/:id` — update a test
- `DELETE /api/labs/tests/:id` — delete a test

### Appointments

- `POST /api/appointments/create-order` — create Razorpay order
- `POST /api/appointments/verify-booking` — verify payment and book appointment
- `GET /api/appointments/patient` — list patient appointments
- `GET /api/appointments/lab/:lab_id` — list appointments for a lab
- `PATCH /api/appointments/:id/status` — update appointment status

### Reviews

- `POST /api/reviews` — create review
- `GET /api/reviews/lab/:lab_id` — get lab reviews

### Search

- `GET /api/search/labs` — search available labs
- `GET /api/search/tests` — search tests
- `GET /api/search/nearby` — find nearby labs based on coordinates

## Authentication and Authorization

The backend uses JWT-based authentication.

- Access tokens are issued on login.
- Refresh tokens are stored in an HTTP-only cookie.
- The auth middleware validates access tokens before protected routes are accessed.
- Role middleware ensures users only access routes appropriate for their account type.

## Database

The application uses PostgreSQL with a schema defined in database/schema.sql.

### Main entities

- patients
- labs
- tests
- time_slots
- appointments
- reviews
- payments

## Redis Usage

Redis is used for token-related operations such as:

- blacklisting revoked access tokens
- storing refresh tokens
- managing temporary in-memory fallback behavior when Redis is unavailable

## Payment Flow

Appointment booking uses Razorpay.

1. The client requests a payment order from `/api/appointments/create-order`.
2. The frontend completes payment through Razorpay.
3. The server verifies the signature and stores the appointment.

## Error Handling

The API returns standardized JSON responses with `success` and `error` or `message` fields.

Common status codes:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 500 Internal Server Error

## Notes for Developers

- Keep controllers focused on request handling and delegate business logic where appropriate.
- Ensure environment variables are present before starting the server.
- Verify Redis and PostgreSQL connectivity before running the app.
- Prefer consistent JSON response shapes for frontend compatibility.

## Verification Commands

Run these checks during development:

```bash
node src/server.js
```

If the backend starts successfully, you should see Redis connection and server startup logs.
