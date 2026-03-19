# Paycor × Conquer AI — Document Collection POC

> **Live POC** | Built by Conquer AI | March 2026 | CONFIDENTIAL

---

## What This Is

A working proof-of-concept web application that demonstrates the Document Collection Agent for Paycor's sales process. This is **not a slideshow**. It is functional software powered by Claude AI that solves the exact problem Paycor sellers face every day.

Open `index.html` in a browser. Add your Anthropic API key to `config.js`. Use it.

---

## The Problem We Are Solving

Paycor has ~400–500 sellers. Each one spends **more than 50% of their time** on administrative document collection during the sales cycle — not selling.

The specific failures, confirmed in discovery sessions (23 Feb 2026) with Cliff Soli and Natalie Hernandez:

| Pain Point | What Actually Happens |
|---|---|
| No centralised checklist | Sellers determine document requirements from **memory and informal Excel files** |
| One-at-a-time DocuSign | Requests sent manually, one by one, no tracking |
| Multi-EIN chaos | Natalie submitted **89 separate DocuSigns** for a single deal |
| State-specific blindspots | Cliff described deals **rejected after submission** because state notarisation wasn't flagged |
| No completeness check | Arctic Breeze WOTC form passed with a **blank required phone number** — undetected |
| Manual acceptance queue | 6–10 people manually checking signatures and completeness for every deal |

---

## The Three POC Components

### 1. CSA-Driven Checklist Generator
**Tab: Deal Checklist**

The Order for Services (CSA) is the master document. It determines everything. A seller enters the products sold, EIN count, and states — the system generates the exact document list with quantities, field requirements, and collection priorities.

No memory required. No Excel. No guesswork.

### 2. Document Completeness Validator  
**Tab: Doc Validator**

Submit a document — the AI validates it field-by-field against the required schema for that document type. It flags gaps, scores completeness 0–100, and produces a deal-readiness verdict.

Load the **Arctic Breeze example** to see it catch the blank phone number that the current process missed.

### 3. Multi-EIN Entity Tracker
**Tab: EIN Tracker**

Enter all entities in the deal. The system identifies shared data (fill once, apply everywhere) vs entity-specific data. Each entity gets its own document status. One view. No more 89 DocuSigns tracked in someone's inbox.

---

## Setup

```bash
# 1. Clone
git clone https://github.com/conquer-ai-solutions/paycor.git
cd paycor

# 2. Add API key
# Open config.js and replace YOUR_ANTHROPIC_API_KEY_HERE

# 3. Open
open index.html
# or serve locally: python3 -m http.server 8080
```

No build step. No dependencies. Pure HTML/CSS/JS.

---

## Document Knowledge Base

The AI has been trained on the real documents Kelly shared:

- **Order for Services (CSA)** — Arctic Breeze Holdings LLC, signed 2/2/2026
- **Bank Authorization** — UMB, NA | Routing 101000695
- **MICR Spec Sheet** — Deluxe format, linked to Bank Auth
- **IRS Form 8655** — Reporting Agent Authorization, Paycor Inc. as agent
- **WOTC Agreement (Equifax)** — Equifax Workforce Solutions, 15% fee structure
- **Florida DR-835** — State POA, Reemployment Tax, Paycor as agent

All document schemas, required fields, validation rules, and state-specific logic come directly from these real documents.

---

## Architecture

```
Browser (HTML/CSS/JS)
    │
    ├── View 1: Checklist Generator
    │     └── Claude API → Structured JSON document list
    │
    ├── View 2: Document Validator  
    │     └── Claude API → Completeness score + field-level gaps
    │
    └── View 3: Multi-EIN Tracker
          └── Claude API (streaming) → Entity analysis + shared data plan
```

The Anthropic API is called directly from the browser (Anthropic's CORS policy supports this for POC use). For production, calls route through a server-side proxy.

---

## What This POC Proves

| Success Criterion | Test |
|---|---|
| CSA → correct checklist | Enter Arctic Breeze deal data. Verify output matches known document set. |
| Completeness detection | Load Arctic Breeze WOTC example. System must flag blank phone number. |
| Multi-EIN separation | Add 2+ entities. Verify shared docs identified, per-entity docs separated. |
| Mobile-friendly | Open on phone. Every interaction must work. |

---

## What Comes Next

This POC proves the core logic. Phase 1 builds the production system:

- **Salesforce integration** — reads deal data directly from CRM (no manual entry)
- **DocuSign webhook** — tracks signature status in real time
- **Automated chase engine** — sends reminders without seller involvement
- **Deal acceptance queue** — clean deals auto-approve, exceptions flagged

Phase 2 is the customer-facing portal Kelly described — agentic assistance that guides the client through collection without seller involvement.

---

## Contacts

| Name | Role | Email |
|---|---|---|
| Thomas Buckley | CTO, Conquer AI | tom@conquer.ai |
| Bolaji Olatoye | Head of AI Solutions | bolaji@conquer.ai |
| Luke Morrisen | AI Solutions Lead | luke.morrisen@conquer.ai |

---

*Conquer AI © 2026 | Built from real engagements | Extraction-first architecture | Your IP, your cloud*
