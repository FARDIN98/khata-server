# TODOS

Deferred from /plan-eng-review on 2026-04-16 (Khata MVP pre-ship review).

---

## Update-02 phase (post-submission polish → resume-grade)

### Payment robustness
- **Stripe stale-session expiry**
  **What:** When a Grahok re-opens checkout for an already-PAYMENT_PENDING booking, the code creates a new Stripe session and overwrites `stripeSessionId`. The old session is still open in Stripe and can still collect money — but the webhook for it will find no matching booking and silently drop the update.
  **Why:** Real prod risk once users have multiple tabs / refresh patterns. Zero demo risk (single-tab demo).
  **How:** In `bookings.service.ts:createCheckoutSession`, if `existing.stripeSessionId` is set, call `stripe.checkout.sessions.expire(existing.stripeSessionId)` before creating the new one. Wrap in try/catch so an already-expired session doesn't fail the new flow.

- **processed_webhooks idempotency table**
  **What:** Design doc called for a `processed_webhooks` table keyed on Stripe event id. Current implementation uses booking-status-based idempotency (works for `checkout.session.completed`, breaks for future event types).
  **Why:** As webhook handling expands (refunds, payment_intent.* events), status-based check won't cover. Stripe retries can replay any event.
  **How:** Create `processed_webhooks(event_id PRIMARY KEY, first_seen_at)`. In webhook controller, INSERT ... ON CONFLICT DO NOTHING; if no row affected, early-return ignored.

- **Refunds on rejected paid bookings**
  **What:** If Dokandar REJECTS a PENDING paid booking, the Grahok has been charged and no refund fires.
  **Why:** Real user-facing issue. For demo, document in README that rejections require manual Stripe-dashboard refund.
  **How:** Call `stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId })` in `setStatus` when transitioning to REJECTED and `booking.stripePaymentIntentId` is set. Handle partial refund policy via a config flag.

### State machine + data integrity
- **Full booking state machine**
  **What:** Current guard only prevents PAYMENT_PENDING → APPROVED/REJECTED/BANNED and no-ops same-status transitions. Remaining illegal transitions (APPROVED → PAYMENT_PENDING, REJECTED → PENDING, etc.) are unblocked.
  **Why:** Future admin-tool or bulk-update paths could introduce bad transitions. Not a demo risk.
  **How:** Define a transition table `allowedTransitions: Record<BookingStatus, BookingStatus[]>`. Validate in `setStatus` before save.

- **CustomerKhata getOrCreate race**
  **What:** Two parallel first-bookings by the same grahok at the same dokan could race the `getOrCreateForPair` check and both try to INSERT, hitting the `@Unique(['grahok','dokan'])` constraint.
  **Why:** Rare but possible in prod. Not a demo risk.
  **How:** Either wrap in SERIALIZABLE txn or use `INSERT ... ON CONFLICT DO NOTHING RETURNING *` via TypeORM `upsert`.

- **Replace synchronize:true with proper TypeORM migrations**
  **What:** Both typeorm.config and seed.ts use `synchronize` (conditional + unconditional respectively). Production-grade apps use migrations.
  **Why:** Schema drift from entity edits can silently alter prod schema. Resume-grade claim should include "migrations on deploy via GitHub Actions."
  **How:** Generate initial migration (`npm run typeorm migration:generate -- -n Init`), commit, add `migrationsRun: true` to typeorm.config, drop `synchronize`. Seed uses the app's migrated schema instead of its own DataSource.

### Performance / scale
- **Indexes for query hot paths**
  **What:** No explicit indexes on `bookings(stripe_session_id)`, `bookings(event_id, status)`, `customer_khatas(dokan_id, tier)`, `dokan_events(scheduledAt, visibility)`.
  **Why:** Demo-scale OK; resume-scale filter-by-tier or dokandar-dashboard-lookup will degrade.
  **How:** TypeORM `@Index(['event','status'])` etc., generate migration.

- **Pagination on listMyBookings, findAllForDokan, listForEvent**
  **What:** All list endpoints return full unpaginated result sets.
  **Why:** A popular dokan with 10k grahok_khatas will explode response size.
  **How:** Add `take`/`skip` or cursor-based pagination DTOs.

- **Rate-limit Stripe webhook path**
  **What:** Webhook is not explicitly excluded from the global throttler (60 req/min).
  **Why:** Stripe retries during an incident could hit throttle and lose webhooks. Low risk for demo.
  **How:** Add `@SkipThrottle()` on PaymentsController or a dedicated lax throttle bucket.

### Auth / security
- **Rotate seed creds after demo video**
  **What:** `admin123 / dokan123 / grahok123` are hardcoded in seed.ts and visible on the live login page + in git history.
  **Why:** Once the site is public, anyone can admin the platform.
  **How:** Either delete the demo users after the demo submission period OR put the site behind basic auth OR rotate seed passwords + re-record demo.

- **DTO conditional validation for LOYALTY events**
  **What:** `create-event.dto` allows LOYALTY visibility without a minTier (only service-layer validation blocks it).
  **Why:** DTO-level validation gives earlier + clearer errors.
  **How:** Use class-validator `@ValidateIf(o => o.visibility === 'LOYALTY')` + `@IsEnum(LoyaltyTier)`.

### Infra / DevOps
- **Render cold-start warm-up**
  **What:** Render free tier spins down after 15 min idle. First request after cold-start takes 20-40s.
  **Why:** If the demo reviewer opens the site after hours of idle, first click hangs.
  **How:** Either upgrade to paid tier, OR use a free uptime monitor (UptimeRobot, cron-job.org) to ping the backend every 10 min, OR script a health-check fetch at the start of the demo video.

- **GitHub Actions CI**
  **What:** Design doc's resume claim mentions "GitHub Actions CI" but no `.github/workflows/` exists.
  **Why:** Claim doesn't match repo state.
  **How:** Add `.github/workflows/ci.yml` that runs `npm ci && npm test` on push + PR. Extend with a deploy-on-main job once deploy target is stable.

- **Dockerize both repos**
  **What:** Currently relying on Nixpacks / Vercel-build. Dockerfile would make local/prod parity explicit.
  **Why:** Resume claim says "Dockerized + CI/CD."
  **How:** Multistage Dockerfile per repo (builder → runtime), `.dockerignore`.

---

## Scope deferrals (from design doc Tier 3)

- Kormi (employee) role + permissions
- Audit log append-only table with replay
- Redis caching for featured events
- BullMQ for email notifications (booking confirmations, invitation nudges)
- Playwright E2E test suite (payment flow, 4 booking types)
- 10+ landing page sections, sticky navbar with mega-menu
- Dark mode
- Skeleton loaders everywhere
- Full dashboard charts (bar, pie, dynamic tables)
- QR code event check-in
- iCal export
- Multiple dokans per dokandar (currently 1:1)
- Invitation-to-non-users (email invite flow)

---

## Design polish (from /plan-design-review, 2026-04-16)

- **Extract DESIGN.md to khata-client/**
  **What:** Copy the "Design Override: UI Copy Direction", "Information Architecture", "Interaction State Coverage", "AI Slop Risk", "Design System", "Responsive & Accessibility", and "Design Decisions Log" sections from the gstack design doc into `khata-client/DESIGN.md` as the project's in-repo design source of truth.
  **Why:** The gstack design doc sits in `~/.gstack/projects/B6A6/` (outside the repo). Future contributors and future-you should find design decisions inside the repo. Stops design drift.
  **How:** One-time copy; update routes/components as the code diverges from the plan. Remove the gstack-scoped process notes (like GSTACK REVIEW REPORT section) when copying.

- **Full a11y audit**
  **What:** Pass 6 scoped MVP a11y to 3 hot paths (demo-button login, book a free event, approve a booking). Update-02 runs a full audit.
  **Why:** Assistive-tech users book events too. Missing aria-labels on dynamic action blocks, missing focus traps in modals, missing skip-to-content links will catch users.
  **How:** Run axe-core (browser extension or `@axe-core/playwright` in CI) on every route. Manual keyboard walkthrough of all 13 routes. Fix + commit atomically per route.

- **Re-introduce Bangla labels as opt-in locale**
  **What:** Pass 7 decision 2 dropped Bangla script from the UI. Future iteration could re-introduce Banglish labels (Amar Khata, Grahok Khata, Dokandar, Grahok) as a locale toggle (English default, Banglish opt-in).
  **Why:** BD-shop-native vocabulary IS the original differentiator (design doc lines 39-45). Current MVP ships English-only, which weakens the differentiator visually. Adding Banglish as a locale rather than a primary restores it for users who want it without forcing it on all users.
  **How:** next-intl with two locales — `en` (current default) and `bn-bd` (Banglish labels). Toggle in footer or top-bar avatar menu. Persist choice in localStorage.

- **Shop cover photo / banner upload**
  **What:** Currently Dokan entity has optional `logoUrl` only. Shop detail page hero and event cards feel generic without a 16:9 cover image.
  **Why:** Visual polish. Without a cover, shop detail hero falls back to a category-colored gradient (per Pass 1 spec) — which is acceptable but obviously less rich than a photo.
  **How:** Add `coverUrl` column to Dokan entity + migration. Upload flow via Cloudinary free tier OR Vercel Blob OR direct-to-S3 presigned URL. Keep category-gradient fallback for shops without a cover.

- **Dark mode (confirmed Update-02 per Pass 7 decision 4)**
  **What:** Warm desaturated dark theme. Charcoal bg (#1F1A15-ish) + warm cream text + tier colors unchanged (saffron/terra cotta/cream stay vivid on dark). NOT tech-bro pure black + neon.
  **Why:** Portfolio polish. Users who work at night. Calibrated to stay on-brand with the warm earth palette.
  **How:** CSS variables set light values by default; add `.dark` class variants on `:root[data-theme='dark']`. Toggle in top-bar avatar menu. Persist in localStorage. Verify contrast for text-on-charcoal (should pass AA).

---

## Test coverage backfill

All untested code paths from the /plan-eng-review test coverage diagram. Summary:

- `bookings.service.ts`: ~14 paths untested (all of createFreeBooking branches, all of createCheckoutSession branches, markPaid paths, setStatus guards)
- `customer-khatas.service.ts`: recomputeTier/getOrCreateForPair/recordEventAttended — **partial coverage shipping tonight for recomputeTier + meetsTier only**
- `payments.service.ts` + `payments.controller.ts`: **partial coverage shipping tonight for verifyWebhook bad-signature only**
- `dokan-events.service.ts`: zero
- `reviews.service.ts`: zero
- `invitations.service.ts`: zero
- `admin.service.ts`: zero

Target for Update-02: 70%+ line coverage on services via Jest + meaningful branch coverage, plus Playwright E2E for the 4 booking flows.
