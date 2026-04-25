# SMT School ERP — Professional Upgrade Plan

> Checklist format. Check items off as completed. Sections are ordered by priority.
> Last updated: 2026-04-25

---

## 1. Dev Environment & Project Hygiene

- [ ] Add `.nvmrc` pinning Node 20
- [ ] Add `.editorconfig` (indent, line endings, charset)
- [ ] Install **ESLint** in root for server (`eslint`, `eslint-plugin-node`)
- [ ] Install **ESLint** in client (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`)
- [ ] Add shared `.eslintrc.js` at root + `.eslintrc.js` override in `client/`
- [ ] Install **Prettier** at root, add `.prettierrc` and `.prettierignore`
- [ ] Install **Husky** + **lint-staged** for pre-commit hooks (lint + format on staged files)
- [ ] Add `.gitignore` entries: `.env`, `coverage/`, `playwright-report/`, `test-results/`
- [ ] Add `.vscode/extensions.json` recommending ESLint, Prettier, Playwright extensions
- [ ] Update `README.md` to reflect current project state, setup steps, env vars, demo credentials

---

## 2. Security Hardening

- [ ] **Run `npm audit`** — fix all critical and high severity issues
- [ ] **Upgrade Mongoose 5 → 8** (5.x has known vulnerabilities and is EOL)
- [ ] **Add input validation** with `joi` or `zod` on ALL server routes (not just auth)
  - Validate request body schema for login/register
  - Validate query params and path params on every endpoint
- [ ] **Add `express.json({ limit: '10kb' })`** — body size limit (DoS prevention)
- [ ] **Move JWT from `localStorage` to `httpOnly` cookie**
  - Add `cookie-parser` middleware
  - Update `auth.js` route to set/clear cookie
  - Update client to not use `localStorage` for token (cookie sent automatically)
  - Add CSRF token (double-submit cookie pattern)
- [ ] **Add account lockout** after 5 failed login attempts (track in Redis or MongoDB)
- [ ] **Add password strength requirements** on register route (min 8 chars, mixed case)
- [ ] **Never leak stack traces** in production — ensure all error responses use generic messages
- [ ] **Add `morgan`** HTTP request logging (combined format in prod, dev format in dev)
- [ ] **Add `winston` or `pino`** structured JSON logging replacing `console.log`
- [ ] **Review Helmet CSP** — tighten `script-src`, `style-src`, `img-src` directives
- [ ] **Add `express-mongo-sanitize`** — prevent NoSQL injection via query parameter pollution
- [ ] **Add API versioning prefix** `/api/v1/` to all routes
- [ ] **Add env var validation on startup** using `joi` — crash-fail if required vars missing
- [ ] **Add password reset flow** (forgot password → email token → reset page)
- [ ] **Add rate limiting per user** (not just per IP) for login attempts
- [ ] **Audit CORS config** — confirm `CLIENT_ORIGIN` is always set in production

---

## 3. Dependency Health

- [ ] Run `npm outdated` — document what needs upgrading
- [ ] Upgrade **React 17 → 18** (concurrent features, better performance)
- [ ] Upgrade **react-scripts 4 → 5** (or migrate to Vite — see Frontend section)
- [ ] Upgrade **jsonwebtoken 8 → 9** (security fixes)
- [ ] Upgrade **express 4.17 → 4.21+**
- [ ] Set up **Dependabot** (`.github/dependabot.yml`) for automated PRs on outdated deps

---

## 4. Test Infrastructure Setup

- [ ] Install **Jest** + **supertest** in root devDependencies (for server tests)
- [ ] Install **@testing-library/react** + **@testing-library/jest-dom** in client (CRA ships these but pin them)
- [ ] Install **Playwright** (`@playwright/test`) at root
- [ ] Run `npx playwright install` to download browsers
- [ ] Add `jest.config.js` at root for server tests (point to `server/tests/`, set `testEnvironment: node`)
- [ ] Add `playwright.config.js` at root (baseURL: `http://localhost:3000`, reporters, screenshots on failure)
- [ ] Add `server/tests/` directory + `setup.js` (connect test MongoDB, seed minimal data, close after)
- [ ] Add `.env.test` with test-specific env vars (separate test DB URI)
- [ ] Add `test:server`, `test:client`, `test:e2e`, `test:coverage` npm scripts (already done in package.json)
- [ ] Add test coverage thresholds in jest config (target: 70% line coverage on server)
- [ ] Add GitHub Actions workflow `.github/workflows/ci.yml` (lint + test on every PR)

---

## 5. Unit Tests — Server

- [ ] `server/tests/auth.test.js`
  - [ ] POST `/api/v1/auth/login` — success with valid credentials
  - [ ] POST `/api/v1/auth/login` — 401 with wrong password
  - [ ] POST `/api/v1/auth/login` — 401 with unknown username
  - [ ] POST `/api/v1/auth/login` — 400 with missing username/password
  - [ ] POST `/api/v1/auth/register` — success as admin
  - [ ] POST `/api/v1/auth/register` — 403 when called by non-admin
  - [ ] POST `/api/v1/auth/register` — 409 on duplicate username
  - [ ] GET `/api/v1/auth/me` — returns user when token valid
  - [ ] GET `/api/v1/auth/me` — 401 with no token
  - [ ] GET `/api/v1/auth/me` — 401 with expired token

- [ ] `server/tests/middleware.test.js`
  - [ ] `auth` middleware passes with valid JWT
  - [ ] `auth` middleware 401 with missing Authorization header
  - [ ] `auth` middleware 401 with malformed token
  - [ ] `auth` middleware 401 with expired token
  - [ ] `authorize('admin')` passes for admin user
  - [ ] `authorize('admin')` 403 for teacher user
  - [ ] `authorize('admin', 'teacher')` passes for teacher

- [ ] `server/tests/crypto.test.js`
  - [ ] `encrypt` + `decrypt` round-trip returns original string
  - [ ] `decrypt` with wrong key returns error
  - [ ] Encrypted output is different from input
  - [ ] Same input encrypted twice yields different ciphertext (IV randomness)

- [ ] `server/tests/user.model.test.js`
  - [ ] User saves with valid fields
  - [ ] User rejects duplicate username
  - [ ] User rejects invalid role
  - [ ] Password field is hashed before save (if using pre-save hook)

- [ ] `server/tests/health.test.js`
  - [ ] GET `/api/health` returns `{ status, db, uptime }`

---

## 6. Unit Tests — Client

- [ ] `client/src/__tests__/Login.test.jsx`
  - [ ] Renders username + password inputs and submit button
  - [ ] Shows error message on failed login (mock API)
  - [ ] Shows loading state during request
  - [ ] Redirects to `/` on successful admin login

- [ ] `client/src/__tests__/ProtectedRoute.test.jsx`
  - [ ] Renders children when role matches allowed roles
  - [ ] Redirects to role home when role doesn't match
  - [ ] Redirects to `/login` when no token in localStorage

- [ ] `client/src/__tests__/data.test.js` (mock data generators)
  - [ ] Total student count is 1200 (10 grades × 3 divs × 40)
  - [ ] Each student has required fields: id, name, grade, division, rollNumber
  - [ ] Same studentId always generates same student (deterministic seed)
  - [ ] All roll numbers within a division are unique

- [ ] `client/src/__tests__/Finance.test.jsx`
  - [ ] Renders fee ledger for a student
  - [ ] Shows correct outstanding balance
  - [ ] Installment rows display correct status badges

- [ ] `client/src/__tests__/SearchBar.test.jsx`
  - [ ] Calls onChange on input
  - [ ] Clears input on clear button click

---

## 7. API Integration Tests

- [ ] Full auth lifecycle: register → login → access protected route → logout
- [ ] Admin registers a new teacher user; teacher logs in; teacher can access `/api/v1/auth/me`
- [ ] Token expiry: expired token returns 401 on any protected route
- [ ] Rate limiting: 6th login attempt within window returns 429
- [ ] Role enforcement: teacher JWT cannot access admin-only routes
- [ ] Attachment preview returns `Content-Type: text/html`
- [ ] Attachment download returns correct MIME type for each file type

---

## 8. E2E / Playwright Tests

- [ ] `e2e/auth.spec.js`
  - [ ] Admin login → redirects to `/` dashboard
  - [ ] Teacher login → redirects to `/teachers`
  - [ ] Parent login → redirects to `/parents`
  - [ ] Wrong credentials → shows error message on page
  - [ ] Logout clears session and redirects to `/login`
  - [ ] Direct navigation to `/` without token → redirects to `/login`
  - [ ] Direct navigation to `/parents` as admin → redirected to `/`

- [ ] `e2e/dashboard.spec.js`
  - [ ] All module cards visible on admin dashboard
  - [ ] Search box filters module cards
  - [ ] Clicking a module card navigates to correct route

- [ ] `e2e/sis.spec.js`
  - [ ] Grade grid renders 10 grades
  - [ ] Clicking Grade 1 shows division cards (A, B, C)
  - [ ] Clicking a division shows student list with correct count (40)
  - [ ] Student name search filters the list
  - [ ] Clicking a student opens profile page with name and roll number

- [ ] `e2e/finance.spec.js`
  - [ ] Finance module loads with student list
  - [ ] Selecting a student shows fee ledger
  - [ ] Installment rows show correct status colors (paid/pending/overdue)

- [ ] `e2e/attendance.spec.js`
  - [ ] Attendance module loads with today's date pre-selected
  - [ ] Changing date updates the view
  - [ ] Grade/division filters narrow the list
  - [ ] Absent count and present count are visible

- [ ] `e2e/timetable.spec.js`
  - [ ] Timetable grid renders with correct number of periods
  - [ ] Saturday shows correct availability based on week number
  - [ ] Clicking a period opens period details page

- [ ] `e2e/mobile.spec.js`
  - [ ] Login page renders correctly at 375px viewport
  - [ ] Dashboard is usable on mobile viewport
  - [ ] Header navigation works on mobile

---

## 9. Backend — Students & Teachers API

- [ ] Create `server/models/Student.js` Mongoose schema
- [ ] Create `server/models/Teacher.js` Mongoose schema
- [ ] Create `server/routes/students.js`
  - [ ] `GET /api/v1/students?grade=&division=&search=&page=&limit=`
  - [ ] `POST /api/v1/students` (admin only)
  - [ ] `GET /api/v1/students/:id`
  - [ ] `PUT /api/v1/students/:id` (admin only)
  - [ ] `DELETE /api/v1/students/:id` → soft delete (set `status: inactive`)
- [ ] Create `server/routes/teachers.js`
  - [ ] `GET /api/v1/teachers`
  - [ ] `POST /api/v1/teachers` (admin only)
  - [ ] `GET /api/v1/teachers/:id`
  - [ ] `PUT /api/v1/teachers/:id`
- [ ] Add Joi/Zod validation schemas for student and teacher request bodies
- [ ] Write a one-time migration script to import mock student data into MongoDB
- [ ] Update `SIS.js`, `DivisionStudents.js`, `StudentProfile.js` to call real API
- [ ] Update `HR.js` to call real teachers API

---

## 10. Backend — Attendance API

- [ ] Create `server/models/Attendance.js` Mongoose schema
  - Index on `(studentId, date)` for fast queries
  - Compound index on `(grade, division, date)` for daily roll view
- [ ] Create `server/routes/attendance.js`
  - [ ] `GET /api/v1/attendance?date=&grade=&division=` — fetch day's roll
  - [ ] `POST /api/v1/attendance` — submit attendance (batch upsert)
  - [ ] `PUT /api/v1/attendance/:id` — correct single record
  - [ ] `GET /api/v1/attendance/stats?studentId=&from=&to=` — individual report
  - [ ] `GET /api/v1/attendance/summary?grade=&division=&month=` — class summary
- [ ] Update `Attendance.js` component to call real API
- [ ] Update `CommandCenter.js` attendance metrics to use real API

---

## 11. Backend — Finance API

- [ ] Create `server/models/FeeStructure.js` (grade-based fee config per academic year)
- [ ] Create `server/models/FeeAccount.js` (per-student ledger with installments)
- [ ] Create `server/routes/finance.js`
  - [ ] `GET /api/v1/finance/students/:id/ledger` — full payment history
  - [ ] `POST /api/v1/finance/payments` — record a payment
  - [ ] `GET /api/v1/finance/summary?grade=&academicYear=` — collection stats
  - [ ] `GET /api/v1/finance/defaulters?grade=` — list of students with dues
  - [ ] `GET /api/v1/finance/receipts/:paymentId` — downloadable PDF receipt
- [ ] Update `Finance.js` component to call real API
- [ ] Update `CommandCenter.js` fee collection metrics to use real API

---

## 12. Backend — Academic (Timetable & Exams)

- [ ] Create `server/models/Timetable.js`
- [ ] Create `server/models/Exam.js` + `server/models/ExamResult.js`
- [ ] Timetable routes: CRUD + `GET /api/v1/timetable?grade=&division=`
- [ ] Exam routes: `GET/POST /api/v1/exams`, results submission, results query
- [ ] Update `Timetable.js`, `PeriodDetails.js`, `Exams.js` components

---

## 13. Backend — Operations

- [ ] Create `server/models/Transport.js` (routes + vehicle + student assignments)
- [ ] Create `server/models/Inventory.js`
- [ ] Create `server/models/Announcement.js` (for Communication module)
- [ ] Implement `Communication.js` component (currently placeholder)
  - Send announcements (admin/teacher)
  - View announcements (all roles, filtered by audience)
- [ ] File upload infrastructure
  - Add `multer` for multipart form parsing
  - Choose storage: local disk (dev) + S3-compatible (prod)
  - Migrate hardcoded attachments to real upload/download

---

## 14. Frontend Professionalization

- [ ] **Extract all inline styles** to CSS modules (or adopt Tailwind CSS)
- [ ] **Build a shared component library** in `client/src/components/ui/`:
  - `Button`, `Badge`, `Card`, `Table`, `Modal`, `Spinner`, `Toast`, `Input`, `Select`
- [ ] **Add React error boundaries** around each module route
- [ ] **Add loading skeletons** for all data-loading views (replace blank flicker)
- [ ] **Add empty states** with clear messaging for every list view
- [ ] **Add toast notifications** for form submissions (success/error)
- [ ] **Upgrade React 17 → 18** (requires updating `ReactDOM.render` → `createRoot`)
- [ ] **Migrate CRA → Vite** (dramatically faster dev server + builds)
  - Remove `react-scripts`, add `vite`, `@vitejs/plugin-react`
  - Move `public/index.html` → `index.html` at client root
  - Update env var prefix `REACT_APP_` → `VITE_`
- [ ] **Add React Query** (`@tanstack/react-query`) for server state management
  - Replace manual `useEffect`/`useState` fetch patterns
  - Automatic caching, background refresh, error handling
- [ ] **Add lazy loading** for all route-level components (`React.lazy` + `Suspense`)
- [ ] **Fix mobile responsiveness** — test all modules at 375px, 768px, 1024px viewports
- [ ] **Replace emoji icons** with a proper icon library (`lucide-react` or `react-icons`)
- [ ] **Add page titles** (`document.title`) per route for browser history readability
- [ ] **Add keyboard navigation** improvements (focus management, skip-to-content link)

---

## 15. DevOps & CI/CD

- [ ] Initialize git repository (`git init`) if not already done
- [ ] Create `.github/workflows/ci.yml` — on PR: lint, unit tests, build
- [ ] Create `.github/workflows/cd.yml` — on push to `main`: deploy to Railway
- [ ] Add Railway health check on `/api/health`
- [ ] Set up **Sentry** for error monitoring (server + client)
  - `@sentry/node` on server, `@sentry/react` on client
- [ ] Set up structured logging (`pino` on server, `pino-http` for request logs)
- [ ] Add **MongoDB Atlas backup** schedule (daily, 30-day retention)
- [ ] Set up **staging environment** on Railway (separate branch deploy)
- [ ] Add Docker Compose file for local full-stack development with MongoDB

---

## 16. Documentation

- [ ] Update `README.md` (accurate setup, env var table, demo credentials, screenshots)
- [ ] Create `docs/API.md` — OpenAPI 3.0 spec (or generate with `swagger-jsdoc`)
- [ ] Create `docs/CONTRIBUTING.md` — branch strategy, PR process, commit message convention
- [ ] Create `docs/DEPLOYMENT.md` — Railway setup, env var checklist, post-deploy smoke test
- [ ] Update `ARCHITECTURE.md` as each backend module is built
- [ ] Add JSDoc comments to all server route handlers and models
- [ ] Create Postman collection for all API endpoints

---

## Quick Reference: What to Do Next

**Immediate (this week):**
1. Set up ESLint + Prettier + Husky → clean code baseline
2. Run `npm audit` → fix security vulnerabilities
3. Set up Jest for server → write auth tests
4. Install Playwright → write login E2E tests

**Short-term (next 2 weeks):**
5. Upgrade Mongoose + jsonwebtoken
6. Add Joi validation to all routes
7. Build Student + Teacher models + APIs
8. Write corresponding tests

**Medium-term (next month):**
9. Attendance + Finance APIs
10. Frontend → React 18 + Vite migration
11. CI/CD pipeline on GitHub Actions
12. CSS extraction from inline styles
