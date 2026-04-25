# SMT School ERP — Design & Architecture

> Living document. Update this as the system evolves.

---

## 1. Project Vision

A comprehensive school management ERP for SMT School. Covers student information, attendance, finance, timetables, exams, HR, transport, inventory, communication, and facility audits — accessible to admins, teachers, and parents through role-based portals.

---

## 2. Current Status

| Layer | Status | Notes |
|---|---|---|
| Auth (JWT + MongoDB) | ✅ Production-ready | Login, register, role enforcement |
| Frontend UI | ✅ Feature-complete (mock data) | All 15+ modules have working UI |
| Backend APIs (school data) | ❌ Not built | All data is client-side mock |
| File uploads | ❌ Not built | Attachments are hardcoded |
| Communication module | ❌ Placeholder | UI shell only |
| Real-time updates | ❌ Not started | No WebSocket yet |
| Tests | ❌ None | Zero test files |

---

## 3. Tech Stack

### Frontend
- **Framework:** React 17 with React Router v6
- **State:** React hooks (`useState`, `useMemo`, `useEffect`) + `localStorage` for auth
- **Styling:** Inline CSS (no external CSS framework)
- **PDF generation:** jsPDF 2.3.1
- **Build tool:** Create React App (react-scripts 4)

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express 4.17
- **ODM:** Mongoose 5.10 → MongoDB Atlas
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs for password hashing
- **Security:** Helmet 8, CORS 2.8, express-rate-limit 8, AES-256-GCM for email encryption

### Infrastructure
- **Hosting:** Railway
- **Containerization:** Nixpacks
- **DB:** MongoDB Atlas (cloud) with localhost fallback in dev

---

## 4. System Architecture

```
Browser
  │
  ▼
React SPA (client/src/)
  │  localStorage: smt-school-token, smt-school-role
  │
  ▼ HTTP/REST
Express Server (server/app.js)  ←── serves client/build/ in production
  │
  ├── /api/auth/*       JWT auth endpoints
  ├── /api/attachments/* File preview/download
  └── /api/health       Status check
  │
  ▼
MongoDB Atlas
  └── users collection  (only persistent data today)
```

### Deployment Model
Single process: Express serves the compiled React build as static files and also exposes the REST API. No separate frontend server. This simplifies Railway deployment to one dyno/service.

---

## 5. Directory Structure

```
school-erp/
├── server/
│   ├── app.js                  # Express entry point, middleware, static serving
│   ├── models/
│   │   └── User.js             # Mongoose schema: username, emailEncrypted, password, role
│   ├── routes/
│   │   ├── auth.js             # POST /login, POST /register, GET /me
│   │   └── attachments.js      # GET /attachments, /:id/preview, /:id/download
│   ├── middleware/
│   │   ├── auth.js             # JWT verification → req.user
│   │   └── authorize.js        # Role-based access (authorize('admin', 'teacher'))
│   └── utils/
│       ├── crypto.js           # AES-256-GCM encrypt/decrypt for email
│       └── seedUsers.js        # Seeds default admin/parent/teacher on DB connect
│
├── client/src/
│   ├── App.js                  # Route definitions + ProtectedRoute component
│   ├── components/
│   │   ├── Login.js
│   │   ├── Header.js
│   │   ├── Dashboard.js        # Module grid with search
│   │   ├── CommandCenter.js    # Executive analytics
│   │   ├── SIS.js              # Student Information System
│   │   ├── Finance.js          # Fee management
│   │   ├── Attendance.js       # Daily attendance tracking
│   │   ├── Timetable.js        # Class scheduling
│   │   ├── PeriodDetails.js    # Individual period view
│   │   ├── HR.js               # Staff management
│   │   ├── Exams.js            # Exam scheduling
│   │   ├── Transport.js
│   │   ├── Inventory.js
│   │   ├── Communication.js    # Placeholder
│   │   ├── Washrooms.js        # Facility audits
│   │   ├── Parents.js          # Parent portal
│   │   ├── Teachers.js         # Teacher portal
│   │   ├── Admissions.js
│   │   ├── DivisionStudents.js
│   │   ├── StudentProfile.js
│   │   ├── GradeDivisions.js
│   │   └── SearchBar.js
│   └── data/
│       └── (mock data generators — student names, schedules, fees, etc.)
│
├── package.json                # Root: start, dev, build scripts
├── Procfile                    # Railway: web: node server/app.js
├── nixpacks.toml               # Node 20 build config
└── .env.example                # Required env vars
```

---

## 6. Authentication & Authorization

### Flow
1. User submits username + password to `POST /api/auth/login`
2. Server verifies password hash (bcrypt), issues JWT (8h default expiry)
3. Client stores token in `localStorage` (`smt-school-token`) and role (`smt-school-role`)
4. Subsequent requests send `Authorization: Bearer <token>`
5. `auth` middleware verifies and decodes JWT → populates `req.user`
6. `authorize(...roles)` middleware restricts endpoints to specific roles

### Roles
| Role | Access |
|---|---|
| `admin` | All modules |
| `teacher` | `/teachers` portal only |
| `parent` | `/parents` portal only |

### Demo Mode
If MongoDB is unavailable, login falls back to hardcoded demo credentials:
- `admin` / `admin`, `parent` / `parent`, `teacher` / `teacher`

### Default Seeded Users
On first DB connect, `seedUsers.js` creates the three demo accounts above if they don't exist.

---

## 7. Data Models

### Implemented (MongoDB)

**User**
```js
{
  username:       String (unique, required),
  emailEncrypted: String (AES-256-GCM encrypted),
  password:       String (bcrypt hashed),
  role:           'admin' | 'parent' | 'teacher',
  createdAt:      Date
}
```

---

### To Be Built (School Data)

These models don't exist yet — all data is currently generated client-side.

**Student**
```
id, admissionNumber, firstName, lastName, grade, division,
rollNumber, dob, gender, parentId, address, photo,
academicYear, status (active/inactive/transferred)
```

**Teacher / Staff**
```
id, employeeId, name, subjects[], grades[], role,
contactInfo, joinDate, qualification, schedule
```

**Attendance**
```
studentId, date, status (present/absent/late/leave),
reason, markedBy (teacherId), grade, division
```

**Fee / Finance**
```
studentId, academicYear, feeStructureId,
installments: [{ dueDate, amount, paidDate, paidAmount, method, receipt }],
rteQuota: Boolean, concessions[]
```

**Timetable**
```
grade, division, academicYear,
periods: [{ day, periodNumber, subject, teacherId, room }]
```

**Exam**
```
name, academicYear, grade, schedule: [{ subject, date, startTime, duration }],
results: [{ studentId, subject, marks, grade }]
```

**Transport**
```
routeId, routeName, stops[], vehicleNumber, driverName,
studentsAssigned: [studentId]
```

---

## 8. API Reference

### Current Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login, returns JWT |
| POST | `/api/auth/register` | Admin | Register new user |
| GET | `/api/auth/me` | JWT | Get own profile |
| GET | `/api/attachments` | JWT | List attachments |
| GET | `/api/attachments/:id/preview` | JWT | HTML preview |
| GET | `/api/attachments/:id/download` | JWT | File download |
| GET | `/api/health` | None | Health check + DB status |

### Planned Endpoints (School Data)

```
GET    /api/students                  List/search students
POST   /api/students                  Add student
GET    /api/students/:id              Student profile
PUT    /api/students/:id              Update student
DELETE /api/students/:id              Deactivate student

GET    /api/attendance?date=&grade=&division=
POST   /api/attendance                Submit daily attendance
PUT    /api/attendance/:id            Correct attendance

GET    /api/finance/students/:id      Fee ledger
POST   /api/finance/payments          Record payment

GET    /api/timetable?grade=&division=
PUT    /api/timetable/:id             Update timetable

GET    /api/teachers
POST   /api/teachers
GET    /api/teachers/:id

GET    /api/exams
GET    /api/exams/:id/results
POST   /api/exams/:id/results         Submit results

GET    /api/transport/routes
POST   /api/transport/routes
```

---

## 9. Frontend Routing

```
/login              → Login.js (public)
/                   → Dashboard.js (admin)
/command-center     → CommandCenter.js (admin)
/sis                → SIS.js (admin) — grade/division selection
/sis/:grade         → GradeDivisions.js (admin)
/sis/:grade/:div    → DivisionStudents.js (admin)
/sis/:grade/:div/:id → StudentProfile.js (admin)
/finance            → Finance.js (admin)
/attendance         → Attendance.js (admin, teacher)
/timetable          → Timetable.js (admin, teacher)
/timetable/period/:id → PeriodDetails.js (admin, teacher)
/hr                 → HR.js (admin)
/exams              → Exams.js (admin, teacher)
/transport          → Transport.js (admin)
/inventory          → Inventory.js (admin)
/communication      → Communication.js (admin)
/washrooms          → Washrooms.js (admin)
/admissions         → Admissions.js (admin)
/teachers           → Teachers.js (teacher role home)
/parents            → Parents.js (parent role home)
```

---

## 10. Mock Data Strategy

The frontend currently generates all school data procedurally in `client/src/data/`. Key design decisions:

- **12,000 students:** 10 grades × 3 divisions × 40 students
- **Names:** Mix of Maharashtrian and pan-Indian names for realism
- **Seeded randomization:** Student ID used as seed so data is deterministic (same student always has same data)
- **Academic year:** April–March cycle (Indian school calendar)
- **Saturday logic:** 2nd and 4th Saturdays are holidays

**Migration path to real data:** Each component that currently imports from `data/` should be refactored to call the corresponding REST API instead. The mock data serves as the exact spec for what the API must return.

---

## 11. Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...           # MongoDB Atlas connection string
JWT_SECRET=                             # Strong random string (required)
JWT_EXPIRES_IN=8h                       # Token lifetime
JWT_ISSUER=smt-school-erp
JWT_AUDIENCE=smt-school-clients
APP_DATA_ENCRYPTION_KEY=               # 32-byte hex for AES-256 email encryption
CLIENT_ORIGIN=https://your-app.railway.app  # CORS allowed origin
```

---

## 12. Development Setup

```bash
# Install all dependencies
npm install

# Run in dev mode (concurrently: Express on :5000, React on :3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

React dev server proxies `/api/*` to `http://localhost:5000` (configured in `client/package.json`).

---

## 13. Roadmap

### Phase 1 — Backend Foundation
- [ ] MongoDB models: Student, Teacher, Attendance, Fee, Timetable
- [ ] CRUD APIs for Student and Teacher
- [ ] Attendance API (submit + query)
- [ ] Migrate SIS component from mock data to API

### Phase 2 — Finance Backend
- [ ] Fee structure model and admin configuration
- [ ] Payment recording API
- [ ] Receipt generation (PDF via jsPDF already available)
- [ ] Migrate Finance component to API

### Phase 3 — Academic
- [ ] Timetable management API
- [ ] Exam scheduling and results API
- [ ] Migrate Timetable and Exams components to API

### Phase 4 — Operations
- [ ] Transport route management
- [ ] Inventory tracking
- [ ] File uploads (S3 or similar)
- [ ] Build Communication module (announcements, messaging)

### Phase 5 — Platform
- [ ] Real-time notifications (WebSocket or SSE)
- [ ] Parent portal with real student data
- [ ] Teacher portal with class/attendance management
- [ ] Mobile-responsive improvements
- [ ] Test suite (Jest + React Testing Library)
- [ ] Admin user management UI

---

## 14. Known Design Decisions & Constraints

| Decision | Rationale |
|---|---|
| Single Express process serves both API + React build | Simplifies Railway deployment to one service/dyno |
| Email encrypted with AES-256-GCM | Privacy requirement for PII at rest |
| JWT in localStorage (not httpOnly cookie) | Simpler SPA integration; acceptable for internal school tool; upgrade to cookies for higher security |
| No CSS framework (inline styles only) | Full control over design; avoids bundle bloat; tradeoff is no design system consistency |
| React 17 + CRA 4 | Stable, battle-tested; upgrade to React 18 + Vite when time allows |
| Mock data client-side | Allows UI development without backend blocking; clear migration path to real APIs |
| Mongoose 5 (not 6/7/8) | Older version in use; consider upgrading when building new models |
