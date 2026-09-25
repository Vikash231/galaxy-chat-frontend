# Galaxy Agent Chat: frontend

The chat UI for the agent chat. The backend (API, worker, database) is a separate repo: `galaxy-chat-backend`.

Stack: Next.js App Router, React, TypeScript (strict), Clerk, TanStack Query, Zustand, shadcn/ui + Tailwind, Trigger.dev realtime hooks.

## Run locally

```bash
pnpm install
cp .env.example .env.local     # Clerk keys + NEXT_PUBLIC_API_URL
pnpm dev                       # http://localhost:3001 (backend API on :3000, worker running)
```

API types are generated from the backend contract: `pnpm gen:api` (reads `$API_URL/api/openapi.json`).

## How it fits together

- `src/lib/api/client.ts`: the only HTTP client. Typed from `schema.d.ts`; attaches the Clerk token and a request id.
- `src/lib/api/queries.ts`: TanStack Query hooks for server state (chats, messages, runs).
- `src/lib/live-runs.ts`: Zustand store of the run each chat is streaming.
- `src/lib/realtime/use-live-run.ts`: subscribes to Trigger.dev run metadata and the `assistant` token stream. It falls back to polling `GET /runs/:id` when realtime drops, refreshes the read token before it expires, and re-attaches after a reload.
- `src/components/chat/*`: sidebar, composer, message blocks, tool card, live reply.
