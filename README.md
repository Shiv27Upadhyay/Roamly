# Roamly — Discover. Plan. Remember.

A polished full-stack travel discovery and collaborative trip-planning web application built for the **Full Stack Developer Internship Technical Assignment (Rewamp Digital)**.

**Candidate Submission Deadline:** 25 October 2026, 12:00 PM IST.

---

## Technical Stack Overview

- **Frontend**: React 19, Vite, React Router 7, Lucide Icons.
- **Styling**: Bespoke Editorial Vanilla CSS Design System with custom tokens (warm ivory, sand, terracotta, sage, ochre, deep ink). Zero AI-dashboard templates, zero generic blue gradients.
- **Backend**: Node.js (`v24.21.0`), Express (`v4.21.2`), Native SQLite (`node:sqlite`).
- **Database Engine**: Persistent disk SQLite file (`backend/data/roamly.db`) with WAL journaling and foreign key cascade enforcement.
- **Testing**: Automated end-to-end integration test suite exercising all 11 mandatory assignment requirements (33/33 tests passing).

---

## Rewamp Digital Assignment Requirements Matrix

| # | Requirement | Implementation in Roamly | Verification Status |
| :-: | :--- | :--- | :---: |
| **1** | **Home page** | Editorial landing with brand manifesto, destination spotlights, quick search, and trending community itineraries. | Verified (`/`) |
| **2** | **Listing and details** | Curated catalog at `/destinations` & `/destinations/:id`; Itinerary directory at `/trips` & `/trips/:id`. | Verified |
| **3** | **Create and update** | Full trip creation & itinerary editor at `/trips/new` and `/trips/:id/edit` with day-by-day stops and budget calculations. | Verified |
| **4** | **Delete** | Author-verified trip and comment deletion with confirmation modals and cascading cleanup. | Verified |
| **5** | **Interactions** | **3 Real interactions**: Wishlist Bookmarking (destinations), Likes (trips), and live Discussion Comments. | Verified |
| **6** | **Search & filtering** | Keyword search across titles, countries, and tags; Filter pills by Continent (Region) and Budget Tier (`$`, `$$`, `$$$`). | Verified |
| **7** | **User profile** | Profile page (`/profile`) showing Elena Rostova's bio, home city, stats, created trips, and saved wishlist items. | Verified |
| **8** | **Backend API** | Structured REST API with validation, clean JSON responses, 404 handlers, and centralized error logging. | Verified (`/api/*`) |
| **9** | **Database persistence** | SQLite database file (`roamly.db`) persisting on disk across server shutdowns and restarts. | Verified |
| **10** | **Validation & error handling** | Form validation, date sequence checks, negative budget prevention, HTTP 400/403/404/500 codes, loading skeletons, and empty states. | Verified |
| **11** | **Responsive UI** | Fluid layouts optimized for mobile (360px), tablet (640px), and desktop (1024px–1440px) with responsive navigation drawer. | Verified |

---

## Project Structure

```text
d:/Internship/
├── backend/
│   ├── data/
│   │   └── roamly.db              # Persistent SQLite database file
│   ├── src/
│   │   ├── config/                # Database connection, DDL schema, and rich seeds
│   │   ├── controllers/           # Destination, trip, interaction, and profile controllers
│   │   ├── middleware/            # Validation, user resolution, and error handling
│   │   ├── routes/                # Express sub-routers mounted at /api
│   │   └── server.js              # Express app entry point (port 5000)
│   ├── test/
│   │   └── api_test.js            # Automated E2E test suite (33 assertions)
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── public/
│   │   └── favicon.svg            # Custom terracotta & ink compass icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # DestinationCard, TripCard, LoadingSkeleton, EmptyState, ConfirmModal, ErrorBanner
│   │   │   └── layout/            # Navbar with responsive drawer, Footer with credits
│   │   ├── context/               # Toast notification provider
│   │   ├── pages/                 # Home, Destinations, DestinationDetail, Trips, TripDetail, CreateEditTrip, Profile
│   │   ├── services/              # Centralized API fetch wrapper with /api proxy
│   │   ├── styles/                # variables.css, base.css, components.css, layout.css
│   │   ├── App.jsx                # Client router shell
│   │   ├── index.css              # Master styling entry
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js             # Dev server & proxy configuration to port 5000
│   └── package.json
├── .gitignore
└── README.md
```

---

## Local Setup & Execution Instructions

### 1. Start the Backend API Server
```bash
cd backend
npm install
npm run dev
```
The backend starts on `http://localhost:5000`. On first launch, it automatically seeds 8 worldwide destinations, 2 users, 3 itineraries with 13 stops, bookmarks, likes, and comments.

### 2. Run Backend Verification Tests
```bash
cd backend
npm run test:api
```
Executes all 33 end-to-end assertions covering CRUD, validation, ownership security, interactions, and restart persistence.

### 3. Start the Frontend Application
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. All `/api` requests are automatically proxied to the backend on port 5000.

### 4. Build for Production
```bash
cd frontend
npm run build
```
Generates a minified production build in `frontend/dist/`.
