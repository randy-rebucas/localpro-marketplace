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
  Cloud,
  History,
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

type ActionType = "full_reset" | "seed_only" | "seed_settings" | "seed_skills" | "clear_collection";

interface AtlasSnapshot {
  id: string;
  status: "queued" | "inProgress" | "completed" | "failed";
  description: string;
  createdAt: string;
  expiresAt: string;
  storageSizeBytes?: number;
  mongodVersion?: string;
}

interface BackupLogEntry {
  _id: string;
  type: "atlas_snapshot" | "json_export";
  status: "pending" | "completed" | "failed";
  triggeredBy: "cron" | "admin";
  snapshotId?: string;
  description?: string;
  error?: string;
  sizeBytes?: number;
  createdAt: string;
}

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
    seed_settings:    { title: "Seed App Settings",          desc: "Inserts missing platform settings (commission rates, limits, etc.) without overwriting any existing values.", color: "text-amber-700" },
    seed_skills:      { title: "Seed Skills",                desc: "Inserts the canonical skill list without overwriting any existing skills.", color: "text-amber-700" },
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
            {action === "seed_only" || action === "seed_settings" || action === "seed_skills" ? "Confirm Seed" : "Confirm Reset"}
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
  const [activeAction, setActiveAction] = useState<"backup" | "restore" | "seed_only" | "seed_settings" | "seed_skills" | "full_reset" | "clear_collection" | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [logStatus, setLogStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirm, setConfirm] = useState<{ action: ActionType; collection?: string } | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);

  // Atlas cloud backup state
  const [atlasSnapshots, setAtlasSnapshots] = useState<AtlasSnapshot[]>([]);
  const [atlasLogs, setAtlasLogs] = useState<BackupLogEntry[]>([]);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasConfigured, setAtlasConfigured] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [snapshotConfirm, setSnapshotConfirm] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/database/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAtlasSnapshots = useCallback(async () => {
    setAtlasLoading(true);
    try {
      const res = await fetch("/api/admin/backup/snapshots");
      if (res.ok) {
        const data = await res.json();
        setAtlasSnapshots(data.snapshots ?? []);
        setAtlasLogs(data.logs ?? []);
        setAtlasConfigured(data.atlasConfigured ?? false);
      }
    } finally {
      setAtlasLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchAtlasSnapshots(); }, [fetchStats, fetchAtlasSnapshots]);

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
    setActiveAction(action);
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
      setActiveAction(null);
    }
  };

  const handleBackup = async (collections?: string[]) => {
    setDownloading(true);
    setActiveAction("backup");
    try {
      const query = collections ? `?collections=${collections.join(",")}` : "";
      const res = await fetch(`/api/admin/database/backup${query}`);
      if (!res.ok) { pushLog(["Backup failed — server error"], "error"); return; }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? "backup.json";
      const savedPath = res.headers.get("X-Backup-Path");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      const lines = [
        `✓ Backup downloaded: ${filename} (${formatBytes(blob.size)})`,
        ...(savedPath ? [`✓ Saved to codebase: ${savedPath}`] : []),
      ];
      pushLog(lines, "success");
    } catch (e) {
      pushLog([(e as Error).message], "error");
    } finally {
      setDownloading(false);
      setActiveAction(null);
    }
  };

  const handleRestore = async (file: File, mode: string, token: string) => {
    setRunning(true);
    setActiveAction("restore");
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
      setActiveAction(null);
    }
  };

  const totalDocs = stats?.collections.reduce((s, c) => s + c.count, 0) ?? 0;

  const handleTakeSnapshot = async () => {
    if (!snapshotConfirm) { setSnapshotConfirm(true); return; }
    setSnapshotConfirm(false);
    setTakingSnapshot(true);
    try {
      const res = await fetch("/api/admin/backup/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        pushLog(
          [
            `✓ Snapshot queued — ID: ${data.snapshotId ?? "(pending)"}`,
            "Atlas will complete the snapshot within a few minutes.",
          ],
          "success"
        );
        // Refresh log after a short delay so the pending entry appears
        setTimeout(() => fetchAtlasSnapshots(), 3000);
      } else {
        pushLog([`✗ Snapshot failed: ${data.error}`], "error");
      }
    } catch (e) {
      pushLog([(e as Error).message], "error");
    } finally {
      setTakingSnapshot(false);
    }
  };

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

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Database className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Database Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collection stats, backup, restore &amp; reset for{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{stats?.dbName ?? "…"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Disabled warning */}
        {!resetEnabled && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-4 flex items-start gap-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg mt-0.5 flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Reset &amp; Restore operations are disabled</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Set <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">DB_RESET_ENABLED=true</code> and{" "}
                <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">DB_RESET_TOKEN=&lt;secret&gt;</code> in your{" "}
                <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env.local</code> to enable. Backup is always available.
              </p>
            </div>
          </div>
        )}

        {/* DB overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Database",        value: stats?.dbName ?? "—",                              icon: Database,  color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30", ring: "ring-violet-100 dark:ring-violet-800" },
            { label: "Total Documents", value: loading ? "…" : totalDocs.toLocaleString(),         icon: Table,     color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/30",   ring: "ring-blue-100 dark:ring-blue-800"   },
            { label: "Data Size",       value: loading ? "…" : formatBytes(stats?.dataSize ?? 0),  icon: HardDrive, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-100 dark:ring-emerald-800" },
            { label: "Index Size",      value: loading ? "…" : formatBytes(stats?.indexSize ?? 0), icon: HardDrive, color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/30",  ring: "ring-amber-100 dark:ring-amber-800"  },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
              <div className={`${card.bg} ring-4 ${card.ring} p-2.5 rounded-xl flex-shrink-0`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white truncate mt-0.5">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Backup & Restore panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Backup &amp; Restore</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Export a full JSON backup or restore from a previous backup file.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {/* Backup */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mt-0.5">
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Export Backup</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Exports all collections as a timestamped{" "}
                    <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">localpro-backup-*.json</code> file —
                    saved to <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">backup/</code> and downloaded to your browser.
                    No token required.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleBackup()}
                disabled={downloading || running}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "backup"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
                  : <><Download className="w-3.5 h-3.5" /> Download</>}
              </button>
            </div>

            {/* Restore */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg mt-0.5">
                  <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Restore from Backup</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Upload a backup JSON file. Choose <strong>Upsert</strong> (safe — merges by _id) or{" "}
                    <strong>Replace</strong> (drops then re-inserts each collection).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestore(true)}
                disabled={!resetEnabled || running || downloading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "restore"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restoring…</>
                  : <><Upload className="w-3.5 h-3.5" /> Restore</>}
              </button>
            </div>
          </div>
        </div>

        {/* Atlas Cloud Backups panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  Atlas Cloud Backups
                  {!atlasConfigured && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      Not configured
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {atlasConfigured
                    ? "MongoDB Atlas Continuous Cloud Backup — point-in-time recovery available."
                    : "Set MONGODB_ATLAS_* environment variables to enable Atlas snapshot management."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchAtlasSnapshots()}
                disabled={atlasLoading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                title="Refresh snapshots"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${atlasLoading ? "animate-spin" : ""}`} />
              </button>
              {atlasConfigured && (
                snapshotConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Confirm?</span>
                    <button
                      onClick={handleTakeSnapshot}
                      disabled={takingSnapshot}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                    >
                      {takingSnapshot ? "Queuing…" : "Yes, take snapshot"}
                    </button>
                    <button
                      onClick={() => setSnapshotConfirm(false)}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleTakeSnapshot}
                    disabled={takingSnapshot}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {takingSnapshot
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Queuing…</>
                      : <><Cloud className="w-3.5 h-3.5" /> Take Snapshot</>}
                  </button>
                )
              )}
            </div>
          </div>

          {atlasLoading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          ) : !atlasConfigured ? (
            <div className="px-5 py-8 text-center">
              <Cloud className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Atlas not configured</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1 max-w-md mx-auto">
                Add <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">MONGODB_ATLAS_PUBLIC_KEY</code>,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">MONGODB_ATLAS_PRIVATE_KEY</code>,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">MONGODB_ATLAS_PROJECT_ID</code>, and{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">MONGODB_ATLAS_CLUSTER_NAME</code> to your environment.
              </p>
            </div>
          ) : atlasLogs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No snapshots recorded yet</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Take your first snapshot or wait for the daily cron at 1 AM UTC.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Snapshot ID</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:table-cell">Triggered by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {atlasLogs.map((entry) => (
                    <tr key={String(entry._id)} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400 dark:text-slate-500 hidden sm:table-cell max-w-[140px] truncate">
                        {entry.snapshotId ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          entry.status === "completed"
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : entry.status === "failed"
                            ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}>
                          {entry.status === "completed"
                            ? <CheckCircle className="w-3 h-3" />
                            : entry.status === "failed"
                            ? <XCircle className="w-3 h-3" />
                            : <RefreshCw className="w-3 h-3 animate-spin" />}
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell tabular-nums">
                        {entry.sizeBytes ? formatBytes(entry.sizeBytes) : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell capitalize">
                        {entry.triggeredBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reset & Seed panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <Sprout className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Reset &amp; Seed Actions</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">All destructive actions require a valid DB_RESET_TOKEN.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg mt-0.5">
                  <Sprout className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Seed Missing Data</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inserts missing categories and the default admin account without touching existing records.</p>
                </div>
              </div>
              <button
                onClick={() => handleAction("seed_only")}
                disabled={!resetEnabled || running || downloading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "seed_only"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Seeding…</>
                  : <><Sprout className="w-3.5 h-3.5" /> Seed</>}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg mt-0.5">
                  <Sprout className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Seed App Settings</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inserts missing platform settings (commission rates, job limits, min amounts) without overwriting existing values.</p>
                </div>
              </div>
              <button
                onClick={() => handleAction("seed_settings")}
                disabled={!resetEnabled || running || downloading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "seed_settings"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Seeding…</>
                  : <><Sprout className="w-3.5 h-3.5" /> Seed Settings</>}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg mt-0.5">
                  <Sprout className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Seed Skills</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inserts the canonical skill list (&gt;160 trades) without overwriting any existing skills.</p>
                </div>
              </div>
              <button
                onClick={() => handleAction("seed_skills")}
                disabled={!resetEnabled || running || downloading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "seed_skills"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Seeding…</>
                  : <><Sprout className="w-3.5 h-3.5" /> Seed Skills</>}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg mt-0.5">
                  <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Full Database Reset</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="text-red-600 dark:text-red-400 font-medium">Destructive — </span>
                    Clears all collections then re-seeds categories and the admin account. All user data will be lost.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAction("full_reset")}
                disabled={!resetEnabled || running || downloading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {activeAction === "full_reset"
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Resetting…</>
                  : <><RotateCcw className="w-3.5 h-3.5" /> Full Reset</>}
              </button>
            </div>
          </div>
        </div>

        {/* Collection table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Table className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Collections</h3>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{stats?.totalCollections ?? "—"} total in DB</span>
          </div>

          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Collection</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Key</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Documents</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {stats?.collections.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{col.label}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400 dark:text-slate-500 hidden sm:table-cell">{col.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {col.exists ? (
                          <span className={`font-semibold ${col.count > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}>
                            {col.count.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600 italic">not found</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleBackup([col.name])}
                            disabled={downloading || !col.exists || col.count === 0}
                            title={`Backup ${col.name}`}
                            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAction("clear_collection", col.name)}
                            disabled={!resetEnabled || running || !col.exists || col.count === 0}
                            title={`Clear ${col.name}`}
                            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <div className={`rounded-2xl border overflow-hidden ${
            logStatus === "error"
              ? "border-red-200 dark:border-red-800"
              : "border-green-200 dark:border-green-800"
          }`}>
            <button
              onClick={() => setExpandedLog((v) => !v)}
              className={`w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors ${
                logStatus === "error"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  : "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
              }`}
            >
              <span className="flex items-center gap-2">
                {logStatus === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                Operation {logStatus === "error" ? "failed" : "completed"}
                <span className="font-normal opacity-70">— {log.length} {log.length === 1 ? "entry" : "entries"}</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedLog ? "rotate-180" : ""}`} />
            </button>
            {expandedLog && (
              <div className="bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-1 max-h-64 overflow-y-auto">
                {log.map((line, i) => (
                  <p key={i} className="leading-relaxed flex gap-3">
                    <span className="text-slate-600 select-none tabular-nums flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className={line.startsWith("✓") ? "text-emerald-400" : line.startsWith("✗") || line.toLowerCase().includes("error") || line.toLowerCase().includes("fail") ? "text-red-400" : "text-slate-300"}>{line}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Running indicator */}
        {(running || downloading) && (() => {
          const ACTION_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
            backup:           { label: "Exporting backup…",      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200"   },
            restore:          { label: "Restoring from backup…", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
            seed_only:        { label: "Seeding data…",          color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200"  },
            seed_settings:    { label: "Seeding app settings…", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200"  },
            seed_skills:      { label: "Seeding skills…",        color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200"  },
            full_reset:       { label: "Resetting database…",   color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    },
            clear_collection: { label: "Clearing collection…",  color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    },
          };
          const meta = ACTION_LABELS[activeAction ?? ""] ?? { label: "Running operation…", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
          return (
            <div className={`flex items-center gap-3 text-sm ${meta.color} ${meta.bg} ${meta.border} border rounded-2xl px-5 py-3.5`}>
              <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              <span className="font-semibold">{meta.label}</span>
              <span className="text-xs opacity-60 ml-auto hidden sm:block">Please wait · do not close this page</span>
            </div>
          );
        })()}
      </div>
    </>
  );
}
