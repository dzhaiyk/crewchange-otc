# Fatih Crew Change MVP

Local-first web MVP for managing drillship crew-change rotations with 4 roles and strict same-day crew-change constraints.

## Stack

- Next.js (App Router) + React + TypeScript
- Prisma ORM + SQLite (`prisma/dev.db`)
- Tailwind CSS (simple styling)
- Vitest for unit tests (scheduler/validation)

## What this MVP includes

- Admin login (single username/password for MVP)
- People CRUD (name, primary role, optional employer/contact/notes)
- Rotation assignments with 28 ON / 28 OFF plan generation
- Deterministic crew-change staggering across days when constraints conflict
- Schedule validation (`validatePlan`) for overlap/gap/forbidden same-day pairs
- Exceptions workflow with required reason:
  - Early relief
  - Delayed join
  - Swap
  - Manual move with nearest valid date resolution
- Audit trail (`Exception` + `AuditLog` tables)
- Dashboard:
  - Today's crew
  - Upcoming crew changes
  - Validation warnings
- Gantt-like schedule timeline by role

## Crew-change constraints implemented

Forbidden same-day pairs:

- `DD_DAY` + `DD_NIGHT`
- `MWD_DAY` + `MWD_NIGHT`
- `DD_DAY` + `MWD_DAY`
- `DD_NIGHT` + `MWD_NIGHT`

## Deterministic scheduling algorithm

The generator (`generateDefaultPlan`) does:

1. Start from a plan start date.
2. For each role, calculate next nominal 28-day change date.
3. If multiple roles want the same date, schedule in deterministic role order.
4. For each role, pick first valid date from deterministic preference offsets:
   - `0, +1, +2, +3, +4, +5, +6, -1, -2, -3, ...`
5. Reject dates that violate forbidden same-day role pairs.

`validatePlan` checks:

- Missing role coverage
- Invalid intervals
- Overlaps and gaps per role
- Forbidden same-day crew-change pairs

## Data model

Prisma models:

- `Person`
- `Assignment` (with `startDate`, `endDate`, end exclusive)
- `Exception`
- `AuditLog`

Enums:

- `Role`: `DD_DAY`, `DD_NIGHT`, `MWD_DAY`, `MWD_NIGHT`
- `ExceptionType`: `EARLY_RELIEF`, `DELAYED_JOIN`, `SWAP`, `MANUAL_MOVE`

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create DB + migration:

```bash
npm run prisma:migrate -- --name init
```

3. Seed sample data (8 people + initial rotation):

```bash
npm run prisma:seed
```

4. Start app:

```bash
npm run dev
```

5. Open:

- [http://localhost:3000](http://localhost:3000)

Default local admin credentials (from `.env`):

- username: `admin`
- password: `fatih-admin`

## Test scheduler logic

```bash
npm test
```

Included test scenarios:

- Normal 28/28 cadence with deterministic Thursday role cadence
- Same-Thursday forbidden pair is staggered across days
- Early relief request that conflicts is auto-resolved to nearest valid date

## API endpoints (MVP)

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `GET /api/people`
- `POST /api/people`
- `PATCH /api/people/:id`
- `DELETE /api/people/:id` (soft deactivate)
- `GET /api/exceptions`
- `POST /api/exceptions`

## Notes / assumptions

- Dates are stored and displayed as ISO `YYYY-MM-DD` strings.
- Dates are treated as local ship dates (no time-of-day).
- `endDate` is exclusive, so crew-change event date equals outgoing `endDate` and incoming `startDate`.
- For MVP auth, session cookie is simple and intended for local/internal use only.
- SQLite is used by default (per your local-first request). Supabase is not required for this MVP.

## Optional Docker run

```bash
docker build -t fatih-crew-change .
docker run --rm -p 3000:3000 fatih-crew-change
```

The container runs `prisma migrate deploy` on startup and then starts Next.js.
