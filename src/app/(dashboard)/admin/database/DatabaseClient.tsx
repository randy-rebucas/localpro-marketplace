"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Database,
  RefreshCw,
  Trash2,
  RotateCcw,
  Sprout,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  HardDrive,
  Table,
  Shield,
  Download,
  Upload,
  FileJson,
} from "lucide-react";

interface CollectionStat {
  name: string;
  label: string;
  count: number;
  exists: boolean;
}

interface DbStats {
  collections: CollectionStat[];
  dbName: string;
  storageSize: number;
  dataSize: number;
  indexSize: number;
  totalCollections: number;
}

type ActionType = "full_reset" | "seed_only" | "clear_collection";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function ConfirmDialog({
  action,
  collection,
  onConfirm,
  onCancel,
}: {
  action: ActionType;
  collection?: string;
  onConfirm: (token: string) => void;
  onCancel: () => void;
}) {
  const [token, setToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const LABELS: Record<ActionType, { title: string; desc: string; color: string }> = {
    full_reset:       { title: "Full Database Reset",        desc: "This will DELETE ALL data across all collections and re-seed categories and the admin account. This action is irreversible.", color: "text-red-700" },
    seed_only:        { title: "Seed Missing Data",          desc: "This will insert missing seed data (categories, skills) without deleting any existing records.", color: "text-amber-700" },
    clear_collection: { title: `Clear "${collection}"`,      desc: `This will delete ALL documents in the "${collection}" collection. Existing data cannot be recovered.`, color: "text-red-700" },
  };
  const meta = LABELS[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className={`font-bold text-lg ${meta.color}`}>{meta.title}</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{meta.desc}</p>
        </div>
        <div className="px-6 pb-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Enter your DB_RESET_TOKEN to confirm
          </label>
          <input
            ref={inputRef}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && token) onConfirm(token); }}
            placeholder="Paste token here…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex gap-3 px-6 py-4">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => token && onConfirm(token)}
            disabled={!token}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action === "seed_only" ? "Confirm Seed" : "Confirm Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreDialog({
  onConfirm,
  onCancel,
  running,
}: {
  onConfirm: (file: File, mode: string, token: string) => void;
  onCancel: () => void;
  running: boolean;
}) {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-bold text-lg text-slate-800">Restore from Backup</h2>
          </div>
          <p className="text-sm text-slate-600">
            Upload a <code className="bg-slate-100 px-1 rounded text-xs">.json</code> backup file exported from this tool. Existing documents will be merged or replaced based on mode.
          </p>
        </div>

        <div className="px-6 space-y-4 pb-2">
          {/* File picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Backup File</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <FileJson className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{file ? file.name : "Click to select backup .json"}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Restore Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["upsert", "replace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${mode === m ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {m === "upsert" ? "Upsert (safe)" : "Replace (destructive)"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {mode === "upsert" ? "Inserts new docs and updates existing ones by _id — nothing is deleted." : "Drops each collection first, then re-inserts all documents from the backup."}
            </p>
          </div>

          {/* Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">DB_RESET_TOKEN</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token here…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => file && token && onConfirm(file, mode, token)}
            disabled={!file || !token || running}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? "Restoring…" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseClient({ resetEnabled }: { resetEnabled: boolean }) {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [logStatus, setLogStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirm, setConfirm] = useState<{ action: ActionType; collection?: string } | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);
  const [backupFilter, setBackupFilter] = useState<"all" | string[]>("all");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/database/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = () => { setRefreshing(true); fetchStats(); };

  const pushLog = (lines: string[], status: "success" | "error") => {
    setLog(lines);
    setLogStatus(status);
    setExpandedLog(true);
  };

  const handleAction = async (action: ActionType, collection?: string, token?: string) => {
    if (!token) { setConfirm({ action, collection }); return; }
    setConfirm(null);
    setRunning(true);
    setLog([]);
    setLogStatus("idle");
    setExpandedLog(true);
    try {
      const res = await fetch("/api/admin/database/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, collection, confirmToken: token }),
      });
      const data = await res.json();
      pushLog(data.log ?? [data.error ?? "Request failed"], res.ok ? "success" : "error");
      if (res.ok) await fetchStats();
    } catch (e) {
      pushLog([(e as Error).message], "error");
    } finally {
      setRunning(false);
    }
  };

  const handleBackup = async () => {
    setDownloading(true);
    try {
      const query = backupFilter === "all" ? "" : `?collections=${(backupFilter as string[]).join(",")}`;
      const res = await fetch(`/api/admin/database/backup${query}`);
      if (!res.ok) { pushLog(["Backup failed — server error"], "error"); return; }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? "backup.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      pushLog([`Backup downloaded: ${filename} (${formatBytes(blob.size)})`], "success");
    } catch (e) {
      pushLog([(e as Error).message], "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async (file: File, mode: string, token: string) => {
    setRunning(true);
    setLog([]);
    setLogStatus("idle");
    setExpandedLog(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      form.append("confirmToken", token);
      const res = await fetch("/api/admin/database/restore", { method: "POST", body: form });
      const data = await res.json();
      pushLog(data.log ?? [data.error ?? "Restore failed"], res.ok ? "success" : "error");
      if (res.ok) { setShowRestore(false); await fetchStats(); }
    } catch (e) {
      pushLog([(e as Error).message], "error");
    } finally {
      setRunning(false);
    }
  };

  const totalDocs = stats?.collections.reduce((s, c) => s + c.count, 0) ?? 0;

  return (
    <>
      {confirm && (
        <ConfirmDialog
          action={confirm.action}
          collection={confirm.collection}
          onConfirm={(token) => handleAction(confirm.action, confirm.collection, token)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showRestore && (
        <RestoreDialog
          onConfirm={handleRestore}
          onCancel={() => setShowRestore(false)}
          running={running}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Database Management
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Collection stats, backup, restore, and reset tools for <strong>{stats?.dbName ?? "…"}</strong>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Disabled warning */}
        {!resetEnabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Reset &amp; Restore operations are disabled</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Set <code className="bg-amber-100 px-1 rounded">DB_RESET_ENABLED=true</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">DB_RESET_TOKEN=&lt;secret&gt;</code> in your{" "}
                <code className="bg-amber-100 px-1 rounded">.env.local</code> to enable. Backup is always available.
              </p>
            </div>
          </div>
        )}

        {/* DB overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Database",        value: stats?.dbName ?? "—",                               icon: <Database  className="h-5 w-5" /> },
            { label: "Total Documents", value: loading ? "…" : totalDocs.toLocaleString(),          icon: <Table     className="h-5 w-5" /> },
            { label: "Data Size",       value: loading ? "…" : formatBytes(stats?.dataSize ?? 0),   icon: <HardDrive className="h-5 w-5" /> },
            { label: "Index Size",      value: loading ? "…" : formatBytes(stats?.indexSize ?? 0),  icon: <HardDrive className="h-5 w-5" /> },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">{card.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 truncate">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Backup & Restore panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Backup &amp; Restore</h3>
            <p className="text-xs text-slate-400 mt-0.5">Export a full JSON backup or restore from a previous backup file.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {/* Backup */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg mt-0.5">
                  <Download className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Export Backup</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Downloads all collections as a timestamped <code className="bg-slate-100 px-1 rounded">localpro-backup-*.json</code> file.
                    No token required.
                  </p>
                </div>
              </div>
              <button
                onClick={handleBackup}
                disabled={downloading || running}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                {downloading ? "Exporting…" : "Download"}
              </button>
            </div>

            {/* Restore */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg mt-0.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Restore from Backup</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a backup JSON file. Choose <strong>Upsert</strong> (safe — merges by _id) or{" "}
                    <strong>Replace</strong> (drops then re-inserts each collection).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestore(true)}
                disabled={!resetEnabled || running}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                Restore
              </button>
            </div>
          </div>
        </div>

        {/* Reset & Seed panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Reset &amp; Seed Actions</h3>
            <p className="text-xs text-slate-400 mt-0.5">All destructive actions require a valid DB_RESET_TOKEN.</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-lg mt-0.5">
                  <Sprout className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Seed Missing Data</p>
                  <p className="text-xs text-slate-500 mt-0.5">Inserts missing categories and the default admin account without touching existing records.</p>
                </div>
              </div>
              <button
                onClick={() => handleAction("seed_only")}
                disabled={!resetEnabled || running}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sprout className="w-3.5 h-3.5" />
                Seed
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-lg mt-0.5">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Full Database Reset</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="text-red-600 font-medium">Destructive — </span>
                    Clears all collections then re-seeds categories and the admin account. All user data will be lost.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAction("full_reset")}
                disabled={!resetEnabled || running}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Full Reset
              </button>
            </div>
          </div>
        </div>

        {/* Collection table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Table className="w-4 h-4 text-primary" />
              Collections
            </h3>
            <span className="text-xs text-slate-400">{stats?.totalCollections ?? "—"} total in DB</span>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Collection</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Key</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Documents</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.collections.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{col.label}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400 hidden sm:table-cell">{col.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {col.exists ? (
                          <span className={`font-semibold ${col.count > 0 ? "text-slate-800" : "text-slate-400"}`}>
                            {col.count.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">not found</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Per-collection backup */}
                          <button
                            onClick={() => {
                              setBackupFilter([col.name]);
                              setTimeout(() => handleBackup(), 0);
                              setBackupFilter("all");
                            }}
                            disabled={downloading || !col.exists || col.count === 0}
                            title={`Backup ${col.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {/* Clear */}
                          <button
                            onClick={() => handleAction("clear_collection", col.name)}
                            disabled={!resetEnabled || running || !col.exists || col.count === 0}
                            title={`Clear ${col.name}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operation log */}
        {log.length > 0 && (
          <div className={`rounded-xl border overflow-hidden ${logStatus === "error" ? "border-red-200" : "border-green-200"}`}>
            <button
              onClick={() => setExpandedLog((v) => !v)}
              className={`w-full flex items-center justify-between px-5 py-3 text-sm font-semibold ${logStatus === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}
            >
              <span className="flex items-center gap-2">
                {logStatus === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                Operation {logStatus === "error" ? "failed" : "completed"} — {log.length} log {log.length === 1 ? "entry" : "entries"}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedLog ? "rotate-180" : ""}`} />
            </button>
            {expandedLog && (
              <div className="bg-slate-900 p-4 font-mono text-xs text-slate-200 space-y-1 max-h-64 overflow-y-auto">
                {log.map((line, i) => (
                  <p key={i} className="leading-relaxed">
                    <span className="text-slate-500 select-none mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Running indicator */}
        {running && (
          <div className="flex items-center gap-3 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            Running operation — please wait…
          </div>
        )}
      </div>
    </>
  );
}
