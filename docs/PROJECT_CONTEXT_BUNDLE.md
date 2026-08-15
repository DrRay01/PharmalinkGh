# PharmaLink GH — Project Context Bundle

**Purpose of this file:** a single, self-contained brief of the system's purpose, architecture, features, testing performed, and known gaps — written so it can be uploaded to a Claude.ai (web) conversation or Project and used as the source material to generate: Project Documentation, an SRS, a Testing Report, a Technical Debt Plan, and a User Manual.

This is a snapshot as of the current build. It was compiled from the actual codebase and from a working session that implemented, tested, and fixed the features described below (see "Development & Testing Log").

---

## 1. System Overview

**Name:** PharmaLink GH
**One-line pitch:** An emergency medication / out-of-stock locator network for Ghana — patients search for a drug, see which nearby pharmacies actually have it in stock right now, and place a time-boxed hold; pharmacies manage their own inventory and reservation queue; the Pharmacy Council of Ghana (PCG) accredits pharmacies and oversees the network.

**Problem it solves:** In Ghana, patients (especially for emergency/critical medication) often have to physically call or visit multiple pharmacies to find one that has a specific drug in stock. PharmaLink GH centralizes real-time stock visibility across a network of accredited pharmacies, with a 2-hour reservation ("hold") mechanism so a patient can secure stock before traveling to collect it.

**Three user roles (actors):**
1. **Patient / Carer** — searches medicines, views stocking pharmacies, calls/WhatsApps a pharmacy directly, places/cancels/tracks 2-hour holds. Can browse and call as a guest without an account; must register/sign in to place a hold.
2. **Pharmacist** — represents one accredited pharmacy. Registers the pharmacy for PCG accreditation, manages that pharmacy's drug inventory and stock levels, reviews and actions the incoming reservation queue (approve/decline/mark dispensed).
3. **PCG Inspector (Admin)** — a single fixed, non-self-registering account representing the Pharmacy Council of Ghana. Approves/suspends pharmacy accreditation, manages the master FDA drug register, views all platform users and can remove accounts, views all reservations/holds platform-wide, and reviews a system audit trail.

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript, built with Vite 6 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | `motion` (Framer Motion successor) |
| Icons | `lucide-react` |
| Backend / data | Firebase (Firebase JS SDK v12) — Firestore (document database) + Firebase Auth |
| State management | Custom hand-rolled store (`src/services/store.ts`) — a singleton class with a pub/sub `listeners` map, **not** Redux/Zustand/Context. Components subscribe via `store.subscribe(event, callback)`. |
| Persistence strategy | **Local-first, cloud-synced**: every mutation writes to an in-memory field + `localStorage` immediately (so the UI is instant and works offline), and separately best-effort writes to Firestore via `setDoc`/`updateDoc`/`deleteDoc`. Firestore is also subscribed to via `onSnapshot` per collection, so changes from other devices/tabs propagate back down into local state. |
| Misc libraries | `canvas-confetti` (celebratory UI moment on successful dispense/reservation) |

**No server/backend of its own** — the React app talks directly to Firebase from the browser. There is no custom API layer, no Cloud Functions currently deployed, and no separate database server.

### Directory structure (relevant parts)
```
src/
  App.tsx                  — root component, role-based view switching, welcome gateway gating
  main.tsx
  types.ts                 — all TypeScript domain types (see §4)
  data/seedData.ts          — seed/demo catalogue: pharmacies, medicines, inventory, localities
  services/
    store.ts                — the entire business/data layer (singleton class, ~1000 lines)
    firebase.ts              — Firebase app/auth/firestore init + auth helper functions
  utils/
    geo.ts                   — Haversine distance, currency formatting, time formatting, WhatsApp link builder
    image.ts                 — client-side image resize/compress to a JPEG data URL (for photo uploads)
    colors.ts                — deterministic category → accent-color mapping for card UI variety
  components/
    WelcomeGateway.tsx        — full-page landing/gateway shown to unauthenticated visitors
    AuthModal.tsx             — sign-in / 2-step registration wizard
    Navbar.tsx, LogoutConfirmModal.tsx, ToastContainer.tsx
    PatientView.tsx, HeroSearch.tsx, PharmacyCard.tsx, PharmacyDetailModal.tsx, ReserveModal.tsx, PrescriptionViewerModal.tsx, CountdownTimer.tsx
    PharmacistDashboard.tsx
    AdminDashboard.tsx
    icons/WhatsAppIcon.tsx
firestore.rules             — Firestore security rules
firebase-config.json  — Firebase web app config (project: gifted-shape-d9v0l)
```

### Data flow pattern
1. UI component calls a method on the `store` singleton (e.g. `store.createReservation(...)`).
2. `store` mutates its in-memory array, persists to `localStorage`, and calls `this.emit(event, data)`.
3. Every subscribed component re-renders via its `useEffect(() => store.subscribe(...), [])` hook.
4. `store` also fires a best-effort Firestore write (wrapped in try/catch; failures only log a warning, they never block the UI).
5. Firestore `onSnapshot` listeners (set up once in `initFirestoreSync()`) push any remote changes back into the same local state + emit cycle, so other tabs/devices converge.

This "local-first" design is deliberate: the app remains fully usable even if Firestore writes fail (which, as of this snapshot, they were for the `users` collection specifically — see §6).

---

## 3. Firebase Project Configuration

- **Project ID:** `gifted-shape-d9v0l`
- **Firestore database ID:** `ai-studio-pharmalinkgh-ca612136-f36f-4742-bbb9-8f1925edf0ca` (a named, non-default database — the project appears to have been provisioned via Google AI Studio's Firebase integration)
- **Billing:** Blaze (pay-as-you-go) plan
- **Auth providers wired in code:** Google Sign-In (`signInWithPopup`) and Email/Password (`signInWithEmailAndPassword` / `createUserWithEmailAndPassword`)
- **Collections:** `users`, `medicines`, `pharmacies`, `inventory`, `reservations`, `auditLogs`
- **Auto-seeding:** on first load, if Firestore's `medicines` collection is empty, the app batch-writes the entire seed dataset (medicines, pharmacies, inventory, reservations) into Firestore. `INITIAL_USERS` is intentionally an empty array — there are no pre-seeded demo accounts; real accounts are created through registration only, except a single hardcoded PCG Inspector admin account (see §5.3).

---

## 4. Data Model

```ts
type UserRole = 'patient' | 'pharmacist' | 'admin';

interface User {
  uid: string; email: string; name: string; phone: string; role: UserRole;
  pharmacyId?: string;      // set for pharmacists — links to their Pharmacy
  pharmacyName?: string;
  avatar?: string;
}

type PharmacyStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';

interface Pharmacy {
  id: string; name: string; licenseNumber: string;
  superintendentName: string; superintendentPin: string;
  region: string; locality: string; address: string;
  phone: string; emergencyPhone?: string;
  coordinates: { lat: number; lng: number };
  status: PharmacyStatus; isVerified: boolean; // isVerified is kept in sync with status === 'APPROVED'
  openingHours: string; is24Hours: boolean; rating: number;
  image?: string;           // optional storefront photo, uploaded at registration
  createdAt: string;
}

interface Medicine {
  id: string; brandName: string; genericName: string;
  category: string;         // free-form — pharmacists can create new categories
  therapeuticClass: string; dosageForm: string; strength: string; description: string;
  prescriptionRequired: boolean; ghanaFdaRegNo: string; isEmergencyCritical: boolean;
  commonIndications: string[]; image?: string;
}

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

interface InventoryItem {
  id: string; pharmacyId: string; medicineId: string;
  status: StockStatus; quantity: number; unitPriceGHS: number;
  lastUpdatedAt: string; batchNumber?: string; expiryDate?: string;
}

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COLLECTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

interface Reservation {
  id: string; reservationCode: string;      // e.g. "PL-4821"
  patientUid: string; patientName: string; patientPhone: string;
  pharmacyId: string; pharmacyName: string; pharmacyPhone: string; pharmacyAddress: string;
  medicineId: string; medicineName: string; genericName: string; dosageForm: string;
  quantity: number; unitPriceGHS: number; totalPriceGHS: number;
  prescriptionImageUrl?: string; prescriptionFileName?: string;
  status: ReservationStatus;
  createdAt: string; expiresAt: string;       // 2 hours after createdAt
  rejectionReason?: string; collectedAt?: string; notes?: string;
}

interface AuditLog {
  id: string; timestamp: string; actorName: string; actorRole: UserRole;
  action: string; details: string;
}
```

---

## 5. Feature Inventory (by role)

### 5.1 Anonymous visitor / Welcome Gateway
- On first load with no logged-in user, a full-page **Welcome Gateway** is shown: fixed background photo, three role cards (Patient/Carer, Pharmacist, PCG Inspector) each with Sign In (and Register, except the Inspector), and a "Continue as Guest" path straight into search.
- The gateway does not reappear after an explicit logout in the same session (tracked via a `hasEnteredApp` flag) — logging out returns you to guest browsing, not back to the landing screen.

### 5.2 Patient / Guest
- **Search**: by brand or generic name, category filter chips (dynamically derived from whatever categories exist in the catalogue, including pharmacist-created ones), "Emergency Critical Only" toggle, popular-search suggestions.
- **Medicine grid**: each medicine card shows packaging photo, FDA registration number, category, and a colored top-border accent unique per category (deterministic hash → 8-color palette) so a grid of many cards doesn't look uniform.
- **Seller/pharmacy results**: for the selected medicine (or all matching medicines), lists every stocking pharmacy sorted by distance (Haversine, from a manually selected "simulated location" — patients only, hidden for pharmacist/admin) or price. Each card shows stock level, PCG-verified badge, distance, and a left-border accent colored by stock status.
- **Guest restrictions**: guests (no account) can browse, view pharmacy detail (address, hours, license), **call** (`tel:` link) and **WhatsApp** (`wa.me` deep link, prefilled message) any pharmacy directly — but attempting to place a hold prompts a sign-in requirement instead of opening the reservation flow. Only pharmacies with `status === 'APPROVED'` appear in search results.
- **Reservation ("Hold")**: signed-in patients can place a 2-hour hold on an in-stock item — choose quantity, contact phone, optional notes, and optionally upload a prescription photo (compressed client-side). A reservation code (e.g. `PL-4821`) and a countdown timer are shown; a confetti animation fires on success.
- **My Holds**: a dedicated tab lists the patient's own reservations with live countdown, status badges (Pending/Confirmed/Collected/Expired/Rejected/Cancelled), a Cancel action (while Pending/Confirmed), a "Get Directions" link to Google Maps, and a prescription-document viewer if one was attached.
- **Logout confirmation**: if the patient has active holds, logging out shows a dedicated modal offering to either keep the holds active or release them before signing out.

### 5.3 Pharmacist
- **Registration is a 2-step wizard** (not a single form): Step 1 — personal details (name, email, phone, password). Step 2 — pharmacy details (facility name, PCG license number, superintendent PIN, locality, street address) plus an **optional photo upload** (client-side resized/compressed to a JPEG data URL, capped ~900px, quality 0.72) with Back/Next navigation and a progress indicator.
- On submission the pharmacy is created with `status: 'PENDING'` and the pharmacist is immediately signed in but sees a **"Application Under PCG Review"** gate screen (not the operational dashboard) until an inspector approves it. A suspended pharmacy shows a corresponding "License Suspended" screen instead.
- Once **APPROVED**, the full dashboard unlocks:
  - **KPI banner**: active holds, dispensed-today count, low-stock item count, dispensary value.
  - **Reservation queue** ("Patient Reservation Holds"): filterable by Active/Fulfilled/All History; each row shows patient contact, a live "stock left" badge (colored by current inventory level) or "Picked Up" once collected, prescription viewer if attached, and status-colored left-border accent. Actions: **Approve Hold**, **Decline** (with a required reason, via modal), **Mark Dispensed & Collected** (this is the point at which inventory quantity is actually decremented — see §7 for the implication).
  - **Inventory ("Pharmacy Inventory Catalog")**: a table of everything the pharmacy stocks, with a click-to-cycle stock-status pill (In Stock → Low Stock → Out of Stock), quantity, unit price, last-updated time, a status-colored left-border row accent, and a per-row **delete** (remove from shelf) button with confirmation.
  - **Add Drug modal**: toggles between "Existing Catalogue Drug" (pick from the shared master list and stock it) and "**Register New Drug**" (brand/generic name, a free-text category field with autocomplete suggestions from existing categories — so pharmacists can create entirely new categories — dosage form, strength, optional FDA reg. no., prescription-required / emergency-critical checkboxes). Registering a new drug adds it to the shared catalogue *and* stocks it at this pharmacy in one step.
- Pharmacists do not see the location-simulation control in the navbar (patient-only).

### 5.4 PCG Inspector (Admin)
- **No self-registration exists for this role.** A single fixed account is hardcoded in `store.ts` (`inspector@pharmacycouncil.gov.gh`) with a fixed password constant; login checks this pair before touching Firebase/local lookup at all. The Welcome Gateway's PCG Inspector card only offers "Sign In" (no Register button), with a note that it's a fixed-credential account.
- **Dashboard tabs:**
  - **Pharmacy Accreditation Queue**: every registered pharmacy, searchable and filterable by status (Pending/Approved/Suspended). Each card is left-border/background-tinted by status (green=approved, amber=pending, rose=suspended), shows license/superintendent/PIN/contact/address, an expandable live inventory inspection panel, the **registering pharmacist's own contact details** (name/email/phone, cross-referenced from the Users list), and an **Approve Pharmacy** / **Suspend / Revoke Sales** action depending on current status.
  - **Platform Users**: every registered patient/pharmacist (search by name/email/pharmacy), with role, contact info, associated pharmacy if any, and a **Delete** action (with confirmation) — deleting a pharmacist also automatically suspends their pharmacy.
  - **All Holdings**: every reservation on the platform, filterable by status, showing code/patient/medicine/pharmacy/quantity/total/status/created time.
  - **Master Drug Register**: the full shared medicine catalogue with a "Register FDA Drug" creation modal.
  - **Audit Trail**: a chronological feed of system events (registrations, approvals/suspensions, reservations, stock changes, deletions) logged automatically by the store on every meaningful mutation.
- **KPI banner**: verified pharmacy count, pending-accreditation count, catalogue size, fulfillment efficiency (% of reservations reaching COLLECTED), registered user count, active-holdings count.

---

## 6. Firebase Auth & Firestore — current configuration state

This is important context for both the Testing Report and the Technical Debt Plan:

- **Email/Password Auth provider was disabled** in the Firebase Console for this project as of this snapshot (every `signInWithEmailAndPassword`/`createUserWithEmailAndPassword` call fails with `auth/operation-not-allowed`). Google Sign-In works.
- Because of this, `store.ts` has a **local-fallback mode**: when the Auth provider genuinely can't be reached, registration/login fall back to a client-side account directory (`localStorage` + best-effort Firestore mirror) instead of a real Firebase Auth session.
- **`firestore.rules` originally required an authenticated session (`request.auth != null`) to write to the `users` collection**, while every other collection (`medicines`, `pharmacies`, `inventory`, `reservations`, `auditLogs`) was fully open (`allow write: if true`). Since the local-fallback path never has a real `request.auth` session, this meant **new user accounts were silently failing to persist to Firestore** — they only survived in the browser that created them, so a fresh session/device could never find a previously "registered" account. This was found, diagnosed, and fixed in code (rule loosened to match every other collection) — **the fix still needs to be deployed/published** via the Firebase Console (or CLI) to take effect on the live project.
- A related security issue was found and fixed in the same session: `loginUser`'s fallback originally triggered on *any* Firebase Auth error, including a genuine "wrong password" rejection — which, once the Auth provider is enabled, would have let anyone in with a correct email and *any* wrong password. This was tightened so the fallback only fires for genuine provider-unavailability errors (`auth/operation-not-allowed`, `auth/network-request-failed`, etc.), not real credential rejections.
- **Outstanding action items for whoever owns the Firebase project:**
  1. Enable the Email/Password sign-in provider (Console → Authentication → Sign-in method).
  2. Publish the corrected `firestore.rules`.
  3. Once both are live, verify a full registration → logout → fresh-session login round trip actually authenticates through Firebase (not the local fallback).
  4. Only after (3) is confirmed, consider tightening rules further to `request.auth != null` / per-document ownership — doing this before (3) is confirmed would break account creation entirely.

---

## 7. Development & Testing Log (this build cycle)

Testing in this project has been manual/exploratory, driven end-to-end through a real, running instance of the app in a headless Chromium browser (Playwright), not an automated test suite (there is currently **no automated test file in the repo** — see Technical Debt).

**Scenarios exercised and confirmed working, across multiple passes:**
- Fresh load → Welcome Gateway (no logged-in user by default); "Continue as Guest" → search flow.
- Guest search: results correctly exclude non-approved pharmacies; category/stock-status card accents render distinctly; Call/WhatsApp links present on pharmacy cards and detail modal; attempting to reserve as a guest correctly opens the sign-in modal instead of the reservation flow.
- Full pharmacist onboarding: 2-step registration wizard (Next/Back navigation, step validation, photo upload with live preview) → pending-review gate screen shown immediately after registration → admin signs in with fixed credentials → Accreditation tab shows the new pharmacy with correct pending badge and the registering pharmacist's contact info → **Approve Pharmacy** → pharmacist signs back in (fresh browser session) → full operational dashboard unlocked (confirms Firestore-backed cross-session persistence works for pharmacies/inventory, independent of the `users`-collection Auth gap above).
- Pharmacist drug management: "Register New Drug" with a brand-new free-text category → drug appears in inventory with the new category and a "Stock left" indicator on any related reservation; delete-from-inventory removes it from the shelf.
- Admin: Users tab lists registered accounts and supports delete (confirmed deleting a pharmacist also suspends their pharmacy); Holdings tab lists reservations platform-wide with status filtering.
- Registration/login hardening: registering the same email twice is now blocked with a clear "already exists" message (previously would have silently created a duplicate/divergent account once real Auth is enabled); a failed Firebase Auth signup rolls back any pharmacy record that was already written, avoiding an orphaned accreditation-queue entry.
- Full TypeScript typecheck (`npm run lint`, which runs `tsc --noEmit`) passes clean after every change described in this bundle.

**Bugs found during this testing and fixed:**
1. **Infinite render loop** in the sign-out confirmation modal (`LogoutConfirmModal.tsx`) — a derived array (`activeHolds`) was recomputed as a new reference on every render and used as a `useEffect` dependency, so the effect's own `setState` retriggered itself indefinitely. Fixed by memoizing the derivation. This only manifested when a signed-in user actually opened the sign-out confirmation dialog (guest-only flows never hit it), which is why it wasn't caught until the full sign-out path was exercised.
2. **Examiner Role Switcher mislabeling**: a quick-switch UI (since removed entirely) hardcoded "Adabraka Care" / "East Legon Meds" as the only two possible pharmacist labels, so any newly-registered pharmacist was mislabeled with one of those two names regardless of their real pharmacy.
3. **Login bypass / registration duplicate-account risk** — see §6.
4. A greeting-text bug where a pharmacist's title prefix ("Pharm.") was mistakenly extracted as their "first name" via a naive `name.split(' ')[0]`.
5. Pending Firestore write failures for the `users` collection were being silently swallowed (`console.warn`, not surfaced) — masking the root cause described in §6 until it was specifically investigated.

**Data hygiene note (not a code bug):** a duplicate `pharma-01` + `med-08` inventory document was observed live in Firestore, producing a harmless React "duplicate key" console warning. This predates the current build cycle and was not something this cycle wrote — flagged but not touched, since deleting the wrong copy of live data would be worse than leaving a console warning.

---

## 8. Known Gaps / Technical Debt

Grouped by theme, most consequential first:

**Correctness gaps in the core reservation flow**
- Placing a hold does **not** decrement available stock at creation time — only `updateStockStatus`/quantity change happens on `COLLECTED`. Multiple patients can place holds that collectively exceed physical stock; nothing reserves the quantity between PENDING/CONFIRMED and pickup.
- Reservation expiry (`checkAndExpireReservations`) only runs client-side, triggered by a page load/read. If no one opens the app, an expired hold never flips to `EXPIRED` and never frees its (nominal) stock. Needs a server-side scheduled job (e.g., a Firebase Cloud Function on a cron trigger) for reliability.
- No duplicate-hold prevention — a patient can stack multiple simultaneous holds on the same drug at the same pharmacy.
- No duplicate-pharmacy detection beyond the license-number check added this cycle (no check on, e.g., same address/phone).

**Prescription enforcement**
- `Medicine.prescriptionRequired` exists but is **not enforced** — `ReserveModal` lets a reservation go through for a prescription-required drug with no uploaded image (it silently substitutes a placeholder filename string). A patient can currently hold/collect a prescription drug without ever supplying a prescription.

**Notifications**
- Everything is in-app toast only — no email/SMS when a hold is confirmed/rejected/about to expire, or when a pharmacy is approved/suspended. Easy to miss if the user isn't looking at the screen at that moment.
- No "notify me when back in stock" subscription for out-of-stock drugs, despite that being close to the product's core premise.

**Pharmacist operational depth**
- No way to edit an existing inventory item's exact quantity/price — only a 3-way status cycle or delete-and-re-add.
- No pharmacy profile editing after registration (address/hours/phone are frozen at signup).
- One user account per pharmacy — no concept of multiple dispensing staff under one pharmacy.
- `batchNumber`/`expiryDate` exist on `InventoryItem` but are never captured through any UI.

**Admin/PCG depth**
- No pharmacy license expiry/renewal tracking.
- No way to edit pharmacy details post-registration (only approve/suspend) — can't correct a typo in a submitted license number without going around the app.
- Single fixed admin account only — no multi-inspector / regional-inspector roles (acceptable for this build's scope, worth flagging as a known simplification).
- No trend/analytics view (most-requested emergency drugs, regional stockout patterns).

**Patient depth**
- `Pharmacy.rating` is a static seed value — not driven by real patient reviews; there is no review/rating submission feature.
- No saved/favorite pharmacies.
- "Location" is a manual dropdown of preset Ghanaian localities (`GHANAIAN_LOCALITIES`) rather than real browser geolocation; distance is straight-line Haversine, not real driving distance/time.

**Engineering solidity**
- **No automated test suite** — zero unit/integration test files in the repo. All verification to date has been manual/exploratory browser testing (see §7).
- No React error boundary anywhere — an uncaught exception in any one component currently takes down the whole app.
- The Firebase Auth/Firestore-rules gap described in §6 is not yet resolved on the live project (code-side fix is done; deployment/Console steps are outstanding, owned by the project maintainer).
- No offline/PWA handling (service worker, cache-first strategy) despite the "emergency access" framing of the product.
- No pagination/virtualization on medicine/pharmacy lists — fine at current seed-data scale, would degrade at real-world scale.

**Data/compliance**
- Ghana FDA registration numbers and PCG superintendent PINs are free-text fields, never validated against a real external registry — an accepted simplification for this build, worth calling out explicitly in documentation aimed at examiners/reviewers.
- No Terms of Service / Privacy Policy page.

---

## 9. Suggested prompts to use once this bundle is uploaded to Claude.ai

Copy-paste starting points — attach this file (and ideally `src/types.ts` and `src/services/store.ts` for extra fidelity) to a Claude.ai Project, then use:

- **Project Documentation:** *"Using the attached project bundle, write a Project Documentation report covering: system overview, objectives, tech stack and architecture, module breakdown, and setup/run instructions. Target audience: an academic examiner reviewing an MSc software engineering project."*
- **SRS (Software Requirements Specification):** *"Using the attached bundle's actor list (§1) and feature inventory (§5), write a formal SRS document following a standard IEEE-830-style structure: introduction/purpose/scope, overall description, actors and their goals, functional requirements grouped by actor (numbered, e.g. FR-PAT-01), non-functional requirements (performance, security, usability, reliability — informed by §6 and §8), and system constraints/assumptions."*
- **Testing Report:** *"Using §7 of the attached bundle, write a Testing Report: testing approach/methodology used, environment, the scenarios exercised (organize as a test-case table with Given/When/Then or Steps/Expected/Actual), the bugs found and how each was fixed, and an honest statement of current test coverage limitations (referencing the 'no automated test suite' item in §8)."*
- **Technical Debt Plan:** *"Using §8 of the attached bundle, write a Technical Debt Plan: group each item by severity/priority (Critical/High/Medium/Low), give a one-paragraph impact statement per item, a proposed remediation approach, and a rough effort estimate. Present as a table plus narrative."*
- **User Manual:** *"Using §5 of the attached bundle, write an end-user manual with three sections — one per role (Patient/Carer, Pharmacist, PCG Inspector) — written in plain, task-oriented language ('To place a hold, do X, then Y'), including what each role can and cannot do, and a short FAQ/troubleshooting section at the end."*
