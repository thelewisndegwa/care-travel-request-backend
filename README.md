# CARE Travel Request Backend

Express and MongoDB backend for the CARE Kenya travel authority request workflow.

## Features
- JWT authentication with role-based access control for `user`, `admin`, and `superadmin`.
- Account activation flow: imported users must set a password before logging in.
- Manager-driven approval routing where the approver is derived from the requester's manager.
- Travel request lifecycle support for create, approve, reject, and rejected-request resubmit.
- In-app notifications plus Gmail/Nodemailer email notifications.
- Audit logging for request lifecycle events.
- Spreadsheet import via CLI or superadmin upload endpoint.
- Request filtering and pagination for admins and superadmins.

## Tech Stack
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer + Gmail for email delivery
- Jest and Supertest for tests

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and update the values.
3. Start MongoDB locally or point `MONGODB_URI` at your database.
4. Run the server:
   ```bash
   npm run dev
   ```

## Environment Variables
- `PORT`: HTTP port for the API.
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret used to sign JWTs.
- `JWT_EXPIRES_IN`: Token lifetime, for example `1d`.
- `GMAIL_USER`: Gmail address used to send mail.
- `GMAIL_APP_PASSWORD`: Gmail app password (not your normal Gmail password).
- `EMAIL_FROM`: Sender address shown to recipients.
- `FRONTEND_URL`: Base URL used in account activation links.

## Available Scripts
- `npm run dev`: Start the API with `nodemon`.
- `npm start`: Start the API with Node.
- `npm test`: Run the Jest test suite.

## API Overview
- `POST /api/auth/login`
- `POST /api/auth/activate`
- `POST /api/auth/set-password`
- `POST /api/admin/import-employees` (superadmin, multipart file upload)
- `GET /api/users/me`
- `GET /api/users`
- `GET /api/users/my-team`
- `POST /api/requests`
- `GET /api/requests`
- `GET /api/requests/:id`
- `PATCH /api/requests/:id/approve`
- `PATCH /api/requests/:id/reject`
- `PATCH /api/requests/:id`
- `GET /api/requests/pending-my-approval`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## Account Activation Flow
1. Import employees from Excel.
2. Each new user gets an activation email with a token and link.
3. User calls `POST /api/auth/activate` with `email`, `token`, and `newPassword`.
4. Only after activation can the user log in.

## Employee Import
CLI import:

```bash
node scripts/importEmployees.js path/to/employees.xlsx
```

Superadmin upload:

```bash
POST /api/admin/import-employees
Authorization: Bearer <superadmin-token>
Content-Type: multipart/form-data
file: employees.xlsx
```

Re-import is safe for activated users:
- HR fields like name, department, and manager links are updated.
- Activated passwords, `superadmin` role, and completed activations are preserved.

## Request Filtering
Admins and superadmins can filter list results:

```
GET /api/requests?status=pending&search=Kisumu&page=1&limit=20
GET /api/requests?destination=Nairobi&dateFrom=2026-07-01&dateTo=2026-07-31
GET /api/requests?requestedByEmail=alice@care.org
```

List responses are paginated:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Dev Password Shortcut
For local testing without email:

```bash
node scripts/setPassword.js someone@care.org YourPassword123!
```

## Testing
Run:

```bash
npm test
```
