# Onboard Harness

A desktop "working OS" for non-technical teams: chat with agents, approve their actions, browse the workspace folder, watch dashboards and goals, and customise skills, rules and automations.

**This is a UI prototype.** All data is sample data and nothing talks to a backend or a model yet.

## Run

```bash
npm install
npm run dev              # browser, http://localhost:3210
npm run desktop          # Electron window on the dev server
npm run desktop:preview  # static export loaded inside Electron
```

## Font

The interface is set in **IRANYekanX (FaNum)**. It is a licensed font and is not included in this repository; install it on your machine and the app picks it up. Without it the UI falls back to Vazirmatn, Segoe UI or Tahoma.

## Stack

Next.js 16, React 19, Tailwind CSS v4, Radix UI, Phosphor icons, zustand, Recharts, Tiptap, AG Grid, react-resizable-panels, Electron. Persian, right-to-left, light and dark themes.
