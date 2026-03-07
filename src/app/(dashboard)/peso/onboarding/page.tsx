"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Upload, CheckCircle, XCircle } from "lucide-react";

interface OnboardResult {
  email: string;
  status: "created" | "skipped";
  reason?: string;
}

const SAMPLE_CSV = `name,email,phone,skills,barangay
Juan dela Cruz,juan@example.com,09171234567,"Electrician,Carpentry",Poblacion
Maria Santos,maria@example.com,09281234567,"Cleaning,Cooking",San Jose`;

export default function BulkOnboardingPage() {
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<OnboardResult[] | null>(null);

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      // Handle quoted fields (e.g. "Electrician,Carpentry")
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      toast.error("No valid rows found. Please check your CSV format.");
      return;
    }
    if (rows.length > 200) {
      toast.error("Maximum 200 rows per upload.");
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      const res = await fetch("/api/peso/bulk-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(String(ev.target?.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Bulk Provider Onboarding</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload a CSV to register multiple workers at once. Each will receive an activation email.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">CSV Format (headers required)</p>
        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">{SAMPLE_CSV}</pre>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Upload CSV File</label>
          <label className="mt-2 flex items-center gap-3 border border-dashed border-slate-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
            <Upload className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Choose a .csv file or paste below</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Or Paste CSV Data</label>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={SAMPLE_CSV}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !csvText.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {submitting ? "Processing..." : "Upload & Onboard"}
        </button>
      </form>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm">
            Results — {results.filter((r) => r.status === "created").length} created, {results.filter((r) => r.status === "skipped").length} skipped
          </h2>
          <ul className="divide-y divide-slate-100">
            {results.map((r) => (
              <li key={r.email} className="flex items-center gap-3 py-2.5">
                {r.status === "created" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <span className="text-sm text-slate-700 flex-1">{r.email}</span>
                {r.reason && <span className="text-xs text-slate-400">{r.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
