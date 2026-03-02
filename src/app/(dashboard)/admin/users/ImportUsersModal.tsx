"use client";

import { useRef, useState } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import Button from "@/components/ui/Button";

type Role = "client" | "provider" | "admin" | "staff";
const VALID_ROLES: Role[] = ["client", "provider", "admin", "staff"];

interface ParsedRow {
  row:               number;
  name:              string;
  email:             string;
  password:          string;
  role:              string;
  phone?:            string;
  dateOfBirth?:      string;
  gender?:           string;
  address1?:         string;
  city?:             string;
  province?:         string;
  zip?:              string;
  skills?:           string;
  workExperiences?:  string;
  yearsOfExperience?: string;
  error?:            string;
}

interface ImportResult {
  created: number;
  skipped: number;
  failed:  { row: number; email?: string; error: string }[];
}

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

// ─── CSV parser (handles quoted fields, CRLF/LF) ────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ",") { cells.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const name     = raw.name?.trim()              ?? "";
  const email    = raw.email?.trim()             ?? "";
  const password = raw.password?.trim()          ?? "";
  const role     = raw.role?.trim().toLowerCase() ?? "";

  const base: ParsedRow = {
    row: rowNum, name, email, password, role,
    phone:             raw.phone?.trim()             || undefined,
    dateOfBirth:       raw.dateOfBirth?.trim()       || undefined,
    gender:            raw.gender?.trim().toLowerCase() || undefined,
    address1:          raw.address1?.trim()          || undefined,
    city:              raw.city?.trim()              || undefined,
    province:          raw.province?.trim()          || undefined,
    zip:               raw.zip?.trim()               || undefined,
    skills:            raw.skills?.trim()            || undefined,
    workExperiences:   raw.workExperiences?.trim()   || undefined,
    yearsOfExperience: raw.yearsOfExperience?.trim() || undefined,
  };

  if (name.length < 2)    return { ...base, error: "Name must be ≥ 2 characters" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ...base, error: "Invalid email address" };
  if (password.length < 8) return { ...base, error: "Password must be ≥ 8 characters" };
  if (!(VALID_ROLES as string[]).includes(role))
    return { ...base, error: `Role must be one of: ${VALID_ROLES.join(", ")}` };
  if (base.gender && !["male","female","other"].includes(base.gender))
    return { ...base, error: "Gender must be male, female, or other" };

  return base;
}

const TEMPLATE_CSV = `name,email,password,role,phone,dateOfBirth,gender,address1,city,province,zip,skills,workExperiences,yearsOfExperience
Maria Santos,maria@example.com,SecurePass1,client,09171234567,1990-05-15,female,123 Rizal St,Quezon City,Metro Manila,1100,,,
Juan Cruz,juan@example.com,SecurePass2,provider,09281234567,1988-03-22,male,456 Bonifacio Ave,Cebu City,Cebu,6000,plumbing|electrical,residential plumbing|commercial wiring,5
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "localpro-users-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportUsersModal({ onClose, onSuccess }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [rows,      setRows]      = useState<ParsedRow[] | null>(null);
  const [fileName,  setFileName]  = useState("");
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<ImportResult | null>(null);

  const validRows   = rows?.filter((r) => !r.error) ?? [];
  const invalidRows = rows?.filter((r) => !!r.error) ?? [];

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const allRows = parseCsv(text);
      if (allRows.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const headers = allRows[0].map((h) => h.toLowerCase().replace(/\s/g, ""));
      const nameIdx             = headers.indexOf("name");
      const emailIdx            = headers.indexOf("email");
      const passIdx             = headers.indexOf("password");
      const roleIdx             = headers.indexOf("role");
      const phoneIdx            = headers.indexOf("phone");
      const dobIdx              = headers.indexOf("dateofbirth");
      const genderIdx           = headers.indexOf("gender");
      const addr1Idx            = headers.indexOf("address1");
      const cityIdx             = headers.indexOf("city");
      const provinceIdx         = headers.indexOf("province");
      const zipIdx              = headers.indexOf("zip");
      const skillsIdx           = headers.indexOf("skills");
      const workExpIdx          = headers.indexOf("workexperiences");
      const yearsIdx            = headers.indexOf("yearsofexperience");

      if ([nameIdx, emailIdx, passIdx, roleIdx].some((i) => i === -1)) {
        toast.error("CSV must have columns: name, email, password, role");
        return;
      }

      const parsed: ParsedRow[] = allRows.slice(1).map((cells, i) => {
        const raw: Record<string, string> = {
          name:              cells[nameIdx]     ?? "",
          email:             cells[emailIdx]    ?? "",
          password:          cells[passIdx]     ?? "",
          role:              cells[roleIdx]     ?? "",
          phone:             phoneIdx    >= 0 ? (cells[phoneIdx]    ?? "") : "",
          dateOfBirth:       dobIdx      >= 0 ? (cells[dobIdx]      ?? "") : "",
          gender:            genderIdx   >= 0 ? (cells[genderIdx]   ?? "") : "",
          address1:          addr1Idx    >= 0 ? (cells[addr1Idx]    ?? "") : "",
          city:              cityIdx     >= 0 ? (cells[cityIdx]     ?? "") : "",
          province:          provinceIdx >= 0 ? (cells[provinceIdx] ?? "") : "",
          zip:               zipIdx      >= 0 ? (cells[zipIdx]      ?? "") : "",
          skills:            skillsIdx   >= 0 ? (cells[skillsIdx]   ?? "") : "",
          workExperiences:   workExpIdx  >= 0 ? (cells[workExpIdx]  ?? "") : "",
          yearsOfExperience: yearsIdx    >= 0 ? (cells[yearsIdx]    ?? "") : "",
        };
        return validateRow(raw, i + 2); // +2: 1-based + skip header
      });

      setRows(parsed);
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const payload = validRows.map(({ name, email, password, role,
        phone, dateOfBirth, gender,
        address1, city, province, zip,
        skills, workExperiences, yearsOfExperience,
      }) => ({
        name, email, password, role,
        ...(phone             ? { phone }             : {}),
        ...(dateOfBirth       ? { dateOfBirth }       : {}),
        ...(gender            ? { gender }            : {}),
        ...(address1          ? { address1 }          : {}),
        ...(city              ? { city }              : {}),
        ...(province          ? { province }          : {}),
        ...(zip               ? { zip }               : {}),
        ...(skills            ? { skills }            : {}),
        ...(workExperiences   ? { workExperiences }   : {}),
        ...(yearsOfExperience ? { yearsOfExperience } : {}),
      }));

      const res = await apiFetch("/api/admin/users/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data: ImportResult = await res.json();
      if (!res.ok) {
        toast.error((data as unknown as { error?: string }).error ?? "Import failed");
        return;
      }

      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} user${data.created !== 1 ? "s" : ""} imported`);
        onSuccess();
      }
    } finally {
      setImporting(false);
    }
  }

  // ── Result view ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Import Results</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Created",  value: result.created, color: "text-emerald-600 bg-emerald-50" },
                { label: "Skipped",  value: result.skipped, color: "text-amber-600 bg-amber-50"    },
                { label: "Failed",   value: result.failed.length, color: "text-red-600 bg-red-50"  },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl px-3 py-3 text-center ${color}`}>
                  <p className="text-2xl font-bold leading-none">{value}</p>
                  <p className="text-[11px] font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {result.skipped > 0 && (
              <p className="text-xs text-slate-500">Skipped rows had emails that already exist in the system.</p>
            )}
            {result.failed.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-slate-700">Failed rows:</p>
                {result.failed.map((f) => (
                  <div key={f.row} className="flex items-start gap-2 rounded-lg bg-red-50 px-2.5 py-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-700">
                      <span className="font-semibold">Row {f.row}{f.email ? ` (${f.email})` : ""}</span>: {f.error}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button onClick={onClose} size="sm">Done</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50">
              <Upload className="h-4 w-4 text-violet-600" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Import Users</h2>
              <p className="text-xs text-slate-400">Upload a CSV to bulk-create accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
              title="Download CSV template"
            >
              <Download className="h-3 w-3" />
              Template
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          {!rows ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-9 w-9 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">Drag & drop your CSV here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Required: <code className="bg-slate-100 px-1 rounded">name, email, password, role</code>
                &nbsp;· Optional: <code className="bg-slate-100 px-1 rounded">phone, dateOfBirth, gender, address1, city, province, zip, skills, workExperiences, yearsOfExperience</code>
                &nbsp;· Max 500 rows
              </p>
            </>
          ) : (
            <>
              {/* File summary */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-700 flex-1 truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={() => { setRows(null); setFileName(""); }}
                  className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {invalidRows.length} with errors
                  </span>
                )}
              </div>

              {/* Preview table */}
              {rows.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {["#", "Name", "Email", "Role", "Status"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => (
                          <tr key={r.row} className={r.error ? "bg-red-50/60" : ""}>
                            <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                            <td className="px-3 py-1.5 text-slate-700 max-w-[120px] truncate">{r.name || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-1.5 text-slate-700 max-w-[160px] truncate">{r.email || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-1.5 capitalize text-slate-600">{r.role || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              {r.error ? (
                                <span className="inline-flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                  {r.error}
                                </span>
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invalidRows.length > 0 && (
                <p className="text-[11px] text-amber-600">
                  Rows with errors will be skipped. Fix them in your CSV and re-upload, or proceed to import only the valid rows.
                </p>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            {rows && validRows.length > 0 && (
              <Button
                size="sm"
                isLoading={importing}
                onClick={handleImport}
                disabled={validRows.length === 0}
              >
                {importing
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Importing…</>
                  : `Import ${validRows.length} user${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
