# Nothing — engineering scaffold

Vite + React 18 + React Router 6. Every surface from the design canvas
exists here as a real route component. Drop into your stack as-is, or
copy modules out piece by piece.

```bash
npm install
npm run dev
# open http://localhost:5173
```

## Layout

```
src/
  main.jsx              — Router setup
  App.jsx               — Layout wrapper (outlet for routes)
  styles.css            — Global tokens, font-swap CSS, accent overrides
  tokens.js             — Color / type / spacing values as JS constants
  data/sample.js        — Hard-coded sample data matching the spec shapes
  components/
    AppSidebar.jsx      — Persistent left nav (Mail / Projects / Manage)
    IOSDevice.jsx       — iPhone bezel for mobile-route renders
    Steps.jsx           — Setup-wizard step indicator
  pages/
    Landing.jsx
    Setup*.jsx          — Step 1 · 2A · 2B · 5 · Register
    Inbox.jsx
    Sent.jsx
    MessageDetail.jsx
    Compose.jsx
    Tokens.jsx
    Settings.jsx
    States.jsx          — All 5 edge states bundled
    Globals.jsx         — Toasts · ⌘K · Notifications
    Mobile*.jsx         — Inbox · Detail · QuickReply · Settings · Tokens · Notifications
```

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | Landing | Public marketing |
| `/setup` | SetupStep1 | Mode select |
| `/setup/dns` | SetupStep2A | Domain + DNS verification |
| `/setup/email` | SetupStep2B | Email-mode provider picker |
| `/setup/done` | SetupStep5 | CLI + MCP install |
| `/register` | Register | Handle picker + Master Token reveal |
| `/inbox` | Inbox | List |
| `/sent` | Sent | List with 6 delivery states |
| `/messages/:id` | MessageDetail | Code context · thread · reply |
| `/compose` | Compose | Code-context as first-class panel |
| `/tokens` | Tokens | API tokens · create modal |
| `/settings` | Settings | Account · instance · usage · danger zone |
| `/states/:kind` | States | empty · caught · loading · down · auth |
| `/globals/:kind` | Globals | toasts · cmdk · notif |
| `/m/:screen` | Mobile* | All mobile screens |

## Notes for engineering

- **Inline styles, no CSS-in-JS framework.** Every component uses a `style={{ ... }}`
  object so the design is readable next to the markup. Replace with your CSS
  solution of choice — the tokens in `tokens.js` are the only thing you need to
  keep stable across migrations.
- **Sample data is fake.** Wire each page's data prop / fetch hook to the real API.
- **Yellow accent is structural.** Don't add yellow to elements that aren't
  documented as accent slots in `Nothing — Handoff.html`.
- **Body tokens** for live skin: `data-display` (font), `data-subject` (list
  subjects), `data-accent` (yellow swap). The CSS in `styles.css` reads them.
