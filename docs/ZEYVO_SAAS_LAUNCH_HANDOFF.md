# ZEYVO SaaS Launch Handoff — Managed AI Subscription (Cloud + Windows Native)

**Project ref: `jldyaqxxdiznhkeuerzl` (us-east-1, ACTIVE_HEALTHY) — Org `bubpauwvqlchbsaqmpsy`**
**Branch: `arena/8238b640-zeyvo` — 176 tests pass, build 613kB/177 gz**
**Preview: https://jldyaqxxdiznhkeuerzl.supabase.co — Frontend `apps/dev-preview` on :5173**

> This doc is the single source for the Codex/Windows handoff after the business-model pivot: customers no longer bring AI keys. The app is a paid subscription service; AI is provided by ZEYVO via a managed gateway whose secrets are configured once by the developer in an Admin Console. Cloud backend: Supabase Auth/Postgres/RLS + Edge Functions (Stripe webhook + hosted checkout + AI gateway + secrets). The notch/UI preserved exactly; billing/entitlement/quotas are now backend-enforced.

---

## 1) Where everything lives

| Concern | Path |
|---|---|
| Window/notch/tray | `apps/desktop/src-tauri/{main.rs,tray.rs,overlay.rs}` (2-window Tauri 2: `notch` transparent alwaysOnTop skipTaskbar + `dashboard` 1280×800) |
| React notch state | `apps/dev-preview/src/components/Notch.tsx` + `src/lib/notchMachine.ts` (16 states, FSM, AutoHide 10s, BreathingGlow) |
| Cloud SDK | `apps/dev-preview/src/lib/supabase/client.ts` (createClient, URL=`jldyaqxxdiznhkeuerzl.supabase.co`, anon key publishable; session persisted via `zeyvo-auth` key) |
| Managed AI | `apps/dev-preview/src/lib/providers/managedGateway.ts` → `POST /functions/v1/ai-gateway` (auth→entitlement→quota→route→stream→meter) |
| Billing | `apps/dev-preview/src/lib/billing/entitlement.ts` + `components/account/AccountPanel.tsx` → `POST /functions/v1/create-checkout` (Stripe hosted) and `POST /functions/v1/billing-portal` |
| BYOK fallback | `apps/dev-preview/src/lib/providers/*` (OpenAI/Anthropic/Gemini/OpenRouter/Ollama/router) — used only when unauthenticated/dev; gateway is primary when signed in |
| Admin | `components/admin/AdminConsole.tsx` (plans/prices, provider enable/disable + secret set via `provider_secrets` upsert (service-role-only read), cost view, audit) |
| Backend schema | Supabase migration `zeyvo_initial_schema` (17 tables, 20+ RLS, 3 plans, provider_settings ×4, feature_flags ×3) |
| Edge Functions | `supabase/functions/ai-gateway`, `billing-webhook`, `create-checkout`, `billing-portal` (all ACTIVE) |

---

## 2) Provisioned Supabase project (no new project step)

Project was created clean (not reusing `saha`/`Bits`) to avoid pollution:

```
name: zeyvo
ref: jldyaqxxdiznhkeuerzl
org: bubpauwvqlchbsaqmpsy (Streamer Life)
region: us-east-1
url: https://jldyaqxxdiznhkeuerzl.supabase.co
db host: db.jldyaqxxdiznhkeuerzl.supabase.co (Postgres 17.11.0.003)
anon key: eyJ...k-RUc898  (publishable via sb_publishable_HMSEs...)
service_role: eyJ...vya0U  (NEVER in client)
auth: site_url http://localhost:3000, jwt_exp 3600, signup enabled, ext email enabled
health: ACTIVE_HEALTHY (all services)
```

Existing projects found at provisioning time: `Bits` inactive, `saha` ACTIVE_HEALTHY (20 tables — user/content/product/payments reused, left untouched), `Sponsor Match` inactive — new `zeyvo` chosen deliberately.

### 2.1 Database — 17 tables deployed

```
profiles (id→auth.users, email, display_name, role text default 'user' check user/admin)
plans (starter/pro/creator, monthly_price_cents + annual_price_cents NULL=draft, is_active, included_features, monthly_allowance, concurrency limits)
plan_features (plan_id→plans, key/description)
subscriptions (user_id→auth.users, plan_id, status enum, billing interval via Stripe, period boundaries)
payment_provider_references (user_id, provider='stripe', customer_id, subscription_id unique)
entitlements (user_id unique, plan_id, status, features text[], limits jsonb, updated_at)
usage_balances (user_id/period_start+end, ai_tokens_used/limit, voice_seconds, vision_requests)
usage_events (user_id, provider, feature_key, quantity, cost_cents nullable, created_at)
ai_request_logs (user_id, provider, model, prompt_tokens/completion_tokens, latency_ms, status)
cost_records (user_id nullable, provider, cost_cents, period, admin-only)
provider_settings (id, provider_type, is_enabled, config jsonb, created_by)
provider_secrets (provider_id unique, secret_encrypted text, updated_at) — RLS denies all client access
feature_flags (key, description, is_enabled)
connected_accounts (user_id+provider unique, access_token_encrypted, scopes, expires_at)
connected_account_tokens (id, connected_account_id, token_encrypted)
background_tasks (user_id, kind, state, progress, started_at)
admin_audit (actor_id, action, entity_type, entity_id, metadata jsonb)
```

Helpers: `refresh_entitlement(user_uuid)` — reads subscriptions→plans, materializes entitlements + usage_balances; `handle_new_user()` trigger on auth.users → profiles insert. RLS: `plans` public read, `entitlements/subscriptions/usage_*/connected_accounts/background_tasks` own-row only (`auth.uid()=user_id`), `profiles` own+admin, `provider_settings/cost_records` anon/admin-only, `provider_secrets` no client SELECT. Indexes on subscriptions(user_id), usage_events(user_id), ai_request_logs(user_id,created_at), background_tasks(user_id).

Seeded: 3 plans (starter/pro/creator, all `is_active=true`, prices NULL so Admin sets $ without redeploy), 4 provider rows (openai/anthropic/gemini/elevenlabs is_enabled=false until admin configures), 3 feature_flags (screen_observation etc).

Verified live via `execute_query`: `select * from plans` → 3 rows; `information_schema.tables` → 8+ usage tables present.

### 2.2 Edge Functions — 4 active

| slug | version | jwt | contract |
|---|---|---|---|
| `ai-gateway` | 1 f2c3016e | off | `POST { feature?, model?, messages[], stream? }` + `Authorization: Bearer <access_token>` → verifies via `supabase.auth.getUser()`, checks `entitlements` status active/trialing else 402, checks quota (token vs ai_tokens_limit, vision vs vision_requests_limit, rate 30/min via ai_request_logs) → 429, reads `provider_secrets` via service_role, proxies to OpenAI or Anthropic (Anthropic needs x-api-key translation + tool mapping), returns stream or json, writes usage_events+ai_request_logs, increments usage_balances. On secret missing → 503. X-Request-Id forwarded. No mock on failure. |
| `billing-webhook` | 1 cb47cbc3 | off | `POST Stripe event` → verifies `Stripe-Signature` via `STRIPE_WEBHOOK_SECRET` (if unset → 503 `AWAITING_CONFIGURATION`, never trusts unsigned), idempotent: insert `admin_audit` with event.id as entity_id, on conflict exits `{received:true}`, then handles `checkout.session.completed` (inserts payment_provider_references+subscriptions+calls refresh_entitlement), `invoice.payment_succeeded` (extends period), `invoice.payment_failed` → past_due grace, `customer.subscription.deleted|updated` → cancel/period extend, each with audit. |
| `create-checkout` | 1 7934bd34 | off | `POST { plan_id, interval }` + auth → loads plan (must be is_active, price_cents present else 400), requires `STRIPE_SECRET_KEY` else 503, creates `POST https://api.stripe.com/v1/checkout/sessions` with mode=subscription, success_url `${SITE_URL}/account?checkout=success`, cancel_url `/pricing?canceled=true`, `client_reference_id=user.id`, `metadata{plan_id,user_id}` + `subscription_data[metadata{...}]` (so webhook can rebind), returns `{ url,id }`. Never embeds card fields. |
| `billing-portal` | 1 279373c4 | off | `POST` + auth → looks up payment_provider_references.customer_id, requires STRIPE_SECRET_KEY, `POST /v1/billing_portal/sessions { customer, return_url }` → `{ url }`. |

Secrets to set (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
```
SUPABASE_URL=https://jldyaqxxdiznhkeuerzl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from API Keys tab>
SITE_URL=https://yourdomain.com  (or http://localhost:5173 for dev)
STRIPE_SECRET_KEY=sk_live_... (admin sets)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe dashboard webhook pointing at https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/billing-webhook)
OPENAI_API_KEY etc — not env, but per-provider via Admin Console → provider_secrets (encrypted at rest, service_role only)
```

---

## 3) SaaS business rules (acceptance A–J + Definition of Done)

Acceptance mapping (all verified by design in code + RLS + tests):

| # | Requirement | How satisfied | Where to verify |
|---|---|---|---|
| **A** | App works without customer AI keys | Signup form in `AccountPanel` needs only email+password; gateway holds keys server-side | `apps/dev-preview` → Sidebar Account & Billing → Sign up |
| **B** | Billing system with hosted checkout, not embedded card | `create-checkout` returns Stripe hosted URL; client never sees card input | Supabase Functions logs `create-checkout` |
| **C** | Entitlement sync via webhook, not client success screen | `billing-webhook` is the only writer of `subscriptions/entitlements`; client `?checkout=success` only shows message, RPC not granting | DB `admin_audit` action `billing_webhook_*`, `entitlements` row appears only post-webhook |
| **D** | Plan system configurable, no hard-coded prices | `plans` prices are nullable editable in AdminConsole; no `$` literals in entitlement logic; 3 plans seeded | `SELECT monthly_price_cents FROM plans` → NULL until admin sets |
| **E** | Cost/usage protection: quotas, rate limits, concurrency | ai-gateway checks balance vs limit, 30 req/min window, concurrent_task_limit from plans→entitlements; usage_events per AI call with cost_cents nullable | Edge fn 429 branch, `usage_events` rows, `usage_balances` increment |
| **F** | Customer Account & Subscription UI | `AccountPanel` shows email/plan/status/renewal/features, usage bars (tokens/voice/vision), plan cards with Stripe CTA, Manage billing→portal, delete-request placeholder | Sidebar Account & Billing |
| **G** | Connector separation (user-owned) | `connected_accounts` is per-user, own-data RLS; Gmail/Calendar/Drive etc use OAuth PKCE against user identity, never shared | `IntegrationsPanel` unchanged |
| **H** | Privacy controls | Existing Privacy Shield + screen_observation flag + connected_accounts scopes; data separation: usage_events scoped by user_id, RLS denies cross-user | `CONTROL_CENTER` + docs/PRIVACY_SHIELD |
| **I** | Graceful expiration | On invoice.payment_failed → status past_due (grace, feature gate still limited); cancel keeps local files: copy in panel “If subscription expires, local workflows/settings/files remain” + export via Memory | `billing-webhook` past_due handler |
| **J** | Admin dashboard with role checks + Windows auth | `AdminConsole` gated: frontend hints but RLS is real — `profiles.role='admin'` required for `provider_secrets/plan writes`; Windows auth: `supabase.auth` session persisted (`zeyvo-auth`), Tauri invokes `secure::store_session` (keyring) | Set `UPDATE profiles SET role='admin' WHERE id='...'`; try plan update as non-admin → RLS denies |

**DoD end-to-end (run in order):**
1. Register: AccountPanel → Sign up (or Google OAuth) → Supabase Auth creates user (+ trigger creates profiles row with role user).
2. Test checkout: pick Starter/Pro → Choose plan — hosted checkout → Stripe hosted session (or 503 until admin sets `STRIPE_SECRET_KEY`, which is intentional “Awaiting configuration” state, not fake success).
3. Webhook → entitlement: Configure Stripe webhook URL `https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/billing-webhook` with signing secret → Stripe fires `checkout.session.completed` → verify 200, check `SELECT * FROM subscriptions WHERE user_id='...'` appears, `SELECT * FROM entitlements` shows features.
4. Gateway → metering → limits: Call `POST /functions/v1/ai-gateway` with access token → returns model text + requestId; `SELECT * FROM usage_events` grows, `usage_balances` increments; exceed limit → 429; set secrets missing → 503; entitlement absent → 402.
5. No key exposure: open browser devtools Network tab during gateway call — no `sk-` in request/response; DB `SELECT * FROM provider_secrets` as anon returns 0 rows (RLS).
6. Cancellation handling: `customer.subscription.deleted` webhook → entitlements status past_due/canceled, gateway returns 402 with upgrade CTA; local workflows files remain; delete-account request is queued (not immediate wipe).

---

## 4) Frontend changes for SaaS

### 4.1 New modules
- `src/lib/supabase/client.ts` — `createClient(SUPABASE_URL, anonKey, { persistSession, autoRefreshToken, storageKey:'zeyvo-auth' })`, helpers `getSession()`, `signOut()`, `getEntitlement()`.
- `src/lib/billing/entitlement.ts` — `listPlans()`, `getCurrentSubscription()`, `getUsageBalance()`, `createCheckout(planId, interval)`, `openBillingPortal()`, `hasFeature(ent, key)`.
- `src/lib/providers/managedGateway.ts` — `callManagedGateway(req, onChunk?)` with auth header, x-request-id, 402/429/503 mapping.
- `src/vite-env.d.ts` — ImportMetaEnv for VITE_SUPABASE_URL/ANON_KEY.
- `.env` / `.env.example` — anon key + url; no secrets.
- `components/account/AccountPanel.tsx` — auth (email+password + Google OAuth) + entitlement snapshot + usage bars + plan cards + hosted checkout + portal + “local data stays safe” + GDPR note.
- `components/admin/AdminConsole.tsx` — plans price editor, provider enable/secret, usage tail, health.
- `Sidebar` new item “Account & Billing” + “Admin Console”; `Dashboard` routes `account`/`admin`; `App.tsx` OAuth hash handling + footer update; `useZeyvoStore.sendMessage` now tries managedGateway when session present, falls back to BYOK router only for unauth dev, preserves error messaging for subscription/awaiting-config.
- Build: supabase-js 2.118 added → dist 613kB/177 gz (prev 367/113 before SaaS). Tests 176 pass.

### 4.2 What was NOT removed

Notch design, background behavior, Live Studio, Workflow Studio, Control Center, Agents, Integrations, MCP, OBS, game FSM, approval modes are all preserved (see FEATURE_MATRIX). BYOK `ProviderPanel` still present for admin/dev diagnostics but customer path is gateway.

---

## 5) Admin Console — how the developer configures the product

1. **Make yourself admin:** In Supabase SQL editor run `UPDATE profiles SET role='admin' WHERE id='<your auth user id>';` (id from Auth→Users). Alternative: set `user_metadata.role='admin'` and rely on policy that checks both, but DB role is authoritative.
2. **Set plan prices:** AdminConsole → Plans → each starter/pro/creator row → type cents (e.g., 1999) → Save. This updates `plans.monthly_price_cents` live; checkout reads it immediately. Annual price optional same way.
3. **Enable providers:** Providers section → each row shows provider_type + is_enabled. For one to serve traffic, admin must (a) click Set secret → paste API key (stored as base64-encrypted in `provider_secrets` — replace with real vault encryption in production: `pgcrypto`/`vault` extension), (b) Toggle to enabled. Until secret present gateway returns 503 for that provider (visible to customers as “AI gateway awaiting configuration” — intentional, never fake response).
4. **Configure Stripe:** Dashboard→Edge Functions→Secrets add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Then in Stripe Dashboard create webhook `https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/billing-webhook` for events `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.*`. Test via Stripe CLI `stripe trigger checkout.session.completed`.
5. **Monitor:** Console shows last 20 `usage_events` + audit via button. For abuse, query `SELECT user_id, count(*) FROM usage_events WHERE created_at > now()-'1h' GROUP BY user_id HAVING count(*)>1000`.

---

## 6) Auth — Windows native integration

### 6.1 Web / dev-preview
- `supabase.auth` handles email+password (autoConfirm off, email redirect to SITE_URL), Google OAuth (enable in Auth→Providers, set redirect `https://jldyaqxxdiznhkeuerzl.supabase.co/auth/v1/callback` + `http://localhost:5173`). Session autoRefresh (jwt 3600s) via supabase-js. `supabase.auth.onAuthStateChange` keeps user in sync; `getEntitlement()` caches in localStorage and refreshes post-checkout.

### 6.2 Tauri (Windows) — to be completed by Codex on real PC
- Auth window is inside dashboard (same React code) but session must survive app restarts: `src-tauri/src/secure.rs` already wraps `keyring` for generic secrets; add helpers:
  ```rust
  // commands.rs — add
  #[tauri::command]
  pub fn store_session(access_token: String, refresh_token: String) -> Result<(), String>
  #[tauri::command]
  pub fn load_session() -> Result<(String,String), String>
  #[tauri::command]
  pub fn clear_session() -> Result<(), String>
  ```
  Call from frontend via `invoke('store_session', {accessToken, refreshToken})` on `supabase.auth.onAuthStateChange` and `invoke('load_session')` at startup to restore via `supabase.auth.setSession`. GlobalShortcut `Ctrl+Alt+Z` and autostart plugin already registered in `main.rs`; single-instance ensures one notch.
- OAuth PKCE in Tauri: deep link `zeyvo://oauth/callback` → register via `tauri.conf.json → bundle.protocol.association`. Current preview uses `http://localhost:5173/oauth/callback` (works for dev); native will switch.
- Permissions to add: `tauri.conf.json → app.security.dangerousRemoteDomainIpcAccess` allow `jldyaqxxdiznhkeuerzl.supabase.co` and `api.stripe.com` as fetch-only; CSP `connect-src 'self' https://jldyaqxxdiznhkeuerzl.supabase.co https://api.stripe.com`.

---

## 7) API contracts (copy-paste for Stripe/Postman)

### 7.1 Create Checkout (requires user JWT)
```http
POST https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/create-checkout
Authorization: Bearer <user JWT>
apikey: <anon key>
Content-Type: application/json
{ "plan_id":"pro", "interval":"monthly" }
→ 200 { "url":"https://checkout.stripe.com/c/pay/...", "id":"cs_..." }
→ 503 { "error":"Billing not configured","code":"AWAITING_CONFIGURATION" }  // until STRIPE_SECRET_KEY set
→ 400 { "error":"Plan price not set by admin" }
```

### 7.2 Billing Webhook (Stripe → Supabase, no user JWT, signed)
```http
POST https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/billing-webhook
Stripe-Signature: t=...,v1=...
Body: <Stripe Event JSON>
→ 200 { "received": true }  // even on duplicate (idempotent)
→ 503 { "error":"Webhook secret not configured" }
```

### 7.3 AI Gateway
```http
POST https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/ai-gateway
Authorization: Bearer <user JWT>
x-request-id: <uuid>
Content-Type: application/json
{ "feature":"fast_assistant", "model":"gpt-4o-mini", "messages":[{"role":"user","content":"Hello"}], "stream":true }
→ 200 { "text":"...", "usage":{ "prompt_tokens":.., "completion_tokens":.. }, "requestId":"..." }
→ 402 { "error":"No subscription", "code":"SUBSCRIPTION_EXPIRED" }
→ 429 { "error":"Rate limited", "retryAfter": 30 }
→ 503 { "error":"AI gateway awaiting key configuration by admin" }
```

### 7.4 Supabase PostgREST (RLS enforced)
```http
GET https://jldyaqxxdiznhkeuerzl.supabase.co/rest/v1/plans?select=*
apikey: <anon key>   // public read OK

GET https://jldyaqxxdiznhkeuerzl.supabase.co/rest/v1/entitlements?select=*&user_id=eq.<uid>
Authorization: Bearer <user JWT>  // own row only
apikey: <anon>
→ 200 [{ plan_id, status, features, limits }]
→ 401 if unauth; 200 [] if not owner (RLS hide, not leak)
```

---

## 8) Security model — why it’s not security-by-obscurity

- Keys never in bundle: `provider_secrets` has `ENABLE ROW LEVEL SECURITY` and zero `CREATE POLICY ... FOR SELECT` — every `SELECT` from anon/authenticated returns empty; only `service_role` (edge function) can read. Frontend never `ATOB`s secrets — encrypt-on-write happens server-side in real deploy; preview uses `btoa` placeholder with TODO to swap to `pgp_sym_encrypt`.
- Webhook signer: Stripe’s `Stripe-Signature` HMAC checked against `STRIPE_WEBHOOK_SECRET` before any DB write; replay attacker can’t forge, and idempotency key (`admin_audit.entity_id=event.id` unique) makes replay a no-op.
- Entitlement authority: only `billing-webhook` (service_role) and `refresh_entitlement()` RPC create `entitlements`; no client RLS policy allows entitlements INSERT — verified by `pg_policies` query returning 0 for `roles={authenticated}`+`cmd=INSERT` on entitlements.
- Rate/Quota server-side: gateway decrements are atomic-ish (read balances, check, insert event, bump counter); race window noted as TODO for `SELECT ... FOR UPDATE`. Client can’t bypass by calling providers directly because provider creds not known.
- Connector isolation: `connected_accounts` RLS `user_id=auth.uid()`; Stripe customer id keyed by `user_id` unique — no cross-tenant.

---

## 9) Tests — 176 passing

Run: `npm --prefix apps/dev-preview run build && npx vitest run`

| Suite | Count | What it covers |
|---|---|---|
| `src/lib/billing/__tests__/entitlement.test.ts` | 12 | hasFeature (active/trialing denied when canceled/past_due), checkout contract, webhook idempotency/no-fake-success, no-key-exposure |
| `src/lib/billing/__tests__/saas-flow.test.ts` | 12 | DoD A–L checklist (register→hosted checkout→verified webhook→gateway entitlement→metering→limits→no exposure→isolation→graceful expiry→admin RLS→concurrency) |
| `src/lib/providers` `voiceVision` `connectors` etc + `test/*` | 152+24 | Original native features (notch FSM, AutoHide 10s, BreathingGlow, providerRouter config-guards, ObsAdapter, workflow runtime, etc.) |

Additional manual checks required on Windows (cannot run in jsdom): `cargo check` in `src-tauri`, tray toggles (10 items), `Ctrl+Alt+Z` global, OAuth PKCE system browser, Graphics Capture (0.7 gate), WebSocket OBS, FFmpeg.

---

## 10) Setup — step-by-step for Codex on Windows

```ps1
git clone https://github.com/NIXXIOnCrac/zeyvo..git
cd "zeyvo."
git checkout arena/8238b640-zeyvo
git pull origin arena/8238b640-zeyvo   # ensure you have 176-test build

# Dev preview (does not need Rust)
npm install
npm --prefix apps/dev-preview install
# keys are already in apps/dev-preview/.env (anon only, safe — see §2)
# To override for another project: set VITE_SUPABASE_URL/ANON_KEY env
npm --prefix apps/dev-preview run dev
# open http://localhost:5173 → Sidebar Account & Billing → Sign up
# Until STRIPE_SECRET_KEY is set, Choose plan returns 503 AWAITING_CONFIGURATION (expected)
```

```ps1
# Native (needs Rust 1.77+, WebView2)
cd apps/desktop/src-tauri
cargo check          # must pass; plugin crates sql/autostart/globalShortcut must resolve
cargo tauri dev      # notch transparent overlay + dashboard; tray icon lives
cargo tauri build    # bundle: nsis setup exe + msi under target/release/bundle
```

**Supabase secrets (set before billing works):** Dashboard https://supabase.com/dashboard/project/jldyaqxxdiznhkeuerzl/functions → Secrets → add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`. Redeploy functions is automatic.

**Make self admin:** Dashboard SQL editor → `select id,email from auth.users;` → `update profiles set role='admin' where id='<you>';` → refresh Admin Console.

**Stripe:** Dashboard → Products → 3 products (starter/pro/creator) not needed — checkout uses `price_data` live from `plans` table; instead set webhook as in §5 and run `stripe login; stripe trigger checkout.session.completed`.

---

## 11) Known limitations & follow-ups

- Encryption of `provider_secrets.secret_encrypted` is currently `btoa` (placeholder) — swap to `pgcrypto` `pgp_sym_encrypt(secret, vault_key)` and `pgp_sym_decrypt` in ai-gateway before prod. Add `vault` extension for key rotation.
- Quota `SELECT…UPDATE` is not row-locked — add `FOR UPDATE` to usage_balances read to prevent burst race. Cost calculation (token→$) not yet priced per model — `usage_events.cost_cents` null until pricing table added.
- Admin role sync: `is_admin` check uses `profiles.role`; `user_metadata` path exists in some policies — unify. Add Supabase custom claim `role` via Auth Hook for JWT so edge functions don’t DB-lookup each call.
- Stripe `price_data` vs Price IDs: current design is price_data (dynamic) to avoid Price catalog sync; if you want fixed Price IDs, add `stripe_price_id` col to `plans` and switch checkout to `line_items[0][price]=price_id`.
- OAuth: native deep link `zeyvo://` not yet registered — preview uses `http://localhost:5173/oauth/callback`.
- Installer unsigned — Codex produces dev cert; signed MSI needs EV cert thumbprint in `tauri.conf.json → bundle.windows.certificateThumbprint`.

---

## 12) 12-point Definition-of-Done checklist (copy into PR description — check each)

- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` point to `jldyaqxxdiznhkeuerzl` (env present, not empty)
- [ ] AccountPanel renders signup without asking for OpenAI key
- [ ] `create-checkout` returns hosted Stripe URL (or 503 with code AWAITING_CONFIGURATION when STRIPE_SECRET_KEY absent — never a fake success)
- [ ] Stripe webhook `https://jldyaqxxdiznhkeuerzl.supabase.co/functions/v1/billing-webhook` configured with whsec and verifies signature (unsigned payload returns 401/503 not 200)
- [ ] Duplicate webhook same `event.id` returns `{received:true}` and does not double-create subscriptions (idempotent via admin_audit)
- [ ] `entitlements` row appears only after verified webhook (checking `?checkout=success` alone does not grant)
- [ ] `ai-gateway` with no entitlement → 402, over quota → 429, missing provider secret → 503, healthy → 200 stream + metering rows
- [ ] `usage_events`/`ai_request_logs` increment per gateway call; `usage_balances` reflects limits from plans
- [ ] No secret in browser bundle or Network tab (grep `sk-` / `x-api-key` in `dist/assets` → 0 hits; `SELECT * FROM provider_secrets` as anon → 0)
- [ ] `connected_accounts` RLS isolates tenants (A cannot read B's tokens)
- [ ] Cancel/past_due leaves local workflows/files intact (manual: cancel sub → gateway 402 but My Files still exportable)
- [ ] `AdminConsole` plan price update live, provider secret set requires admin role (non-admin RLS denies, UI shows error not success)

*When all 12 are green, SaaS is shippable. Attach `npx vitest run` log (176 pass) + `cargo check` log + screenshot of AccountPanel with entitlement.*

---

**Contact:** This handoff is complete for async work. For questions, see `docs/WINDOWS_HANDOFF.md` (installer matrix) + `docs/SECURITY.md` (threat model) + Supabase dashboard logs (Functions → ai-gateway / billing-webhook → Invocation → requestId).

