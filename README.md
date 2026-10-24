# Roamly — Discover. Plan. Remember.

A mindful, full-stack travel discovery and collaborative trip-planning journal built for the **Full Stack Developer Internship Technical Assignment (Rewamp Digital)**.

---

## 1. Project Title & Introduction

**Roamly** is a curated travel discovery platform and itinerary planner designed with an authentic editorial aesthetic. 

### The Problem It Solves
Travel planning is frequently fragmented across disconnected tools: bookmarks are lost in browsers, itineraries live in messy spreadsheets, companion coordination is scattered across chat apps, and budget tracking lacks transparency.

Roamly unifies the entire journey into a single, cohesive experience:
- **Discover**: Browse handpicked global sanctuaries with narrative travel guides, optimal seasons, regional dining highlights, and budget tier classifications.
- **Plan**: Construct day-by-day itineraries with categorized stops (`Stay`, `Food`, `Culture`, `Nature`, `Activity`, `Transit`), individual item costs, and automatic budget summation.
- **Collaborate**: Create shared group workspaces with unique alphanumeric invite codes (`ROAM-XXXX`), dynamic vector QR codes, and companion access.
- **Capture**: Preserve authentic memories through distinct photo and video galleries powered by direct client-side uploads.
- **Control**: Maintain granular control over trip visibility (`Public`, `Unlisted` via secret share tokens, or `Private` for companions only).

---

## 2. Important Links

| Resource | URL |
|---|---|
| 🌐 **Live Website** | [https://roamly-ruby.vercel.app/](https://roamly-ruby.vercel.app/) |
| 🎥 **Demo Video** | [https://drive.google.com/file/d/1iK21h2vJ4z_-nazSUFWEC1W4dzz_OyK0/view?usp=sharing](https://drive.google.com/file/d/1iK21h2vJ4z_-nazSUFWEC1W4dzz_OyK0/view?usp=sharing) |
| 💻 **GitHub Repository** | [https://github.com/Shiv27Upadhyay/Roamly](https://github.com/Shiv27Upadhyay/Roamly) |

---

## 3. Features & Implemented Workflows

### 1. Curated Destinations Catalog (`/destinations`, `/destinations/:id`)
- **Global Sanctuaries**: 8 curated editorial destinations across Europe, Asia, the Americas, Africa, and Oceania (Kyoto, Amalfi Coast, Oaxaca, Reykjavik, Chefchaouen, Queenstown, Porto, Banff).
- **Search & Filters**: Real-time keyword search across titles, countries, and tags, paired with filter pills by Continent/Region and Budget Tier (`₹ Budget`, `₹₹ Moderate`, `₹₹₹ Luxury`).
- **Comprehensive Guide**: In-depth overview, optimal travel season, budget classification badge, location coordinates, and linked community itineraries.
- **Wishlist Interaction**: Instant bookmark toggle to save destinations to personal wishlists.

### 2. Collaborative Itinerary Studio (`/trips`, `/trips/new`, `/trips/:id`, `/trips/:id/edit`)
- **Community Directory**: Explore published itineraries with author profiles, destination association, travel dates, stop counts, like counters, and estimated budgets.
- **Day-by-Day Stop Builder**: Dynamic stops editor categorized by `Stay`, `Food`, `Culture`, `Nature`, `Activity`, and `Transit` with individual item costs, day reordering, and automatic budget summation.
- **Author Ownership Protection**: Strict author-only authorization. Only the trip creator can update or delete itineraries. Mismatched users receive HTTP 403 Forbidden. Deletions cascade cleanly to all stops, media, likes, and comments.

### 3. Real User Interactions
- **Wishlist Bookmarks**: Save and unsave destinations from cards or detail views, updating the user profile wishlist tab.
- **Itinerary Likes**: Toggle likes on travel itineraries with real-time like count counters.
- **Discussion Comments**: Threaded discussion on each itinerary with authenticated author attribution and author-only comment deletion.

### 4. Granular Trip Privacy & Authorization
- **Public**: Discoverable in search, community directories, destination guides, and profile views.
- **Unlisted**: Excluded from public feeds; accessible exclusively to visitors possessing a high-entropy 32-character cryptographic share token.
- **Private**: Hidden from anonymous users and outsiders. Accessible strictly by the author and accepted group companions. Outsiders receive a uniform HTTP 404 Not Found to prevent existence disclosure.

### 5. Group Trips & Dynamic QR Invitations (`/trips/:id`, `/trips/join`)
- **Companion Workspaces**: Trip authors can initialize a collaborative companion group.
- **Alphanumeric Invite Codes**: Cryptographically generated, memorable 9-character invite codes (`ROAM-XXXX`) using an unambiguous 32-character alphabet (20-bit entropy).
- **Dynamic QR Codes**: Real-time generated vector SVG and raster QR codes pointing directly to canonical join flows for seamless mobile onboarding.
- **Invite Lifecycle Management**: Rotate invitation tokens instantly to invalidate old links, or pause/revoke invitations across active groups.

### 6. Photos & Videos Media Galleries (`/trips/:id`)
- **Separated Media Sections**: Dedicated gallery layouts for high-resolution trip Photos and native in-page Videos.
- **Direct Cloudinary Uploads**: Client-side direct signed uploads with authenticated signature generation on the backend, zero server bandwidth bottlenecks, and live progress tracking.
- **Photo Lightbox**: Full-screen modal viewer with keyboard navigation (Arrow keys, Escape), zoom display, download options, captions, and uploader attribution.
- **In-Page Video Playback**: Native HTML5 controls, duration badges (up to 180s / 3 minutes), and poster thumbnails.
- **Validation**: Strict file size caps (Photos $\le$ 10 MB, Videos $\le$ 100 MB), MIME whitelisting (JPEG, PNG, WebP, HEIC, MP4, MOV, WebM), and pre-upload duration verification.

### 7. User Profiles & Google Authentication (`/profile`)
- **Google Identity Services**: Official Google OAuth 2.0 Web Client integration with secure server-side credential verification (`google-auth-library`).
- **Session Security**: Authenticated sessions stored in HttpOnly cookies and Bearer tokens with CSRF protections and spoofing prevention.
- **User Dashboard**: Aggregated travel statistics (itineraries created, wishlists saved), traveler bio, home city, and tabbed navigation.

### 8. Currency System & INR Formatting
- **Indian Rupee (INR, ₹) Default**: Default currency throughout the entire application, formatted with standard Indian numbering groupings (`en-IN`, e.g., `₹2,66,000`, `₹1,28,250`).
- **Multi-Currency Support**: Full support preserved for international currencies (`USD`, `EUR`, `GBP`, `JPY`, `CAD`, `AUD`).
- **Budget Tier Classifications**: Displayed with Rupee symbols (`₹ Budget`, `₹₹ Moderate`, `₹₹₹ Luxury`).

### 9. Smart Features Concepts (`/smart-features`)
- **Smart Memories (Concept Preview)**: Facial-recognition-inspired trip photo discovery prototype demonstrating companion clustering, sample photo filtering, and privacy safeguards without active biometric processing.
- **Smart Search (Concept Preview)**: Natural-language travel discovery prototype featuring conversational prompt chips, travel-interest filters, and illustrative destination previews without fabricated live AI results.

---

## 4. Visual Tour & Application Screenshots

The following verified screenshots reflect the live application running in the repository:

### 1. Editorial Homepage (`/`)
*Brand manifesto, destination spotlights, quick search, and trending community itineraries.*
![Editorial Homepage](docs/screenshots/01_homepage_hero_and_spotlights.png)

---

### 2. Curated Destinations Catalog (`/destinations`)
*Keyword search, Continent filter pills, Rupee budget tier indicators, and wishlist toggles.*
![Curated Destinations Catalog](docs/screenshots/02_destinations_catalog_and_filters.png)

---

### 3. Destination Detail Page (`/destinations/:id`)
*Cover imagery, narrative travel guide, optimal travel season, and associated itineraries.*
![Destination Detail Page](docs/screenshots/03_destination_detail_guide.png)

---

### 4. Community Itineraries Directory (`/trips`)
*Directory of travel itineraries, dates, destination tags, stop counters, and estimated budgets.*
![Community Itineraries Directory](docs/screenshots/04_trips_directory.png)

---

### 5. Day-by-Day Itinerary Detail (`/trips/:id`)
*Chronological day-by-day stops timeline, category badges, like counter, and discussion comments feed.*
![Day-by-Day Itinerary Detail](docs/screenshots/05_trip_detail_and_discussion.png)

---

### 6. Trip Creation & Itinerary Editor (`/trips/new`)
*Full itinerary authoring studio, date validation, currency selector, and dynamic stops editor.*
![Trip Creation & Itinerary Editor](docs/screenshots/06_trip_creator_and_stops_editor.png)

---

### 7. User Profile Dashboard (`/profile`)
*Active user profile, bio, home city, aggregated stats, created itineraries, and saved wishlists.*
![User Profile Dashboard](docs/screenshots/07_user_profile_and_wishlist.png)

---

## 5. Technology Stack & Architecture

Roamly uses a decoupled client-server architecture with an integrated development proxy, hybrid dual-engine database architecture, and strict separation of concerns:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT (SPA)                           │
│  React 19 • Vite • React Router 7 • Lucide Icons • Editorial CSS       │
│  Production: Vercel (https://roamly-ruby.vercel.app)                  │
│  Development: http://localhost:5173                                   │
└──────────────────┬────────────────────────────────▲───────────────────┘
                   │                                │
                   │  /api/* requests (Fetch API)   │  JSON responses
                   ▼                                │
┌──────────────────┴────────────────────────────────┴───────────────────┐
│                    API GATEWAY / REVERSE PROXY                        │
│  Production: Vercel Rewrites (/api/:path* -> Render Backend)          │
│  Development: Vite Proxy (/api -> http://localhost:5000)              │
└──────────────────┬────────────────────────────────▲───────────────────┘
                   │                                │
                   ▼                                │
┌──────────────────┴────────────────────────────────┴───────────────────┐
│                      EXPRESS REST API BACKEND                          │
│  Node.js (v24.21.0 / v22.5+) • Express 4.21 • Port 5000               │
│  Production: Render Web Service (https://roamly-ax2g.onrender.com)     │
│  Middleware: auth, validation, errorHandler, helmet, cors, cookies    │
└──────────────────┬────────────────────────────────▲───────────────────┘
                   │                                │
                   ▼                                │
┌──────────────────┴────────────────────────────────┴───────────────────┐
│                     HYBRID PERSISTENCE TIER                           │
│  PRODUCTION: Neon Serverless PostgreSQL (pg.Pool with SSL pooling)     │
│  LOCAL DEV & TESTING: Native SQLite (node:sqlite DatabaseSync, WAL)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Breakdown

| Tier | Technology | Purpose |
|---|---|---|
| **Frontend** | **React 19** (`^19.3.1`) | Single-page application UI framework |
| **Tooling** | **Vite** (`^8.3.4`) | High-performance build tool and local dev server |
| **Routing** | **React Router 7** (`^7.18.4`) | Client-side routing with deep link and SPA fallback support |
| **Icons** | **Lucide React** (`^1.60.0`) | Modern travel, navigation, and UI icon library |
| **Styling** | **Editorial Vanilla CSS** | Custom design system with CSS tokens (ivory, sand, terracotta, sage, ochre, ink); zero generic UI kits |
| **Backend** | **Node.js** (`v24.21.0` / `v22.5+`) | Runtime environment with native SQLite and cryptographic primitives |
| **API Framework** | **Express** (`^4.21.2`) | Structured RESTful routing, validation, and error handling |
| **Auth** | **Google Auth Library** (`^11.3.1`) | Server-side Google ID token verification |
| **Media** | **Cloudinary SDK** (`^2.11.0`) | Secure upload signature generation and asset management |
| **QR Generation** | **QRCode** (`^1.5.4`) | Dynamic vector SVG and raster QR generation for companion invites |
| **Production DB** | **Neon PostgreSQL** (`pg ^8.23.1`) | Hosted serverless PostgreSQL with connection pooling (`pg.Pool`) |
| **Local/Test DB** | **Native SQLite** (`node:sqlite`) | Persistent disk database with WAL journaling and atomic transactions |
| **Static Analysis** | **Oxlint** | High-speed frontend linting and React hook static analysis |

---

## 6. Project Structure

```text
d:/Internship/
├── backend/
│   ├── data/                      # Local SQLite database files & automated backups
│   │   └── roamly.db              # Local persistent SQLite database
│   ├── src/
│   │   ├── config/
│   │   │   ├── cloudinary.js      # Cloudinary signature generation & media caps
│   │   │   ├── db.js              # Hybrid DB manager (Neon PostgreSQL / Native SQLite)
│   │   │   ├── postgresSchema.js  # PostgreSQL DDL schema definitions
│   │   │   ├── schema.js          # SQLite DDL schema definitions & migrations
│   │   │   └── seed.js            # Curated destinations, users, trips & stops
│   │   ├── controllers/
│   │   │   ├── authController.js        # Google authentication & session lifecycle
│   │   │   ├── destinationController.js # Catalog, search, filters & details
│   │   │   ├── groupController.js       # Group trips, invite tokens & QR codes
│   │   │   ├── interactionController.js # Wishlist bookmarks, likes & comments
│   │   │   ├── mediaController.js       # Upload signatures, metadata & moderation
│   │   │   ├── profileController.js     # User stats, created trips & wishlists
│   │   │   └── tripController.js        # Itinerary CRUD, stops sync & privacy gates
│   │   ├── middleware/
│   │   │   ├── auth.js            # Session verification & identity resolution
│   │   │   ├── errorHandler.js    # Centralized JSON error handling & 404 gate
│   │   │   └── validate.js        # Payload validation & boundary guards
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── destinationRoutes.js
│   │   │   ├── groupRoutes.js
│   │   │   ├── interactionRoutes.js
│   │   │   ├── mediaRoutes.js
│   │   │   ├── profileRoutes.js
│   │   │   ├── tripRoutes.js
│   │   │   └── index.js           # Main API router mounted at /api
│   │   ├── scripts/
│   │   │   └── migrateUsdToInr.js # Dedicated transactional USD-to-INR migration runner
│   │   ├── utils/
│   │   │   └── token.js           # Cryptographic invite codes & share tokens
│   │   └── server.js              # Express app entry point
│   ├── test/
│   │   ├── api_test.js                # Core API E2E & persistence tests (33 tests)
│   │   ├── auth_security_test.js      # Auth, Google tokens & IDOR defense (33 tests)
│   │   ├── currency_migration_test.js # INR conversion & idempotency tests (15 tests)
│   │   ├── group_trip_test.js         # Group trips, invite tokens & QR tests (53 tests)
│   │   ├── trip_media_test.js         # Media signatures & Cloudinary tests (36 tests)
│   │   └── trip_privacy_test.js       # Privacy tiers & token authorization (42 tests)
│   ├── .env.example               # Backend environment template
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── favicon.svg            # Custom terracotta compass icon
│   ├── src/
│   │   ├── assets/                # Hero banner artwork
│   │   ├── components/
│   │   │   ├── auth/              # GoogleSignInButton, AuthModal
│   │   │   ├── common/            # DestinationCard, TripCard, Modals, Skeletons
│   │   │   ├── home/              # CinematicDestinationExperience
│   │   │   ├── layout/            # Navbar with responsive drawer, Footer
│   │   │   └── trips/             # PhotoLightbox, MediaUploadModal, MediaGalleries
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Client auth state provider
│   │   │   └── ToastContext.jsx   # Global toast notifications
│   │   ├── pages/                 # Home, Destinations, Trips, TripDetail, Profile, etc.
│   │   ├── services/
│   │   │   └── api.js             # Centralized fetch wrapper with /api relative routing
│   │   ├── styles/                # CSS custom properties, tokens, and base styles
│   │   └── utils/
│   │       └── currency.js        # Centralized currency formatters (INR, multi-currency)
│   ├── .env.example               # Frontend environment template
│   ├── .oxlintrc.json             # Code quality configuration
│   ├── package.json
│   ├── vercel.json                # Vercel reverse proxy rewrites & SPA routing fallback
│   └── vite.config.js             # Dev server & proxy configuration to port 5000
├── docs/
│   └── screenshots/               # Verified full-resolution application screenshots
├── .gitignore
└── README.md                      # Root project documentation
```

---

## 7. Prerequisites

Before running Roamly locally, ensure you have the following installed:

- **Node.js**: `v22.5.0` or higher (Recommended: `v24.21.0` or latest LTS for full native `node:sqlite` support)
- **npm**: `v10.0.0` or higher
- **Git**: Installed and configured
- **Web Browser**: Modern browser (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge)

---

## 8. Local Setup Instructions

Follow these step-by-step instructions to run Roamly locally with a self-contained SQLite database.

### Step 1: Clone the Repository
```bash
git clone https://github.com/Shiv27Upadhyay/Roamly.git
cd Roamly
```

---

### Step 2: Configure & Start the Backend

Open your **first terminal** window:

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create your local environment configuration from the template:
   ```bash
   # Linux / macOS / PowerShell:
   cp .env.example .env

   # Windows Command Prompt:
   copy .env.example .env
   ```

4. *(Optional)* Add your credentials to `backend/.env` if you wish to test Google OAuth or Cloudinary media uploads locally. For standard browsing, trip planning, and tests, the default values operate with zero external dependencies.

5. Start the backend development server:
   ```bash
   npm run dev
   ```

   The backend will start on **`http://localhost:5000`**. On initial startup, it automatically creates the local SQLite database (`backend/data/roamly.db`), sets up the schema, and seeds curated destinations, demo travelers, itineraries, and stops.

---

### Step 3: Configure & Start the Frontend

Open your **second terminal** window:

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create your frontend environment configuration:
   ```bash
   # Linux / macOS / PowerShell:
   cp .env.example .env

   # Windows Command Prompt:
   copy .env.example .env
   ```

4. Launch the Vite development server:
   ```bash
   npm run dev
   ```

5. Open **`http://localhost:5173`** in your browser. All API requests (`/api/*`) are automatically proxied by Vite to the backend running on port 5000.

---

### Step 4: Verification & Production Builds

To verify code quality, tests, and production build readiness:

```bash
# In the backend/ directory:
npm run test:api       # Runs core API E2E tests (33 tests)
npm run test:security  # Runs authentication & IDOR security tests (33 tests)
npm run test:privacy   # Runs trip privacy & authorization tests (42 tests)
npm run test:groups    # Runs group trips & QR invite tests (53 tests)
npm run test:media     # Runs photo/video & Cloudinary tests (36 tests)
npm run test:currency  # Runs currency migration & INR tests (15 tests)

# In the frontend/ directory:
npm run lint           # Runs Oxlint static analysis
npm run build          # Builds production Vite client bundle into dist/
```

---

## 9. Environment Variables & Security

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `PORT` | Local HTTP port for the Express server | `5000` | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | Yes |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string with SSL | `postgresql://user:pass@host/db?sslmode=require` | Production only |
| `DB_PATH` | Path to persistent SQLite database file for local development | `./data/roamly.db` | Local only |
| `FORCE_SQLITE` | Force SQLite engine even if DATABASE_URL is set | `false` | No |
| `FRONTEND_URL` | Trusted origin for CORS and dynamic invitation links | `http://localhost:5173` | Yes |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) | Random 64-char hex string | Yes |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID for Google Identity Services | `*.apps.googleusercontent.com` | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier for media storage | Custom string | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API access key | Numeric string | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret for signature generation | Secret string | Optional |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID for the Sign-In button | `*.apps.googleusercontent.com` | Optional |

### Security Practices
- **No Hardcoded Secrets**: All credentials, tokens, and database connection strings are excluded from Git via `.gitignore`.
- **Environment Isolation**: Production secrets are managed securely within the Vercel and Render deployment dashboards.
- **CSRF & Spoofing Defense**: The backend rejects spoofed user headers (`x-user-id`) and validates identity exclusively via signed HttpOnly session cookies.

---

## 10. Database Architecture & Currency Handling

### Dual-Engine Database Design
Roamly utilizes a hybrid persistence tier designed for cloud deployment and offline test isolation:

1. **Production (Neon PostgreSQL)**:
   - Hosted on Neon Serverless PostgreSQL with connection pooling (`pg.Pool`).
   - Handles multi-user relational data with foreign key cascading and transactions.
2. **Local Development & Testing (Native SQLite)**:
   - Uses Node.js 24 native `node:sqlite` (`DatabaseSync`).
   - Enabled with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and foreign key enforcement (`PRAGMA foreign_keys = ON;`).
   - Operates with zero native C++ compiler dependencies.

### Currency System
- **INR Default**: Indian Rupee (INR, ₹) is the default currency across all views, trip forms, stop costs, and budget calculations.
- **Indian Numbering Formatting**: Formatted via `Intl.NumberFormat('en-IN')` to display authentic numbering groupings (e.g., `₹2,66,000`, `₹1,28,250`).
- **Multi-Currency Support**: Preserved support for `USD`, `EUR`, `GBP`, `JPY`, `CAD`, and `AUD`.
- **Budget Tier Classifications**: Destination budget levels are displayed with Rupee symbols (`₹ Budget`, `₹₹ Moderate`, `₹₹₹ Luxury`).

### USD-to-INR Migration Script
A dedicated, transactional migration script is provided at `backend/src/scripts/migrateUsdToInr.js`:
- **Documented Conversion Rate**: Uses a documented, chosen rate of **₹95 = $1**.
- **Idempotency Guard**: Tracks execution in a persistent `schema_migrations` table; cannot double-convert.
- **Atomic Rollback**: Executes updates inside a database transaction (`BEGIN` ... `COMMIT`), rolling back completely on error.
- **Strict Currency Filter**: Only converts records where `currency = 'USD'`. Non-USD records (`EUR`, `INR`, etc.) are preserved.
- **Zero-Cost Preservation**: Zero-cost stops ($0) convert to exactly ₹0.

> [!NOTE]
> **Production Status:** The migration script and its test suite have been built, thoroughly tested, and verified via read-only dry-run preview. **The script has not yet been executed against the live production Neon database.**

---

## 11. Testing & Verification

Roamly includes an automated test suite verifying functional requirements, security boundaries, group workflows, and data integrity:

### Test Suites Overview

| Test Suite | File Path | Scope & Assertions | Assertions |
|---|---|---|:---:|
| **API End-to-End** | `backend/test/api_test.js` | Routing, destinations catalog, trips CRUD, bookmarks, likes, comments, author aggregations, and disk persistence | 33 |
| **Auth & Security** | `backend/test/auth_security_test.js` | Google OAuth token verification, session cookies, IDOR/BOLA protection, spoofing rejection, and CSRF origin gates | 33 |
| **Trip Privacy** | `backend/test/trip_privacy_test.js` | Public/Unlisted/Private isolation, 32-char share token validation, uniform 404 leak prevention, and feed filtering | 42 |
| **Group Trips** | `backend/test/group_trip_test.js` | Alphanumeric invite codes (`ROAM-XXXX`), dynamic QR generation, member roles, invite rotation, and rate limiting | 53 |
| **Trip Media** | `backend/test/trip_media_test.js` | Signed Cloudinary upload authorization, size/duration caps, photo/video isolation, and companion permissions | 36 |
| **Currency Migration** | `backend/test/currency_migration_test.js` | ₹95 conversion math, stops sum equality, $0 preservation, repeat execution idempotency, rollback, and INR defaults | 15 |

### Running the Tests
Execute the suites individually or sequentially:
```bash
cd backend
npm run test:api
npm run test:security
npm run test:privacy
npm run test:groups
npm run test:media
npm run test:currency
```

### Latest Reported Verification
The latest automated verification reported:
- **212 / 212 passing automated backend tests** across all six test suites.
- **Frontend Code Quality**: Oxlint static analysis passing across all 38 files (0 errors).
- **Frontend Production Build**: Vite production client bundle compiled in under 2 seconds (0 errors).

*(Reported as the latest verification run; individual local environments may vary based on Node.js versions and dependencies).*

---

## 12. Deployment Architecture

Roamly is deployed across specialized cloud infrastructure:

- **Frontend Hosting (Vercel)**:
  - **URL**: [https://roamly-ruby.vercel.app](https://roamly-ruby.vercel.app)
  - Configured via `frontend/vercel.json` with reverse-proxy rewrites routing `/api/:path*` to the Render backend service.
  - Catch-all SPA rewrite (`/:path* -> /index.html`) ensures direct deep linking to routes like `/trips/:id` and `/trips/join`.
- **Backend API Hosting (Render)**:
  - **URL**: `https://roamly-ax2g.onrender.com`
  - Node.js Express web service running in production mode.
  - Native integration with the Neon PostgreSQL connection pool.
- **Database (Neon Serverless PostgreSQL)**:
  - Serverless PostgreSQL instance hosted in AWS `ap-southeast-1`.
  - Pooled connections via `pg.Pool` with SSL encryption.

---

## 13. Limitations & Future Roadmap

- **Production Currency Migration**: The USD-to-INR database migration script is tested and dry-run verified, ready for execution on the production database.
- **Live AI Integration**: The Smart Search and Smart Memories interfaces are currently concept prototypes with sample queries and previews; connecting live LLM inference (e.g., Google Gemini API) is slated for the next phase.
- **Caching Layer**: Introducing Redis caching for high-traffic destination catalog browsing to reduce database round-trips.

---

## 14. Author & Project Information

- **Developer**: **Shiv Upadhyay**
- **Project**: Roamly Travel Discovery & Planning Platform
- **Assignment**: Full Stack Developer Internship Technical Assignment (Rewamp Digital)
- **GitHub Repository**: [https://github.com/Shiv27Upadhyay/Roamly](https://github.com/Shiv27Upadhyay/Roamly)
- **Live Website**: [https://roamly-ruby.vercel.app/](https://roamly-ruby.vercel.app/)
- **Demo Video**: [https://drive.google.com/file/d/1iK21h2vJ4z_-nazSUFWEC1W4dzz_OyK0/view?usp=sharing](https://drive.google.com/file/d/1iK21h2vJ4z_-nazSUFWEC1W4dzz_OyK0/view?usp=sharing)
- **License**: ISC
