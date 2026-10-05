# Encore V1.5 Frontend

This is the frontend application for Encore V1.5, built with Next.js 14, React 18, and Tailwind CSS.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **State Management:** Zustand (Client state), TanStack Query (Server state)
- **Styling:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Real-Time:** WebSockets with auto-fallback to SSE & Polling
- **Testing:** Playwright E2E

## Persona Route Groups
- `(customer)` - Customer facing features (Ticketing, Wallet, Waiting Room)
- `(organizer)` - B2B facing features (Dashboard, Inventory Control)
- `(ops)` - Internal Operations (Health telemetry, Flash-sale metrics)

## Environment Variables
Create a `.env.local` file in the root of the project and add the following variables:
```
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## Security
- This frontend enforces strict Content Security Policy (CSP) headers in `middleware.ts`.
- All mutation requests include a cryptographically generated `X-Request-Id` for idempotency and tracing.
- Authentication relies on `HttpOnly` cookies. No JWTs or sensitive tokens are accessible to client-side JS.
