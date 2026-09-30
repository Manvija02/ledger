# Ledger: AI Tax Platform Prototype

A working, click-through prototype built for an AI Engineer case study,
covering 10 product design challenges for a greenfield tax platform: source
traceability, client/CPA collaboration, first-time onboarding, navigation,
role-aware experiences, status and progress, an actionable dashboard,
clickable-vs-editable affordances, complexity at scale, and trustworthy AI.

Built as one cohesive product rather than 10 disconnected demo screens: six
account roles share the same shell, navigation, and data model.

## Live demo

[Add your hosted link here, e.g. Netlify]

## Tech stack

- React 18
- Vite
- react-router-dom

No backend. All data is fabricated and lives in memory for the session.

## Getting started

Clone the repo, then:

```bash
npm install
npm run dev
```

This starts a local dev server (Vite will print the address, typically
`http://localhost:5173`).

To produce a production build:

```bash
npm run build
```

This outputs a static `dist` folder that can be deployed anywhere that
serves static files (Netlify, Vercel, GitHub Pages, etc). A `_redirects`
file is included for Netlify so client-side routes resolve correctly on
refresh; if deploying elsewhere, add an equivalent single-page-app rewrite
rule pointing all paths to `index.html`.

## Trying it out

The account switcher (top right) simulates logging in as six different
people. A good tour:

1. **David Chen** (client, first-time filer): onboarding flow, real file
   upload, dynamic document predictions based on your answers.
2. **Maria Alvarez** (client, active return): status page, messages.
3. **Jordan Blake** (preparer): dashboard, Review & Traceability, AI
   Insights, editing and correcting a field.
4. **Sam Okafor** (reviewer) and **Ren Osei** (seasonal staff): the same
   shell adapting to different permission levels.
5. **Lee Park** (firm administrator): firm-wide view across all returns.

## What's genuinely wired up (real interaction logic, not just static UI)

- **Navigation.** Real URL routing for every screen (deep-linkable, survives
  a refresh), breadcrumbs derived from the actual route, and a "last visited
  tab" memory so returning to a return resumes where you left off instead of
  always landing on Status.
- **Role switching.** Six accounts, one shared shell. Navigation, dashboard
  scope, and available actions all genuinely change based on who's logged
  in, including explicit permission boundaries: seasonal staff and clients
  see disabled actions with a stated reason, not just a missing button.
- **Search and filtering.** Real, live filtering on the Documents tab and
  All Returns, tested against actual volume: roughly 180 generated returns
  and 2,300 generated documents, with one return's document category
  deliberately large enough to force real pagination ("show all N").
- **Dashboard prioritization.** Tasks are actually sorted by urgency and due
  date via real logic, capped at 10 with a working "show all," not a
  hardcoded order.
- **Source traceability.** Clicking a return field opens its real linked
  document, highlights the correct region, and, for multi-page documents,
  opens to the actual page that field came from.
- **Manual correction.** Editable fields can actually be edited: a real
  input, a save action, and a visible "corrected by [name], was $X" trail.
- **AI Insights actions.** Accept, Correct, and Dismiss are functional.
  Accepting a flag that's linked to a specific field updates that field's
  status back in Review & Traceability, so the two screens agree with each
  other instead of independently describing the same fact.
- **Messages.** Grouped into real threads by what they're about (a document,
  a field, or a task), with working internal-vs-client-visible filtering,
  and thread headers that open the actual linked item.
- **Document upload (onboarding).** Opens a real file picker; selecting a
  file adds an actual document to that client's account, reflected
  immediately in their document count and Documents tab.
- **Keyboard accessibility.** Every clickable row (dashboard cards, return
  lists, document rows, field rows) is a real, Tab-focusable, Enter/Space-
  activatable element, not an unfocusable `<div>`.

## What's simulated

- **The AI itself.** Every confidence score, piece of evidence, and
  recommendation is authored fake data, not computed. There's no real OCR,
  no real extraction model, no real API call.
- **Persistence.** Everything lives in memory for the session only. Field
  verifications, corrections, AI flag decisions, and uploaded documents all
  reset on a page refresh; there's no backend or database.
- **Authentication.** The account switcher is a labeled "simulated login,"
  not real auth. Switching accounts is meant to demonstrate role
  architecture, not to be a production sign-in flow.

## Decisions worth explaining

- **One indigo accent, reserved only for "this came from the AI."** Used
  consistently for AI-generated tags, confidence meters, and flags across
  every screen, so the signal only has to be learned once.
- **Clients see a simplified version of AI Insights:** plain-language cards,
  no confidence percentages or correction controls, while staff see the
  full technical view on the same return.
- **Status copy is written for two audiences from the same data.** An
  internal stage name and a plain-English, client-facing sentence are
  stored together per stage, so the same underlying status renders
  differently depending on who's looking, without duplicating the state
  itself.
- **Scale was treated as a real design constraint, not an afterthought.**
  The dataset was deliberately generated large enough (documents, returns,
  and tasks) that search, filtering, and prioritization had to actually
  work under volume rather than only ever being demonstrated against a
  handful of tidy example rows.

## Project structure

```
src/
  data.js               fabricated data: users, returns, documents, tasks, messages, AI flags
  UserContext.jsx        simulated login, session state shared across tabs
  App.jsx                route definitions
  components/            shared UI: Sidebar, Breadcrumbs, RoleSwitcher, DocumentsList, MessagesPanel, DocumentViewer
  pages/                 top-level screens: Dashboard, ClientHome, AllReturns, etc.
  pages/tabs/             the five tabs inside a return: Status, Review & Traceability, Documents, Messages, AI Insights
```
