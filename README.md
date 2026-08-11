# ifaghd

Personal sales automation system for turning leads (found by your existing Google
Places lead generator) into qualified prospects, demos, and paying customers —
built for one operator (you), not as a multi-tenant SaaS.

## Contents

- [Personal Sales Automation System](#personal-sales-automation-system)
- [n8n-mcp](#n8n-mcp) (MCP server setup, unrelated to the sales system's runtime)

---

## Personal Sales Automation System

### How it works, end to end

```
Lead Generator (Google Places, n8n)              Manual entry / CSV import (dashboard)
            │                                                  │
            └───────────────► POST /webhook/sales/leads-intake ◄────────────────┘
                                     (n8n: Sales - Lead Intake)
                                              │
                                     INSERT INTO leads
                                              │
                                     Sales - Lead Scoring  (score 0-100, temperature, → QUALIFIED)
                                              │
                                   You open the dashboard, review the lead
                                              │
                              click "Generate Message"  →  Sales - AI Message Generation (Gemini)
                                              │              stores a PENDING_APPROVAL message
                                              │
                              click "Approve & Send"    →  Sales - Message Approval & Send
                                              │              (WhatsApp) → lead.status = CONTACTED
                                              │              schedules first follow-up
                                              │
                     Lead replies on WhatsApp ──────────► Sales - Incoming Message Processing
                                              │              → Sales - AI Conversation Analysis
                                              │                 (classifies reply, drafts next reply,
                                              │                  or triggers Human Handoff)
                                              │
                          Sales - Follow-up Engine (daily) drafts Day 2 / 5 / 9 nudges
                          if the lead never replied — always as PENDING_APPROVAL
                                              │
                          You: Mark Interested → Book Demo → Mark Won / Mark Lost
                                     (buttons on the lead detail page)
```

Every outbound message is **drafted by AI but requires your approval before sending**
(`settings.autonomous_mode = false` by default). Nothing sends itself until you
explicitly flip that setting and wire the auto-send path yourself.

### What already existed vs. what was built

- **Already existed**: an n8n workflow (`ليدز يومية من Google Places`) that finds
  Saudi businesses daily via Google Places/SerpApi and emails you a report. It now
  *also* inserts qualifying rows into the new `leads` table and triggers scoring —
  see the "Insert Into Sales Leads" / "Score New Sales Lead" nodes added to it.
- **Already existed**: n8n credentials for Postgres, WhatsApp (Business Cloud API +
  Trigger), Gmail, Telegram, and Google Gemini. All reused — no new accounts created.
- **Built for this system**: the Postgres schema (`db/001_init.sql`), 10 n8n
  workflows (prefixed `Sales -`), and the `dashboard/` Next.js app.

### Database

PostgreSQL, same instance your n8n "Postgres account" credential already points at.
Schema lives in [`db/001_init.sql`](db/001_init.sql) (idempotent — safe to re-run) and
defines: `leads`, `conversations`, `messages`, `activities`, `followups`,
`appointments`, `proposals`, `customers`, `settings`.

`settings` holds the configurable knobs, edit them directly in Postgres (or add a
future admin UI):

| key | purpose |
|---|---|
| `scoring_rules` | point weights + HOT/WARM/COLD thresholds used by Lead Scoring |
| `followup_sequence_days` | e.g. `[0, 2, 5, 9]` — the follow-up cadence |
| `autonomous_mode` | `false` by default; flips human-approval requirement (not yet wired to an auto-send path — see below) |
| `pricing_info` | what the AI is allowed to say when asked about price — **fill this in**, it's a TODO placeholder by default, and the AI is instructed to hand off to you instead of guessing |
| `demo_booking_url` | fallback demo link |
| `notification_channel` | where human-handoff / demo-booked alerts go (email + optional Telegram chat id) |

> ⚠️ The migration workflow (`Sales - DB Schema Setup`, kept in n8n for re-runs) hit a
> **DNS "Host not found"** error on the existing Postgres credential when this was
> built — the Supabase host may be paused or the credential stale. Fix the credential
> in n8n, then re-run that workflow once (Execute → manual) before using the system.

### n8n workflows (all prefixed `Sales -`)

| Workflow | Trigger | Purpose |
|---|---|---|
| Lead Intake | `POST /webhook/sales/leads-intake` | Validates + inserts a lead, kicks off scoring. **Primary integration point.** |
| Lead Scoring | Execute Workflow (internal) | 0-100 score + temperature from `settings.scoring_rules`. |
| AI Message Generation | `POST /webhook/sales/messages/generate` (+ internal) | Drafts a short personalized Arabic outreach/follow-up message, Gemini. |
| Message Approval & Send | `POST /webhook/sales/messages/approve` | Sends the approved message via WhatsApp, schedules first follow-up. |
| Incoming Message Processing | WhatsApp Trigger | Matches inbound replies to a lead by phone, logs them, triggers analysis. |
| AI Conversation Analysis | Execute Workflow (internal) | Classifies replies (INTERESTED / PRICE_QUESTION / READY_TO_BUY / STOP_CONTACT / …), updates the lead, drafts a reply or triggers Human Handoff. |
| Follow-up Engine | Daily 9am schedule | Drafts Day 2/5/9 nudges for leads that never replied; stops after the final one or on any reply. |
| Demo Booking | `POST /webhook/sales/demo/book` | Creates an appointment, pauses automation, notifies you. |
| Human Handoff Notification | Execute Workflow (internal) | Emails/Telegrams you and flags `needs_human` whenever the AI decides you should take over. |
| Analytics Digest | Weekly Monday 8am schedule | Emails a simple funnel-count summary. |

Webhook URLs are `{N8N_WEBHOOK_URL}/webhook/<path>` (e.g. `/webhook/sales/leads-intake`).

**WhatsApp send node** needs your Meta Business phoneNumberId filled in (it's left as
an n8n placeholder on the "Send WhatsApp Message" node in *Message Approval & Send*).
The **WhatsApp Trigger** also needs its webhook subscribed in the Meta developer
console before inbound replies will arrive.

### Dashboard (`dashboard/`)

A small Next.js app, internal use only (no auth built in — deploy it somewhere only
you can reach, or add auth yourself before exposing it publicly).

- `/` — funnel counts + funnel chart, human-action-required banner
- `/leads` — table: company, contact, score, temperature, status, last contact, next
  follow-up, recommended next action
- `/leads/[id]` — company info, score breakdown, AI's recommended next action,
  conversation history, follow-ups, activity log, and action buttons: Generate
  Message, Approve & Send, Generate Follow-up, Mark Interested, Book Demo, Mark Won,
  Mark Lost, Pause/Resume Automation
- `/leads/new` — manual entry form
- `/leads/import` — CSV import (same field names as the webhook schema)

The dashboard reads Postgres directly for everything it displays, and calls the n8n
webhooks above for anything that needs AI generation or a messaging credential (it
never touches WhatsApp/Gemini credentials itself). Status-only changes (Mark
Won/Lost/Interested, Pause Automation) write straight to Postgres — no AI involved.

Setup:

```bash
cd dashboard
cp .env.example .env.local   # fill in DATABASE_URL and N8N_WEBHOOK_URL
npm install
npm run dev
```

### Lead input schema (webhook / CSV / manual entry all use this)

```json
{
  "company_name": "",
  "contact_name": "",
  "phone": "",
  "email": "",
  "website": "",
  "instagram": "",
  "business_type": "",
  "source": "",
  "notes": ""
}
```

### Messaging abstraction

Nothing hardcodes WhatsApp beyond the one "Send WhatsApp Message" node in *Message
Approval & Send* and the WhatsApp Trigger in *Incoming Message Processing*. The
`messages` table has a `channel` column (`whatsapp` / `email` / `instagram` /
`telegram`) so adding a channel later means adding a send node + trigger for it, not
redesigning the schema or dashboard.

### Security

No API keys are hardcoded anywhere in this repo. n8n workflows use n8n's own stored
credentials (never exported in plaintext by the tools used to build them). The
dashboard reads `DATABASE_URL` / `N8N_WEBHOOK_URL` from environment variables only —
see `.env.example` (root) and `dashboard/.env.example`.

### What's intentionally not built (per MVP scope)

Billing, multi-tenant accounts, customer logins, autonomous auto-send (approval is
required by default), and elaborate analytics beyond the funnel counts + weekly
digest.

---

## n8n-mcp

This project is configured to use [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), a Model Context Protocol server that gives AI assistants structured access to n8n's nodes, documentation, and workflow validation tools.

The server is registered in [`.mcp.json`](.mcp.json) and runs via `npx n8n-mcp`, so no separate install step is required — Claude Code (or any MCP-compatible client) will fetch and launch it automatically.

By default it runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work out of the box with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, `.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from your environment (`${N8N_API_URL}` / `${N8N_API_KEY}`) rather than hardcoding them, since this repository is public and these are sensitive credentials.

1. Copy `.env` (already present locally, git-ignored) or create your own with:
   ```
   N8N_API_URL=https://your-n8n-instance.com
   N8N_API_KEY=your-api-key
   ```
2. Load it into your shell before starting your MCP client, e.g.:
   ```bash
   set -a && source .env && set +a
   ```
3. Restart your MCP client (or run `/mcp` in Claude Code) to pick up the change.

**Never commit `.env`** — it's listed in `.gitignore` for exactly this reason. If this repository is ever made private, credentials can instead be hardcoded directly in `.mcp.json` if preferred.
