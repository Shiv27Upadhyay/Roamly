# Roamly Backend API

> Polished RESTful backend for **Roamly** travel discovery and collaborative trip-planning.
> Built with Node.js, Express, and native SQLite (`node:sqlite`).

---

## 1. Architecture Highlights

- **Native SQLite Integration (`node:sqlite`)**: Utilizes Node 24's native `DatabaseSync` engine. Zero C++ native compilation, zero `node-gyp` dependencies, and guaranteed stability on Windows and Unix environments.
- **Relational Integrity**: Foreign key constraints enabled via `PRAGMA foreign_keys = ON;`, `ON DELETE CASCADE` for trip stops, comments, and likes.
- **WAL Journaling**: `PRAGMA journal_mode = WAL;` enabled for concurrent read and write operations.
- **Atomic Transactions**: Multi-stop trip creation and itinerary synchronization executed inside atomic transactions (`BEGIN` / `COMMIT` / `ROLLBACK`).
- **Ownership Verification**: Trips and comments enforce author ownership. Non-authors attempting to update or delete resources receive `403 Forbidden`.
- **Validation & Error Handling**: Comprehensive request validation for payloads and IDs, returning standardized JSON responses.

---

## 2. Directory Structure

```text
backend/
├── data/
│   └── roamly.db              # Persistent SQLite database file
├── src/
│   ├── config/
│   │   ├── db.js              # Database connection & transaction helper
│   │   ├── schema.js          # DDL definitions for the 7 core tables
│   │   └── seed.js            # Curated destinations & sample itineraries
│   ├── controllers/
│   │   ├── destinationController.js
│   │   ├── tripController.js
│   │   ├── interactionController.js
│   │   └── profileController.js
│   ├── middleware/
│   │   ├── errorHandler.js    # 404 & Centralized error handler
│   │   └── validate.js        # Payload & parameter validation middleware
│   ├── routes/
│   │   ├── destinationRoutes.js
│   │   ├── tripRoutes.js
│   │   ├── interactionRoutes.js
│   │   ├── profileRoutes.js
│   │   └── index.js           # API route aggregator mounted at /api
│   └── server.js              # Express app entry point
├── test/
│   └── api_test.js            # Automated E2E test suite (33 assertions)
├── .env.example
├── package.json
└── README.md
```

---

## 3. Getting Started

### Prerequisites
- **Node.js**: v22.5.0 or higher (v24.21.0 recommended; built-in native `node:sqlite` required)
- **npm**: v10.0.0 or higher

### Installation & Environment
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create environment file:
   ```bash
   # Unix / macOS / PowerShell
   cp .env.example .env

   # Windows Command Prompt
   copy .env.example .env
   ```
   Default `.env` configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_PATH=./data/roamly.db
   ```

### Running the Server
- **Development mode** (auto-restart with nodemon):
   ```bash
   npm run dev
   ```
- **Production mode**:
   ```bash
   npm start
   ```
- **Service Verification**:
   ```bash
   # Root welcome & API metadata
   curl http://localhost:5000/

   # API health & active user context
   curl http://localhost:5000/api/health
   ```

---

## 4. Database Seeding & Reseeding

The server automatically seeds the database on first run if empty. To manually re-seed or wipe clean:

```bash
# Clean re-seed with fresh sample data
npm run seed -- --force
```

### Seeded Content:
- **Users**: 2 users (Primary Demo User: `Elena Rostova`, Community User: `Marcus Vance`).
- **Destinations**: 8 worldwide curated destinations (Kyoto, Amalfi Coast, Oaxaca, Reykjavik, Chefchaouen, Queenstown, Porto, Banff).
- **Trips**: 3 sample itineraries with 13 detailed day-by-day stops.
- **Interactions**: Wishlist bookmarks, trip likes, and community comments.

---

## 5. Automated E2E Test Suite

The test suite exercises all endpoints, input validation, ownership enforcement, duplicate handling, and disk persistence across server restarts:

```bash
npm run test:api
```

Expected output:
```text
========================================
TEST RESULTS: 33/33 PASSED (0 FAILED)
========================================
```

---

## 6. API Reference

All responses follow a consistent JSON format:
- **Success**: `{ "success": true, "data": ..., "message"?: string }`
- **Error**: `{ "success": false, "error": string, "details"?: string[] }`

### User Context
Without an active authentication provider, requests resolve user identity via:
1. `x-user-id` HTTP header (e.g. `x-user-id: 1`)
2. `?user_id=1` query parameter
3. Defaults to **Demo User 1** (`Elena Rostova`) if omitted.

### Endpoints Table

| Method | Endpoint | Description | Auth / Owner Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/` | Root welcome endpoint returning API status, version, and health link | No |
| `GET` | `/api/health` | Service health status & active user info | No |
| `GET` | `/api/destinations` | List destinations (filters: `search`, `continent`, `budget_tier`) | No |
| `GET` | `/api/destinations/:id` | Get destination details with associated itineraries | No |
| `POST` | `/api/destinations/:id/bookmark` | Toggle bookmark / wishlist for active user | Yes (`x-user-id`) |
| `GET` | `/api/bookmarks` | List all saved wishlist destinations for active user | Yes (`x-user-id`) |
| `GET` | `/api/trips` | List trips (filters: `search`, `destination_id`, `user_id`) | No |
| `GET` | `/api/trips/:id` | Get trip details with stops, comments, and like status | No |
| `POST` | `/api/trips` | Create a new trip with optional stops (atomic transaction) | Yes (`x-user-id`) |
| `PUT` | `/api/trips/:id` | Update trip details and synchronize stops | **Owner Only** (403 if mismatched) |
| `DELETE` | `/api/trips/:id` | Delete trip (cascades to stops, likes, comments) | **Owner Only** (403 if mismatched) |
| `POST` | `/api/trips/:id/like` | Toggle like on a trip | Yes (`x-user-id`) |
| `POST` | `/api/trips/:id/comments` | Post a comment on a trip | Yes (`x-user-id`) |
| `DELETE` | `/api/comments/:id` | Delete a comment | **Author Only** (403 if mismatched) |
| `GET` | `/api/profile` | Get active user profile, stats, created trips, and bookmarks | Yes (`x-user-id`) |
| `GET` | `/api/profile/:id` | Get profile for specific user ID | No |
| `GET` | `/api/trips/:id/media` | List photos & videos for a trip (respects privacy/groups) | Contextual |
| `POST` | `/api/trips/:id/media/signature` | Request signed upload credentials for Cloudinary | **Owner or Companion** |
| `POST` | `/api/trips/:id/media` | Register uploaded Cloudinary media metadata | **Owner or Companion** |
| `DELETE` | `/api/trips/:id/media/:mediaId` | Delete media asset from Cloudinary and SQLite | **Uploader or Owner** |

---

## 7. Media & Cloudinary Storage

Roamly uses a **Direct Signed Upload Architecture** with Cloudinary for photo and video storage:
- Large media files are transferred directly from the browser to Cloudinary CDN, bypassing Express memory/bandwidth.
- Signatures are generated server-side with HMAC-SHA256 (`CLOUDINARY_API_SECRET` remains strictly confidential on the server).
- Metadata (URL, format, dimensions, duration, caption, uploader) is persisted in SQLite `trip_media`.
- Photos are capped at **10 MB** (JPEG, PNG, WebP, HEIC).
- Videos are capped at **100 MB** and **180 seconds** (MP4, MOV, WebM).
- For private and unlisted itineraries, URLs are generated with dynamic cryptographic signatures or high-entropy folder namespaces to prevent asset enumeration.
- Member removal from a group immediately revokes media upload and viewing access.

### Environment Setup
Add to `backend/.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Media Test Suite
Run the isolated automated media test suite:
```bash
npm run test:media
```
