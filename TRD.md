# Technical Requirement Document — ExampleHR Time-Off Frontend

**Author:** Senior Frontend Engineer  
**Date:** 2026-04-26  
**Stack:** Next.js 15 (App Router) · TypeScript · TanStack Query v5 · Zustand v5 · Tailwind CSS v4 · Storybook 10 · Vitest · Playwright · MSW v2

---

## 1. Problem Statement

ExampleHR's Time-Off module must present leave balances and manage request workflows while the authoritative data lives in a third-party HCM (e.g., Workday or SAP). This creates three irreconcilable tensions:

1. **Speed vs. Correctness** — Users expect instant feedback, but the HCM is the only truth.
2. **Isolation vs. Freshness** — Balances can change outside ExampleHR (anniversary bonuses, year-reset). Any cached view can be stale within seconds.
3. **Optimism vs. Safety** — Optimistic UI is table stakes for perceived performance; but showing "Approved" and then walking it back is a trust-destroying UX failure.

The frontend must resolve all three without exposing the complexity to users.

---

## 2. Core Challenges

### 2.1 Balance Staleness
HCM mutates balances asynchronously:
- Work-anniversary bonus (any time, fires server-side)
- Year-reset (batch, at midnight)
- Manager approvals (could be processed in any HCM client, not just ExampleHR)

### 2.2 Silent HCM Failures
The HCM *usually* returns a clear error on insufficient balance or invalid dimension. But not always. A `200 OK` from HCM is not a guarantee the write was accepted. The frontend must treat every "success" as provisional until reconciled.

### 2.3 In-Flight Conflict
A background refresh can arrive while the user is mid-request — after optimistic decrement but before HCM confirmation. Applying the refresh naively would corrupt the displayed balance.

### 2.4 Per-Employee Per-Location Balances
A single employee may hold balances across multiple locations (`employeeId × locationId`). The UI must render a matrix, not a single number.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Next.js App Router                  │
│                                                     │
│  /employee  ──► EmployeeView (React Server → Client)│
│  /manager   ──► ManagerView  (React Server → Client)│
│                                                     │
│  /api/hcm/*  ──► Mock HCM Route Handlers            │
│                  (in-memory state, simulates HCM)   │
└────────────────────────┬────────────────────────────┘
                         │ fetch
┌────────────────────────▼────────────────────────────┐
│              Data Layer (Client-Side)                │
│                                                     │
│  TanStack Query  ──  cache, optimistic, polling     │
│  Zustand store   ──  in-flight mutation registry    │
│  API module      ──  typed fetch wrappers           │
└─────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                 UI Component Tree                    │
│                                                     │
│  BalanceTable → BalanceRow → StaleIndicator         │
│  RequestForm  → OptimisticStatus                    │
│  RequestCard  → ApproveButton / DenyButton          │
│  ReconciliationBanner                               │
└─────────────────────────────────────────────────────┘
```

---

## 4. Data Model

```typescript
// Identifies a unique balance cell
interface BalanceKey { employeeId: string; locationId: string }

interface Balance extends BalanceKey {
  available: number;       // days remaining
  pending: number;         // days in-flight (submitted, awaiting approval)
  unit: 'days' | 'hours';
  asOf: string;            // ISO timestamp from HCM
}

type RequestStatus =
  | 'optimistic-pending'   // local-only, HCM not yet confirmed
  | 'pending'              // HCM accepted, awaiting manager
  | 'approved'             // manager approved, HCM deducted
  | 'denied'               // manager denied, balance restored
  | 'rolled-back'          // HCM rejected silently, UI corrected
  | 'hcm-conflict';        // HCM returned conflict on approval

interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  days: number;
  startDate: string;       // YYYY-MM-DD
  endDate: string;
  note?: string;
  status: RequestStatus;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
}
```

---

## 5. API Design (Mock HCM Endpoints)

All endpoints live under `/api/hcm/`. They simulate realistic HCM behaviour including latency, silent failures, and conflict responses.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/hcm/balance?employeeId&locationId` | Real-time single-cell read (authoritative) |
| `GET` | `/api/hcm/balances?employeeId` | Batch read all balances for an employee |
| `POST` | `/api/hcm/requests` | Submit a time-off request |
| `GET` | `/api/hcm/requests?employeeId&status` | List requests (filtered) |
| `PATCH` | `/api/hcm/requests/[id]` | Approve or deny a request |
| `POST` | `/api/hcm/trigger/anniversary` | Fire anniversary bonus (test harness trigger) |

### Simulated Behaviours
- **Random silent failure** (5% of POSTs): returns `200 OK` but does not commit the write.
- **Insufficient balance** (when `days > available`): returns `422` with `{ code: 'INSUFFICIENT_BALANCE' }`.
- **Invalid dimension** (unknown `locationId`): returns `404`.
- **Latency injection**: configurable via `?delay=ms` for Storybook scenarios.
- **Anniversary bonus**: adds 5 days to a random location balance; fires on timer or via trigger endpoint.

---

## 6. State Management Strategy

### 6.1 Why TanStack Query for server state

TanStack Query gives us:
- **Stale-while-revalidate** out of the box — show cached data immediately, refetch in background.
- **Optimistic updates** with built-in rollback (`onMutate` / `onError` / `onSettled`).
- **Background refetching** on window focus, network reconnect, and interval.
- **Deduplication** — concurrent fetches for the same key coalesce.
- **Query invalidation** — after a mutation settles, we invalidate the affected balance key and the batch query.

**Alternative considered: SWR**  
SWR is lighter, but its optimistic update API is more manual. TanStack Query's mutation lifecycle hooks (`onMutate`, `onError`, `onSettled`) map directly to the optimistic-rollback pattern we need. Rejected.

**Alternative considered: Redux Toolkit Query**  
RTK Query is excellent for REST but adds Redux boilerplate. We do not need Redux's global reducer for this scope. Rejected.

### 6.2 Why Zustand for client state

Zustand holds the **in-flight mutation registry** — a map of `{employeeId}-{locationId}` → `{ mutationId, optimisticDelta }`. This is read by the reconciliation logic to detect conflicts between a background refresh and an in-flight optimistic update.

We deliberately keep this *separate* from TanStack Query's cache because it governs *whether* a background sync should be applied, not what the server returned.

**Alternative considered: React Context**  
Context re-renders every consumer on every update. With a table of balances and a polling interval, this causes unnecessary renders. Rejected.

---

## 7. Optimistic Updates vs Pessimistic

### Decision: Optimistic for submission; never optimistic for the *approval* outcome.

| Action | Strategy | Rationale |
|--------|----------|-----------|
| Submit request | Optimistic | User sees balance decrement + "Pending" immediately. If HCM rejects (including silent failure), we roll back and show a clear error banner. |
| Manager approve/deny | Pessimistic | A manager clicking "Approve" must see the live balance at that moment. We fetch a fresh single-cell balance immediately before rendering the decision UI. |
| Background anniversary bonus | Non-destructive reconciliation | We never silently overwrite a balance while a mutation is in-flight. We show a "Balance updated" banner and let the user acknowledge. |

**Why not fully pessimistic?**  
The HCM can be slow (1–3 s typical). A pessimistic submission flow would hold the user on a spinner through the full round-trip, which is unacceptable for a high-frequency action like requesting PTO. The risk of an optimistic mis-fire is mitigated by the rollback UX.

**Why not fully optimistic (including approval)?**  
Managers approving stale data is a business risk — they might approve a request against a balance that has since been consumed. The extra cost of a fresh fetch at decision time is worth the accuracy guarantee.

---

## 8. Cache Invalidation Strategy

```
┌─── On mount ────────────────────────────────────────────┐
│  Fetch batch /api/hcm/balances (hydrate all cells)      │
└──────────────────────────────────────────────────────────┘
┌─── On window focus ─────────────────────────────────────┐
│  TanStack Query auto-refetches stale queries             │
│  staleTime = 30 000 ms                                   │
└──────────────────────────────────────────────────────────┘
┌─── Background poll (30 s interval) ─────────────────────┐
│  Batch fetch → diff against cache                        │
│  If diff exists AND no in-flight mutation → apply silently│
│  If diff exists AND in-flight mutation → queue banner    │
└──────────────────────────────────────────────────────────┘
┌─── After mutation settles ──────────────────────────────┐
│  Invalidate ['balance', employeeId, locationId]          │
│  Invalidate ['balances', employeeId]                     │
│  Invalidate ['requests', employeeId]                     │
└──────────────────────────────────────────────────────────┘
```

**staleTime = 30 s** is chosen to balance freshness and API cost. A balance is unlikely to change in under 30 seconds under normal conditions; anniversary bonuses are exceptional.

---

## 9. Reconciliation with In-Flight Actions

The in-flight registry in Zustand tracks which balance cells have a pending optimistic mutation. When the background poller computes a diff:

```
if (inFlightRegistry.has(balanceKey)) {
  // Don't apply refresh. Queue a reconciliation banner.
  // Banner resolves after mutation onSettled fires.
} else {
  // Apply silently. The user may see a "Balance updated" toast.
}
```

This prevents the following bug: user submits a 3-day request → optimistic decrement → background poll returns the old balance (before HCM processes the request) → the decrement is overwritten → user sees stale number → HCM later confirms → another update → two jarring flickers.

---

## 10. Component Tree & Concerns

```
EmployeeView
  ├── ReconciliationBanner          (reads: Zustand pendingBanners)
  ├── BalanceTable
  │   └── BalanceRow × N           (reads: balance per key)
  │       └── StaleIndicator       (reads: balance.asOf vs now)
  └── RequestForm
      └── OptimisticStatus         (reads: request status from Zustand)

ManagerView
  ├── RequestCard × N              (reads: request list)
  │   ├── LiveBalanceDisplay       (fetches fresh balance on render)
  │   ├── ApproveButton            (mutation: pessimistic)
  │   └── DenyButton               (mutation: pessimistic)
  └── ReconciliationBanner
```

Each leaf reads from a *single* source. `BalanceRow` never reads request state. `RequestCard` never reads the full balance list. This keeps re-renders surgical.

---

## 11. Testing Strategy

### 11.1 What each layer guards

| Layer | Tool | Guards |
|-------|------|--------|
| UI state matrix | Storybook Interaction Tests | Every visual state is reachable and renders correctly |
| Component behaviour | Vitest + RTL | User interactions, error states, rollback flow |
| Data hooks | Vitest + MSW | Optimistic update, rollback, reconciliation logic |
| End-to-end flows | Playwright | Submit → pending → approve/deny full lifecycle |

### 11.2 Why not mock the HCM in unit tests?

We mock at the *network* level using MSW, not at the module level. This means our tests exercise the actual fetch functions, TanStack Query caches, and Zustand stores — not just the components in isolation. A silent HCM failure or a conflict response will surface in tests exactly as it surfaces in production.

### 11.3 The states matrix (Storybook)

Every `BalanceRow` and `RequestCard` story covers:
- `loading` — skeleton placeholder
- `empty` — no balances for this employee
- `stale` — balance older than 5 minutes, stale badge shown
- `optimistic-pending` — request submitted, balance decremented, spinner
- `optimistic-rolled-back` — HCM rejected, balance restored, error banner
- `hcm-rejected` — explicit insufficient-balance error
- `hcm-silently-wrong` — 200 OK but write not committed, late detection
- `balance-refreshed-mid-session` — anniversary bonus arrived, banner shown
- `manager-conflict` — balance changed between list load and approval click

### 11.4 Regression Guarantee

Storybook interaction tests run in CI via `@storybook/addon-vitest`. Any new code that breaks a rendered state will fail CI. Component tests cover the mutation lifecycle. Integration tests cover the full flow against the live mock server. A contributor cannot silently break the optimistic rollback path because there is an integration test that fires a silent-failure and asserts the rollback renders.

---

## 12. Alternatives Considered (Summary)

| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| State management | TanStack Query + Zustand | Redux, SWR, Jotai | Best optimistic mutation API; Zustand for cross-concern client state |
| Mock API | Next.js Route Handlers | MSW server-mode | Route handlers run in the same dev server; no extra process |
| Storybook framework | `@storybook/nextjs-vite` | `@storybook/nextjs` | Vite-powered, faster HMR |
| Pessimistic vs optimistic | Hybrid (see §7) | Fully one or the other | Neither extreme is correct for both actors (employee vs manager) |
| Polling interval | 30 s | 5 s, 60 s | 5 s is too aggressive for HCM; 60 s risks noticeably stale UI |
| Test network mock | MSW (network-level) | Module mock | Module mocks test the wrong things; MSW exercises real fetch paths |
