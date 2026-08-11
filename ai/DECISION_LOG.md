# PG Hunter â€” Decision Log

## Decision Template

### Decision
[What was decided]

### Date
[YYYY-MM-DD]

### Reason
[Why]

### Alternatives
[What else was considered]

### Impact
[Technical/product/business impact]

### Status
Approved / Superseded / Rejected

---

## Decision #001
### Decision
PG Hunter is the current product scope. Hunterz is not part of the active build.

### Reason
Prove the accommodation marketplace and management product before expanding.

### Status
Approved

---

## Decision #002
### Decision
The approved homepage screenshot is the visual source of truth.

### Reason
The founder has explicitly selected this design direction.

### Status
Approved

---

## Decision #003
### Decision
Use Astro 6 with a static-first/islands architecture.

### Reason
PG Hunter is content-heavy and discovery/search pages benefit from fast HTML delivery.

### Status
Approved

---

## Decision #004
### Decision
Use YouTube for initial property video hosting.

### Reason
Avoid the cost and complexity of custom video infrastructure during validation.

### Status
Approved

---

## Decision #005
### Decision
Start with Cloudflare Workers + D1 as the core backend/data architecture.

### Reason
It aligns the application with the Cloudflare deployment and edge database strategy.

### Status
Approved

---

## Decision #006
### Decision
Do not build PG Management before the discovery/lead foundation is stable.

### Reason
Discovery is the initial acquisition engine. Management becomes the retention layer.

### Status
Approved


# Cloudflare Architecture Decisions â€” Final Decision Record

## Astro 6
Status: LOCKED

PG Hunter remains Astro 6 + Islands Architecture. The project will not switch to Next.js.

## Cloudflare Workers
Status: LOCKED

Workers provide the server/API layer around the Astro application and Cloudflare services.

## Cloudflare D1
Status: LOCKED

D1 is the primary SQL datastore for the MVP.

## Cloudflare R2
Status: LOCKED

R2 is the planned storage layer for property photos and controlled/private files when needed.

## YouTube for MVP videos
Status: LOCKED

Property walkthrough videos are initially hosted on YouTube to keep video infrastructure simple and low-cost. Cloudflare Stream is postponed.

## SQL search first
Status: LOCKED

D1 SQL filtering is sufficient for initial PG discovery. Vectorize and semantic search are postponed.

## AI later
Status: LOCKED

The AI Matchmaker is a later interactive feature. An LLM can eventually translate natural-language requirements into structured filters executed against D1. Custom model training is not a prerequisite.

## Verification is a state
Status: LOCKED

Use:
- unverified
- pg_hunter_verified
- rishabh_irl_verified

"Verified by Rishabh IRL" is a core trust/brand concept.

## Room-level pricing
Status: LOCKED

A property can contain different room/occupancy types with different rents.

## Turnstile tokens are not stored
Status: LOCKED

Turnstile is a server-side anti-bot verification mechanism, not application data.

## Privacy-first contact flow
Status: LOCKED

Student and owner contact information should not be unnecessarily exposed. Leads should initially flow through PG Hunter.

## Architecture Principle

Use Cloudflare-native infrastructure where it provides clear value, while deliberately postponing advanced services until real product requirements justify them.


# Cloudflare Architecture Decisions — Final Decision Record

## Astro 6

Status: LOCKED

PG Hunter remains Astro 6 + Islands Architecture. The project will not switch to Next.js.

## Cloudflare Workers

Status: LOCKED

Workers provide the server/API layer around the Astro application and Cloudflare services.

## Cloudflare D1

Status: LOCKED

D1 is the primary SQL datastore for the MVP.

## Cloudflare R2

Status: LOCKED

R2 is the planned storage layer for property photos and controlled/private files when needed.

## YouTube for MVP Videos

Status: LOCKED

Property walkthrough videos are initially hosted on YouTube to keep video infrastructure simple and low-cost.

Cloudflare Stream is postponed.

## SQL Search First

Status: LOCKED

D1 SQL filtering is sufficient for initial PG discovery.

Vectorize and semantic search are postponed.

## AI Later

Status: LOCKED

The AI Matchmaker is a later interactive feature.

An LLM can eventually translate natural-language requirements into structured filters executed against D1.

Custom model training is not a prerequisite.

## Verification Is a State

Status: LOCKED

Use:

- `unverified`
- `pg_hunter_verified`
- `rishabh_irl_verified`

"Verified by Rishabh IRL" is a core trust/brand concept.

## Room-Level Pricing

Status: LOCKED

A property can contain different room/occupancy types with different rents.

## Turnstile Tokens Are Not Stored

Status: LOCKED

Turnstile is a server-side anti-bot verification mechanism, not application data.

## Privacy-First Contact Flow

Status: LOCKED

Student and owner contact information should not be unnecessarily exposed.

Leads should initially flow through PG Hunter.

## Architecture Principle

Use Cloudflare-native infrastructure where it provides clear value, while deliberately postponing advanced services until real product requirements justify them.