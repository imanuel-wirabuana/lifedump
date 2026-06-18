<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Instructions

* **Read the Docs First**: You MUST read [DOCS.md](file:///c:/Users/901698/Desktop/.me/coding/lifedump/DOCS.md) at the beginning of every prompt to ensure you understand the current state, architecture, database schemas, and workflows of the application.
* **Always Plan First**: You MUST always plan first before starting execution on any changes.
* **Keep Docs Updated**: You MUST update [DOCS.md](file:///c:/Users/901698/Desktop/.me/coding/lifedump/DOCS.md) immediately after making any changes (adding features, changing schemas, deleting components, or modifying workflow paths) to keep the documentation perfectly in sync with the repository.
* **Real-time Reads Required**: All read operations must be real-time. Use Firestore real-time listeners (`onSnapshot` mapped into the global `<FirestoreRealtimeSync />` context/TanStack Query cache) for all user-facing UI content. Do NOT use static `getDocs` or `getDoc` calls for fetching list/feed data in views.

## Project Skills

Use the local skills in `@[.agents]` / `.agents/skills/` when their triggers match:

- `caveman` — terse communication mode.
- `next-best-practices` — Next.js file conventions, RSC boundaries, async APIs, routing, metadata, errors, data patterns.
- `ponytail` — minimal/YAGNI mode for simplest working solution, shortest path, and avoiding over-engineering.
- `shadcn` — shadcn/ui component usage, composition, CLI, and project rules.
- `vercel-react-best-practices` — React/Next.js performance optimization guidelines.
