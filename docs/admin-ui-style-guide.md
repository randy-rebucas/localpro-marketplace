# Admin UI Style Guide

Reference for the full-screen, two-column admin settings layout used in
`src/app/(dashboard)/admin/settings/AppSettingsClient.tsx`.
Reuse these patterns for any admin detail/settings page.

---

## Layout Shell

```tsx
<div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900">
  <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    {/* sidebar */}
  </aside>
  <div className="flex-1 flex flex-col min-w-0">
    {/* main content */}
  </div>
</div>
```

- **Outer shell**: `flex h-full min-h-screen` — fills the viewport, honours the parent dashboard layout height.
- **Sidebar**: fixed `w-56`, hidden on mobile (`hidden md:flex`), white/slate-800 background, right border separator.
- **Main area**: `flex-1 flex flex-col min-w-0` — grows to fill remaining space, `min-w-0` prevents flex overflow.

---

## Sidebar

### Header
```tsx
<div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  </div>
  <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
    Section Title
  </span>
</div>
```

### Nav Items
```tsx
<nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
  {/* inactive */}
  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
    text-slate-500 dark:text-slate-400
    hover:bg-slate-50 dark:hover:bg-slate-700/40
    hover:text-slate-800 dark:hover:text-slate-200 transition-all text-left">
    <Icon /> Label
  </button>

  {/* active */}
  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
    bg-blue-50 dark:bg-blue-900/30
    text-blue-700 dark:text-blue-300 text-left">
    <Icon className="text-blue-500 dark:text-blue-400" /> Label
  </button>
</nav>
```

- Dirty dot: `<span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />`

### Sidebar Footer (actions)
```tsx
<div className="border-t border-slate-100 dark:border-slate-700 px-3 py-4 space-y-2">
  {/* save button */}
  <button className="w-full inline-flex items-center justify-center gap-2
    bg-blue-600 hover:bg-blue-700
    disabled:bg-slate-100 dark:disabled:bg-slate-700
    disabled:text-slate-400 dark:disabled:text-slate-500
    disabled:cursor-not-allowed
    text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
    <SaveIcon /> Save Changes
  </button>
  {/* keyboard hint */}
  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
    <kbd className="font-mono">Ctrl S</kbd> to save
  </p>
</div>
```

---

## Top Bar (main area header)
```tsx
<header className="flex items-center justify-between gap-4 px-6 py-4
  border-b border-slate-200 dark:border-slate-700
  bg-white dark:bg-slate-800">
  <div>
    <h1 className="text-base font-bold text-slate-800 dark:text-white">Page Title</h1>
    <p className="text-xs text-slate-500 dark:text-slate-400">Subtitle</p>
  </div>
  <div className="flex items-center gap-2">
    {/* icon button */}
    <button className="p-2 rounded-lg border border-slate-200 dark:border-slate-700
      text-slate-500 hover:text-slate-800 dark:hover:text-white
      hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
      <Icon className="h-4 w-4" />
    </button>
  </div>
</header>
```

---

## Scrollable Content Area
```tsx
<div className="flex-1 overflow-y-auto p-6 space-y-4">
  {/* content */}
</div>
```

---

## Banners

### Warning (amber)
```tsx
<div className="flex items-start gap-3 rounded-xl
  border border-amber-300 bg-amber-50
  dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3">
  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Title</p>
    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Body text.</p>
  </div>
</div>
```

### Error (red)
```tsx
<div className="rounded-lg border border-red-200 bg-red-50
  dark:border-red-800 dark:bg-red-900/20 px-4 py-3
  text-sm text-red-700 dark:text-red-300">
  Error message
</div>
```

### Success inline text
```tsx
<span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
  <CheckCircle2 className="h-4 w-4" /> Saved
</span>
```

---

## Settings Card

```tsx
<div className="rounded-2xl border border-slate-200 dark:border-slate-700
  bg-white dark:bg-slate-800 shadow-sm
  divide-y divide-slate-100 dark:divide-slate-700">

  {/* Card header */}
  <div className="px-5 py-3.5 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <span className="text-slate-400 dark:text-slate-500"><Icon /></span>
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        Section
      </h2>
    </div>
    {/* optional action */}
    <button className="inline-flex items-center gap-1 text-xs
      text-slate-400 dark:text-slate-500
      hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
      <RotateCcw className="h-3 w-3" /> Reset
    </button>
  </div>

  {/* Row */}
  <div className="flex items-center justify-between gap-4 px-5 py-4
    hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
    <label htmlFor="setting-key" className="min-w-0 flex-1 cursor-pointer">
      <p className="text-sm font-medium text-slate-800 dark:text-white">Label</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Description.</p>
    </label>
    {/* control */}
  </div>

</div>
```

### Row state variants
| State | Classes added to row |
|---|---|
| Default | `hover:bg-slate-50 dark:hover:bg-slate-700/30` |
| Changed | `bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20` |
| Danger ON | `bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20` |

"Changed" label badge:
```tsx
<span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400">
  changed
</span>
```

---

## Controls

### CSS Toggle Switch
```tsx
function Toggle({ checked, onChange, id, danger }: {
  checked: boolean; onChange: () => void; id: string; danger?: boolean;
}) {
  const activeColor = danger
    ? "bg-amber-500 focus-visible:ring-amber-400"
    : "bg-blue-600 focus-visible:ring-blue-500";
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center
        rounded-full border-2 border-transparent transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${checked ? activeColor : "bg-slate-200 dark:bg-slate-600 focus-visible:ring-slate-400"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
        transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
```

### Number Input with prefix/suffix unit
```tsx
<div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600
  bg-slate-50 dark:bg-slate-700 overflow-hidden
  focus-within:ring-2 focus-within:ring-blue-500">
  {/* prefix (₱) */}
  <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400
    border-r border-slate-200 dark:border-slate-600
    bg-slate-100 dark:bg-slate-600/50 select-none">₱</span>
  <input type="number"
    className="w-20 bg-transparent text-slate-800 dark:text-white text-sm px-3 py-1.5 text-right focus:outline-none" />
  {/* suffix (%) — swap prefix for suffix */}
  <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400
    border-l border-slate-200 dark:border-slate-600
    bg-slate-100 dark:bg-slate-600/50 select-none">%</span>
</div>
```

---

## Skeleton Loading Row
```tsx
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-72 rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    </div>
  );
}
```

---

## Mobile Tab Strip (shown instead of sidebar on small screens)
```tsx
<div className="md:hidden flex gap-1 p-2 bg-slate-100 dark:bg-slate-800
  border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
  <button className="relative flex-shrink-0 inline-flex items-center gap-1.5 py-1.5 px-3
    rounded-lg text-xs font-medium whitespace-nowrap
    bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"> {/* active */}
    <Icon /> Label
    {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
  </button>
</div>
```

---

## Colour / Token Quick Reference

| Purpose | Light | Dark |
|---|---|---|
| Page background | `bg-slate-50` | `dark:bg-slate-900` |
| Card / sidebar surface | `bg-white` | `dark:bg-slate-800` |
| Border (default) | `border-slate-200` | `dark:border-slate-700` |
| Divider (subtle) | `divide-slate-100` | `dark:divide-slate-700` |
| Body text | `text-slate-800` | `dark:text-white` |
| Muted text | `text-slate-500` | `dark:text-slate-400` |
| Active nav bg | `bg-blue-50` | `dark:bg-blue-900/30` |
| Active nav text | `text-blue-700` | `dark:text-blue-300` |
| Primary action | `bg-blue-600 hover:bg-blue-700` | same |
| Disabled control | `bg-slate-100 text-slate-400` | `dark:bg-slate-700 dark:text-slate-500` |
| Warning surface | `bg-amber-50 border-amber-300` | `dark:bg-amber-900/20 dark:border-amber-700` |
| Error surface | `bg-red-50 border-red-200` | `dark:bg-red-900/20 dark:border-red-800` |
| Success text | `text-emerald-600` | `dark:text-emerald-400` |
| Dirty dot | `bg-amber-400` | same |
