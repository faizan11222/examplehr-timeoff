# ExampleHR — Time-Off Frontend

A production-grade Time-Off management interface built as a take-home assessment for Wizdaa.

## Live Deployments

| | Link |
|---|---|
| **App (Vercel)** | https://examplehr-timeoff.vercel.app |
| **Storybook (Chromatic)** | https://69ed2e91158bbe4ae371f685-mfzpyxhrki.chromatic.com |
| **GitHub** | https://github.com/faizan11222/examplehr-timeoff |

---

## Overview

ExampleHR's Time-Off module lets employees submit leave requests and managers approve or deny them, while all authoritative data lives in a third-party HCM (simulated). The core engineering challenges:

- **Optimistic UI** — employee balance decrements instantly; rolls back cleanly if HCM rejects (including silent 200 failures)
- **In-flight conflict protection** — background polls never overwrite a balance while a mutation is in progress
- **Stale data detection** — `StaleIndicator` badges when HCM data is > 5 min old
- **Persistent state across serverless invocations** — Vercel KV backs the mock HCM store in production

Full design rationale and architecture decisions are in [TRD.md](./TRD.md).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Styling | Tailwind CSS v4 |
| Component explorer | Storybook 10 (`@storybook/nextjs-vite`) |
| Unit / hook tests | Vitest 4 + React Testing Library + MSW v2 |
| E2E tests | Playwright |
| Persistent store (prod) | Vercel KV (Redis) |

---

## Mock HCM API

All endpoints live under `/api/hcm/`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/hcm/balance` | Single balance cell (authoritative read) |
| `GET` | `/api/hcm/balances` | All balances for an employee |
| `POST` | `/api/hcm/requests` | Submit a time-off request |
| `GET` | `/api/hcm/requests` | List requests (filterable by status) |
| `PATCH` | `/api/hcm/requests/[id]` | Approve or deny a request |
| `POST` | `/api/hcm/trigger/anniversary` | Fire anniversary bonus (test harness) |

Simulated behaviours: 5% silent failure rate, configurable `?delay=ms` latency, insufficient-balance `422`, invalid-dimension `404`.

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

Two views:
- `/employee` — submit requests, see balance table, reconciliation banners
- `/manager` — approve / deny pending requests with live balance reads

---

## Tests

```bash
npm run test          # unit + hook tests (Vitest)
npm run test:coverage # coverage report
npm run test:e2e      # Playwright end-to-end (requires dev server)
npm run storybook     # interactive component explorer
```

**Unit / hook tests (25 passing):**
- `useSubmitRequest` — optimistic decrement, 422 rollback, silent-failure rollback, success path
- `BalanceTable` — loading / empty / stale / error states
- `RequestForm` — validation guards, insufficient-balance error, submit flow
- `RequestCard` — manager approve / deny interactions

**Playwright E2E:**
- Balance load and display
- Valid submit → pending state
- Overflow guard (cannot submit more days than available)
- Anniversary bonus trigger
- Full submit → approve lifecycle
- Full submit → deny lifecycle with balance restoration
