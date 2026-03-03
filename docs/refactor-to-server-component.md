# Refactor Page to Server-Component Architecture

Refactor `src/app/(dashboard)/[ROLE]/[PAGE_NAME]/page.tsx` from a monolithic `"use client"` component into a server-component architecture following the project's established pattern.

## Pattern

| File | Role |
|------|------|
| `page.tsx` | Async server component. Auth guard + `<Suspense>` wrapper. |
| `_components/skeletons.tsx` | Named skeleton exports using `animate-pulse` + `bg-slate-100`. |
| `_components/[Name]Content.tsx` | Async server component. All DB/service fetches, serializes data, renders `<[Name]Client>`. |
| `_components/[Name]Client.tsx` | `"use client"`. Receives pre-fetched data as props, owns all state and interactivity. |

## File Templates

### `page.tsx`
```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { [Name]Skeleton } from "./_components/skeletons";
import [Name]Content from "./_components/[Name]Content";

export const metadata: Metadata = { title: "[Page Title]" };

export default async function [Name]Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<[Name]Skeleton />}>
      <[Name]Content userId={user.userId} />
    </Suspense>
  );
}
```

### `_components/[Name]Content.tsx`
```tsx
import { someService } from "@/services/some.service";
import { someRepository } from "@/repositories/some.repository";
import [Name]Client, { type [Name]Data } from "./[Name]Client";

export default async function [Name]Content({ userId }: { userId: string }) {
  const [a, b] = await Promise.all([
    someService.getX(userId),
    someRepository.getY(userId),
  ]);

  const data: [Name]Data = JSON.parse(JSON.stringify({ a, b }));

  return <[Name]Client data={data} />;
}
```

### `_components/[Name]Client.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetchClient";

export interface [Name]Data {
  // ... typed fields
}

export default function [Name]Client({ data }: { data: [Name]Data }) {
  const router = useRouter();

  async function handleMutation() {
    await apiFetch("/api/...", { method: "POST", ... });
    router.refresh(); // re-runs server component for fresh data
  }

  return (
    // JSX
  );
}
```

### `_components/skeletons.tsx`
```tsx
export function [Name]Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Mirror the real layout with bg-slate-100 placeholder shapes */}
      <div className="h-8 w-48 rounded bg-slate-100" />
      <div className="h-48 rounded-xl bg-slate-100" />
    </div>
  );
}
```

## Project Conventions

- **Path alias**: `@/*` → `src/*`
- **Tailwind custom classes**: `btn-primary`, `btn-outline`, `shadow-card`, `shadow-card-hover`, `input`
- **Auth**:
  - Server components → `getCurrentUser()` from `@/lib/auth`
  - API routes → `requireUser()` from `@/lib/auth`
- **DB**: Import services from `@/services` and repositories from `@/repositories` — they call `connectDB()` internally. Do **not** call `connectDB()` directly in server components.
- **Serialization**: Always `JSON.parse(JSON.stringify(...))` data before passing across the server→client boundary.
- **Mutations**: Client components call `router.refresh()` after successful mutations — never manually re-fetch in `useEffect`.
- **Heavy modals**: `dynamic(() => import("..."), { ssr: false })` for client-only modals (e.g. `DirectJobModal`).
- **API calls from client**: Use `apiFetch` from `@/lib/fetchClient`, not raw `fetch`.

## Checklist

- [ ] `skeletons.tsx` created with shapes matching the real page layout
- [ ] `[Name]Client.tsx` created — `"use client"`, props-driven, no direct DB calls
- [ ] `[Name]Content.tsx` created — server component, parallel fetches, serialized data
- [ ] `page.tsx` rewritten — server component, auth guard, `<Suspense>` wrapper
- [ ] All four files report **zero TypeScript errors**
