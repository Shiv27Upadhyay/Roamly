# Roamly — Discover. Plan. Remember.

A polished full-stack travel discovery and collaborative trip-planning web application built for the **Full Stack Developer Internship Technical Assignment (Rewamp Digital)**.

**Candidate Submission Deadline:** 25 October 2026, 12:00 PM IST.

---

## Technical Stack Overview

- **Backend**: Node.js (`v24.21.0`), Express (`v4.21.2`), Native SQLite (`node:sqlite`).
- **Database Engine**: Persistent disk SQLite file (`roamly.db`) with WAL journaling and foreign key cascades.
- **Frontend (Upcoming Phase 2)**: React + Vite with modern editorial Vanilla CSS design system.
- **Testing**: Automated end-to-end integration test suite exercising all 11 mandatory assignment requirements.

---

## Phase 1 Implementation Summary (Completed)

All backend, database schema, seeding, ownership security, and REST API requirements have been implemented and verified:

1. **Native SQLite (`node:sqlite`)**: Verified and running with zero native C++ compilation overhead on Windows.
2. **7 Core Database Tables**:
   - `users`: Core profile and user metadata.
   - `destinations`: Curated travel catalog with rich editorial tags, continent, and budget tier.
   - `trips`: Itineraries with dates, budgets, cover images, and author associations.
   - `trip_stops`: Individual day-by-day stops and places to visit with categories and costs.
   - `bookmarks`: User wishlist / saved destinations with uniqueness constraints.
   - `trip_likes`: Real interaction tracking for community itineraries.
   - `comments`: Community trip discussion thread with author metadata.
3. **Database Seeding**: 8 worldwide destinations, 2 users (Primary Demo User: *Elena Rostova*), 3 sample itineraries with 13 detailed stops, bookmarks, likes, and comments.
4. **Ownership Verification**: Trips and comments enforce author ownership. Updating or deleting another user's content returns `403 Forbidden`.
5. **Disk Persistence**: Data survives server shutdown and database reboots intact in `backend/data/roamly.db`.
6. **E2E Test Coverage**: 33 automated tests validating CRUD, invalid inputs (400), nonexistent resources (404), ownership protection (403), toggle interactions, and restart persistence.

---

## Quick Start (Backend)

```bash
# 1. Enter backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Run automated test suite
npm run test:api
```

For full API endpoint documentation, parameter schemas, and error responses, see [backend/README.md](file:///d:/Internship/backend/README.md).
