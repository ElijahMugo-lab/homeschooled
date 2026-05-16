# Homeschooled — Developer Handover

> A vetted marketplace connecting homeschooling parents with credentialed educators.
> Classical, minimal aesthetic. Built on trust, not noise.

---

## 1. Project Overview

**Stack**
- **Framework**: TanStack Start v1 (full-stack React 19, SSR/SSG, file-based routing)
- **Build tool**: Vite 7
- **Styling**: Tailwind CSS v4 with custom semantic tokens in `src/styles.css`
- **Backend**: Lovable Cloud (Supabase-managed) — Postgres, Auth, Storage, Realtime
- **Server runtime**: Cloudflare Worker (edge)
- **Target**: Edge function runtime (`nodejs_compat` enabled)

**Design System**
- **Display font**: Cinzel (serif, Greco-Roman)
- **Body font**: EB Garamond (serif)
- **Palette**: Alabaster / Parchment / Stone surfaces; Terracotta primary; Aged Gold accents; Laurel green for verified states
- **Radius**: mostly 0px (sharp, editorial)
- **No generic AI aesthetic** — no Inter, no purple gradients

---

## 2. Repository Structure

```
src/
  routes/                 # TanStack file-based routes (flat, dot-separated)
    __root.tsx            # Root layout (html/head/body shell, AuthProvider, Toaster)
    index.tsx             # Homepage / landing
    sign-up.tsx           # Registration (parent or educator)
    sign-in.tsx           # Login
    dashboard.tsx         # Role-based dashboard (parent / educator / no-role fallback)
    agora.tsx             # Public directory of verified educators
    educators.$id.tsx     # Educator public profile detail
    messages.tsx          # Conversations + real-time messaging
    vetting.tsx           # Educator document upload for verification
    how-it-works.tsx      # Static explainer page
    admin.tsx             # Redirects /admin → /admin/dashboard
    admin.dashboard.tsx   # Admin analytics (KPIs, charts, live teacher data)
    admin.teachers.tsx    # Admin teacher list + detail routes
    admin.teachers.$id.tsx# Individual teacher review page
    admin.pending.tsx     # Pending educator requests (approve/reject)
    admin.reports.tsx     # Placeholder (marked "Soon")
    admin.settings.tsx    # Placeholder (marked "Soon")
  components/
    admin/admin-shell.tsx # Admin layout with sidebar, mobile nav, auth guard
    admin/status-chip.tsx # Small status badge component
    page-shell.tsx        # Public page wrapper (nav + footer)
    site-nav.tsx          # Top navigation
    site-footer.tsx       # Footer
    chatbot-widget.tsx    # Floating help widget
    rating-dialog.tsx     # Post-session rating modal
    whatsapp-escalation-card.tsx
    ui/                   # shadcn/ui primitives (Button, Card, Dialog, Table, etc.)
  lib/
    auth-context.tsx      # React context: session, role, signOut, refreshRole
    admin-data.ts         # Mock data generators + types for admin charts
    chatbot-faqs.ts       # FAQ content for chatbot
    whatsapp-escalation.ts
    utils.ts              # cn() helper
  integrations/supabase/
    client.ts             # Browser Supabase client (auto-generated, DO NOT EDIT)
    client.server.ts      # Service-role admin client (server-only, bypasses RLS)
    auth-middleware.ts    # requireSupabaseAuth middleware for server functions
    auth-attacher.ts      # Attaches auth header to server function RPCs
    types.ts              # Generated DB types (auto-generated, DO NOT EDIT)
  server/
    assign-role.ts        # createServerFn that assigns role via service-role client
  styles.css              # Tailwind v4 theme tokens, custom colors, ornaments
  router.tsx              # TanStack Router bootstrap
  routeTree.gen.ts        # Auto-generated route tree (DO NOT EDIT)
  start.ts                # createStart instance with attachSupabaseAuth middleware
supabase/
  migrations/             # SQL migrations (managed via migration tool)
  functions/              # Edge functions (if any; prefer TanStack server functions)
  config.toml             # Supabase project config (auto-generated)
```

---

## 3. Database Schema

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User display names | `id` (uuid, PK), `full_name` |
| `user_roles` | Role assignment per user | `id`, `user_id` (uuid), `role` (enum: parent/educator/admin) |
| `educator_profiles` | Public educator directory | `id` (uuid, PK = auth user id), `display_name`, `philosophy`, `subjects` (text[]), `grade_levels` (text[]), `bio`, `hourly_rate_kes`, `is_verified`, `rating_avg`, `rating_count`, `avatar_url` |
| `vetting_documents` | Uploaded credentials | `id`, `educator_id`, `doc_type` (national_id/certificate/other), `file_path`, `status` (pending/approved/rejected), `reviewer_notes`, `reviewed_by`, `reviewed_at` |
| `conversations` | Parent-educator threads | `id`, `parent_id`, `educator_id`, `last_message_at` |
| `messages` | Chat messages | `id`, `conversation_id`, `sender_id`, `body`, `created_at` |
| `sessions` | Completed tutoring sessions | `id`, `conversation_id`, `parent_id`, `educator_id`, `completed_at` |
| `ratings` | Two-way star ratings | `id`, `session_id`, `rater_id`, `ratee_id`, `ratee_role`, `stars`, `note` |
| `parent_ratings` | Aggregated parent ratings | `parent_id`, `rating_avg`, `rating_count` |

### Enums
- `app_role`: `parent`, `educator`, `admin`
- `vetting_doc_type`: `national_id`, `certificate`, `other`
- `vetting_doc_status`: `pending`, `approved`, `rejected`

### Key Functions
- `has_role(user_id, role)` — SECURITY DEFINER helper used in RLS policies
- `assign_educator_role(_user_id)` — SECURITY DEFINER function called server-side to grant educator role
- `is_conversation_participant(conv_id, user_id)` — SECURITY DEFINER helper for message access

### Storage Buckets
- `avatars` — Educator profile photos (public read)
- `vetting-docs` — Credential documents (private, admin + owner only)

---

## 4. Authentication & Roles

### Sign-up Flow
1. User fills `/sign-up` (full name, email, password, role: parent or educator)
2. Supabase Auth creates the user
3. **Server function** `assignRole()` is called immediately after signup:
   - `parent` → inserts into `user_roles` directly via `supabaseAdmin`
   - `educator` → calls `assign_educator_role()` RPC via `supabaseAdmin` (required because educator insert is blocked by RLS)
4. Client refreshes role via `refreshRole()` and redirects to `/dashboard`

### Role-Based Routing
- `AuthProvider` fetches role from `user_roles` on mount and auth state change
- Dashboard renders:
  - `parent` → ParentDashboard (links to Agora + Messages)
  - `educator` → EducatorDashboard (profile editor, vetting status, messages)
  - no role → NoRoleSetup fallback (tells user to contact support)
- Admin routes (`/admin/*`) are guarded in `AdminShell`: non-admin users are redirected to `/dashboard`

### Admin Access
- Admin role is **not** self-service. It must be inserted manually into `user_roles` by an existing admin or via service-role script.
- There is **no** admin signup UI. Admin exists as a hardcoded operational role.
- Hardcoded admin email shortcut: `eliquitel@gmail.com` is auto-redirected to `/admin/dashboard` on sign-in.

---

## 5. Key Features

### The Agora (`/agora`)
- Public directory of **verified** educators (`is_verified = true`)
- Filter by Subject, Philosophy (Classical / Montessori / Charlotte Mason / Eclectic), Grade Level
- Realtime subscription to `educator_profiles` — new verified educators appear live with a toast
- Cards show avatar, name, philosophy tag, subjects, star rating, hourly rate (KES), bio excerpt
- "Message" button → `/messages?educator=<id>` (auto-creates conversation if parent)

### Vetting Gateway (`/vetting`)
- Educator-only page (redirects non-educators to dashboard)
- Upload National ID, Teaching Certificate, or Other documents (max 10 MB)
- Files stored in `vetting-docs` bucket; metadata in `vetting_documents` table
- Status badge: Pending (gold) / Approved (laurel) / Rejected (destructive)
- Admin reviews documents and sets `is_verified = true` on the educator profile when approved

### Messaging Bridge (`/messages`)
- Authenticated users only
- Sidebar lists all conversations sorted by `last_message_at`
- Realtime message subscription per active conversation
- Educators can mark a session "complete" → creates a `sessions` row
- After session completion, both parties can rate each other via `RatingDialog`
- Ratings update aggregate tables (`educator_profiles.rating_*`, `parent_ratings`)

### Admin Council (`/admin/*`)
- **Dashboard**: KPIs + Recharts visualizations (applications over time, qualification rate, status distribution, rejection reasons, subject/grade breakdown, reviewer activity, document health, funnel). Mixes live `educator_profiles` data with mock historical data from `lib/admin-data.ts`.
- **Teachers**: List + individual review pages for educator profiles and documents
- **Pending**: List of educators awaiting verification with approve/reject actions
- Reports & Settings pages are placeholders (`soon: true`)

---

## 6. Server-Side Architecture

### Server Functions (`createServerFn`)
- `src/server/assign-role.ts` — Assigns role after signup. Uses `supabaseAdmin` (service role, bypasses RLS).
- All new server-side logic should go in `*.functions.ts` files under `src/lib/` or next to the route that uses them.

### Server Routes (raw HTTP)
- Place under `src/routes/api/public/*` for webhooks or public endpoints
- These bypass auth on published sites — always verify signatures / API keys in the handler

### Auth Middleware
- `requireSupabaseAuth` — use for protected server functions
- `attachSupabaseAuth` — registered in `src/start.ts` as global `functionMiddleware`; automatically attaches the user's bearer token to server function RPCs
- **Never** import `client.server.ts` in client code (contains service role key)

### Environment Variables
| Variable | Context | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser/Build | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser/Build | Anon key for RLS-respecting queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS; used in `assign-role.ts` and admin ops |

---

## 7. RLS Policy Summary

All tables have RLS enabled. Key patterns:
- **Self-service**: Users can insert/update their own rows (`auth.uid() = id`)
- **Role-based**: `has_role(auth.uid(), 'educator')` etc. used where needed
- **Conversation participation**: Messages/conversations use `is_conversation_participant()` helper
- **Public read**: Verified educator profiles are readable by everyone (`is_verified = true`)
- **Admin override**: Admins can view/update all rows via `has_role(..., 'admin')` policies

---

## 8. Known Gaps & Next Steps

1. **Admin creation is manual** — there is no UI to promote users to admin. Use a service-role script or direct DB insert.
2. **Reports & Settings pages** are placeholder routes in the admin shell.
3. **Email verification** — currently requires email confirmation before login. Do not enable auto-confirm unless explicitly requested.
4. **No payment integration** yet. Educator hourly rates are displayed but not transacted.
5. **Mock data** — Admin dashboard charts blend live DB data with mock generators (`lib/admin-data.ts`). Replace with real historical queries when sufficient data exists.
6. **WhatsApp escalation** component exists but may not be fully wired end-to-end.
7. **Chatbot widget** is a floating help UI with local FAQ content.

---

## 9. Running Locally

```bash
bun install
bun run dev          # Vite dev server
bun run build        # Production build
bun run lint         # ESLint
bun run format       # Prettier
```

The `.env` file is auto-generated by Lovable Cloud and contains Supabase credentials. Do not commit it.

---

## 10. Deployment

- **Preview**: `https://id-preview--8189d4c5-bd2c-4bc6-b0b1-8411957df5ed.lovable.app`
- **Published**: `https://homeschooled.lovable.app`
- Deploy via Lovable Cloud publish action.

---

## 11. Security Notes

- Never use `supabaseAdmin` in client bundles.
- Admin operations should verify `has_role(..., 'admin')` server-side; the UI guard in `AdminShell` is UX-only.
- Vetting documents are private by default; only the owner and admins should access them.
- User passwords and auth data are handled by Supabase Auth (bcrypt, encrypted at rest).

---

*Last updated: 2026-05-16*
