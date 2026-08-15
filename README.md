<div align="center">
<img width="600" alt="PharmaLink GH" src="src/assets/logos/pharmalink-logo-horizontal.png" />
</div>

# PharmaLink GH

Emergency out-of-stock medication locator and 2-hour reservation network for Ghanaian community pharmacies. Patients search for a drug, see which nearby accredited pharmacies actually have it in stock, and place a time-boxed hold. Pharmacies manage their own inventory and reservation queue. The Pharmacy Council of Ghana (PCG) accredits pharmacies and oversees the network from its own admin portal.

## Tech Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4
- Firebase (Firestore + Auth)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

The app connects to Firebase using the config in `firebase-config.json`. The patient/pharmacist-facing app runs at `/`, and the PCG admin console has its own entry point at `/admin`.

## Project Documentation

See [`docs/PROJECT_CONTEXT_BUNDLE.md`](docs/PROJECT_CONTEXT_BUNDLE.md) for a full system overview, architecture, feature inventory, and known limitations.
