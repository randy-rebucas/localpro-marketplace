"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Upload, CheckCircle2, XCircle, Loader2, FileText, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

interface OnboardResult {
  email: string;
  status: "created" | "skipped";
  reason?: string;
}

const SAMPLE_CSV = `name,email,phone,skills,barangay
Juan dela Cruz,juan@example.com,09171234567,"Electrician,Carpentry",Poblacion
Maria Santos,maria@example.com,09281234567,"Cleaning,Cooking",San Jose`;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const fields: string[] = [];
    let inQuote = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { fields.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    fields.push(current.trim());
    return Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ""]));
  });
}

export default function BulkOnboardingPage() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<OnboardResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedRows = csvText.trim() ? parseCSV(csvText) : [];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(String(ev.target?.result ?? ""));
    reader.readAsText(file);
  }

  function clearInput() {
    setCsvText("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (parsedRows.length === 0) {
      toast.error("No valid rows found. Please check your CSV format.");
      return;
    }
    if (parsedRows.length > 200) {
      toast.error("Maximum 200 rows per upload.");
      return;
    }

    // Validate individual field lengths to prevent oversized payloads
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if ((row.name ?? "").length > 100)   { toast.error(`Row ${i + 2}: name too long (max 100 chars)`);   return; }
      if ((row.email ?? "").length > 254)  { toast.error(`Row ${i + 2}: email too long (max 254 chars)`);  return; }
      if ((row.phone ?? "").length > 20)   { toast.error(`Row ${i + 2}: phone too long (max 20 chars)`);   return; }
      if ((row.skills ?? "").length > 500) { toast.error(`Row ${i + 2}: skills too long (max 500 chars)`); return; }
      if ((row.barangay ?? "").length > 100) { toast.error(`Row ${i + 2}: barangay too long (max 100 chars)`); return; }
    }

    setSubmitting(true);
    setResults(null);

    try {
      const res = await apiFetch("/api/peso/bulk-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRows),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk onboard failed");

      setResults(data.results);
      const created = data.results.filter((r: OnboardResult) => r.status === "created").length;
      toast.success(`${created} account${created !== 1 ? "s" : ""} created successfully`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const createdCount = results?.filter((r) => r.status === "created").length ?? 0;
  const skippedCount = results?.filter((r) => r.status === "skipped").length ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Bulk Provider Onboarding</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload a CSV to register multiple workers at once. Each will receive an activation email.
        </p>
      </div>

      {/* CSV format reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Expected Format <span className="normal-case font-normal text-slate-400">(headers required)</span>
        </p>
        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">{SAMPLE_CSV}</pre>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* File upload */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upload CSV File</p>
          {fileName ? (
            <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-3">
              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 flex-1 truncate">{fileName}</span>
              <button
                type="button"
                onClick={clearInput}
                className="text-emerald-400 hover:text-emerald-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors">
              <Upload className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500">Choose a .csv file or paste below</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Paste area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Or Paste CSV Data</p>
            {csvText.trim() && (
              <span className="text-xs text-slate-400 tabular-nums">
                {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} detected
              </span>
            )}
          </div>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setFileName(null); }}
            placeholder={SAMPLE_CSV}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !csvText.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {submitting ? "Processing…" : `Upload & Onboard${parsedRows.length > 0 ? ` (${parsedRows.length})` : ""}`}
        </button>
      </form>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Summary bar */}
          <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">Results</span>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {createdCount} created
            </span>
            {skippedCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                <XCircle className="h-4 w-4" />
                {skippedCount} skipped
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {results.map((r) => (
              <li key={r.email} className="flex items-center gap-3 px-5 py-2.5">
                {r.status === "created" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <span className="text-sm text-slate-700 flex-1 truncate">{r.email}</span>
                {r.reason && (
                  <span className="text-xs text-slate-400 shrink-0">{r.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
