"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, Download, ArrowLeft, ShieldCheck, Award } from "lucide-react";
import toast from "react-hot-toast";

interface CertData {
  providerName: string;
  courseTitle: string;
  category: string;
  badgeSlug: string;
  completedAt: string;
  certificateNumber: string;
}

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/provider/training/${id}/certificate`)
      .then((r) => r.json())
      .then((data: { error?: string } & Partial<CertData>) => {
        if (data.error) { toast.error(data.error); return; }
        setCert(data as CertData);
      })
      .catch(() => toast.error("Failed to load certificate."))
      .finally(() => setLoading(false));
  }, [id]);

  const isCertification = cert?.category === "certification";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-slate-500">
        <ShieldCheck className="h-12 w-12 opacity-30" />
        <p className="font-medium">Certificate not available.</p>
        <Link href="/provider/training" className="text-sm text-indigo-600 hover:underline">
          Back to Training
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ── Print-suppressed styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .cert-wrap, .cert-wrap * { visibility: visible !important; }
          .cert-wrap {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>

      <div className="cert-page min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 print:bg-white print:p-0">

        {/* Action bar — hidden when printing */}
        <div className="no-print flex items-center justify-between w-full max-w-4xl mb-6">
          <Link
            href={`/provider/training/${id}`}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" /> Download / Print PDF
          </button>
        </div>

        {/* ── Certificate ── */}
        <div
          className={`cert-wrap w-full max-w-4xl shadow-2xl print:shadow-none ${
            isCertification
              ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50"
              : "bg-gradient-to-br from-slate-50 via-white to-indigo-50"
          }`}
          style={{ aspectRatio: "297/210", position: "relative", overflow: "hidden" }}
        >
          {/* Outer decorative border */}
          <div
            className={`absolute inset-2 rounded-sm pointer-events-none ${
              isCertification ? "border-2 border-yellow-400" : "border-2 border-indigo-300"
            }`}
          />
          <div
            className={`absolute inset-3 rounded-sm pointer-events-none ${
              isCertification ? "border border-yellow-300/60" : "border border-indigo-200/60"
            }`}
          />

          {/* Corner ornaments */}
          {[
            "top-1 left-1",
            "top-1 right-1 rotate-90",
            "bottom-1 left-1 -rotate-90",
            "bottom-1 right-1 rotate-180",
          ].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-12 h-12 pointer-events-none`}>
              <svg viewBox="0 0 40 40" className={`w-full h-full ${isCertification ? "text-yellow-400" : "text-indigo-300"}`} fill="currentColor">
                <path d="M0,0 L14,0 L14,2 L2,2 L2,14 L0,14 Z" />
                <path d="M4,4 L10,4 L10,6 L6,6 L6,10 L4,10 Z" />
              </svg>
            </div>
          ))}

          {/* Background watermark seal */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            <svg viewBox="0 0 200 200" className={`w-96 h-96 ${isCertification ? "text-yellow-600" : "text-indigo-600"}`} fill="currentColor">
              <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="5" fill="none"/>
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" fill="none"/>
              <text x="100" y="90" textAnchor="middle" fontSize="14" fontWeight="bold" fontFamily="serif">LOCAL</text>
              <text x="100" y="110" textAnchor="middle" fontSize="14" fontWeight="bold" fontFamily="serif">PRO</text>
              <text x="100" y="128" textAnchor="middle" fontSize="8" fontFamily="serif">CERTIFIED</text>
            </svg>
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-16 py-10 text-center">

            {/* Header row */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${isCertification ? "bg-yellow-100" : "bg-indigo-100"}`}>
                {isCertification
                  ? <ShieldCheck className="h-6 w-6 text-yellow-600" />
                  : <Award className="h-6 w-6 text-indigo-600" />}
              </div>
              <div className="text-left">
                <p className={`text-xs font-bold tracking-[0.2em] uppercase ${isCertification ? "text-yellow-700" : "text-indigo-600"}`}>
                  LocalPro
                </p>
                <p className="text-[10px] tracking-widest uppercase text-slate-400 font-medium">
                  Philippines
                </p>
              </div>
            </div>

            {/* Certificate of Completion heading */}
            <p className="text-xs font-semibold tracking-[0.35em] uppercase text-slate-400 mb-2">
              Certificate of Completion
            </p>

            {/* Decorative rule */}
            <div className="flex items-center gap-3 w-48 mb-5">
              <div className={`flex-1 h-px ${isCertification ? "bg-yellow-400" : "bg-indigo-300"}`} />
              <div className={`w-1.5 h-1.5 rounded-full rotate-45 ${isCertification ? "bg-yellow-400" : "bg-indigo-400"}`} />
              <div className={`flex-1 h-px ${isCertification ? "bg-yellow-400" : "bg-indigo-300"}`} />
            </div>

            {/* This certifies that */}
            <p className="text-[11px] italic text-slate-500 mb-1">This certifies that</p>

            {/* Provider name */}
            <h1
              className={`font-bold mb-1 leading-tight ${
                isCertification ? "text-yellow-900" : "text-slate-900"
              }`}
              style={{ fontSize: "clamp(24px, 4vw, 38px)", fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {cert.providerName}
            </h1>

            {/* has successfully completed */}
            <p className="text-[11px] italic text-slate-500 mb-2">has successfully completed</p>

            {/* Course title */}
            <h2
              className={`font-semibold mb-4 leading-snug ${
                isCertification ? "text-yellow-800" : "text-indigo-800"
              }`}
              style={{ fontSize: "clamp(14px, 2.2vw, 20px)" }}
            >
              {cert.courseTitle}
            </h2>

            {/* Decorative rule bottom */}
            <div className="flex items-center gap-3 w-48 mb-5">
              <div className={`flex-1 h-px ${isCertification ? "bg-yellow-400" : "bg-indigo-300"}`} />
              <div className={`w-1.5 h-1.5 rounded-full rotate-45 ${isCertification ? "bg-yellow-400" : "bg-indigo-400"}`} />
              <div className={`flex-1 h-px ${isCertification ? "bg-yellow-400" : "bg-indigo-300"}`} />
            </div>

            {/* Date + cert number row */}
            <div className="flex items-end justify-between w-full max-w-lg">
              {/* Completion date */}
              <div className="text-left">
                <div className={`h-px w-28 mb-1 ${isCertification ? "bg-yellow-400" : "bg-slate-300"}`} />
                <p className="text-[10px] text-slate-500 font-medium">Date of Completion</p>
                <p className={`text-xs font-semibold ${isCertification ? "text-yellow-800" : "text-slate-700"}`}>
                  {formatLongDate(cert.completedAt)}
                </p>
              </div>

              {/* Center seal badge */}
              <div className={`flex flex-col items-center px-4 py-2 rounded-full border-2 ${
                isCertification
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-indigo-300 bg-indigo-50"
              }`}>
                {isCertification
                  ? <ShieldCheck className="h-5 w-5 text-yellow-600 mb-0.5" />
                  : <Award className="h-5 w-5 text-indigo-600 mb-0.5" />}
                <p className={`text-[9px] font-bold tracking-wider uppercase ${isCertification ? "text-yellow-700" : "text-indigo-700"}`}>
                  {isCertification ? "LocalPro Certified" : "Completed"}
                </p>
              </div>

              {/* Certificate number */}
              <div className="text-right">
                <div className={`h-px w-28 ml-auto mb-1 ${isCertification ? "bg-yellow-400" : "bg-slate-300"}`} />
                <p className="text-[10px] text-slate-500 font-medium">Certificate No.</p>
                <p className={`text-xs font-mono font-semibold ${isCertification ? "text-yellow-800" : "text-slate-700"}`}>
                  {cert.certificateNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Helper text — hidden when printing */}
        <p className="no-print mt-4 text-xs text-slate-400 text-center">
          Click &quot;Download / Print PDF&quot; → Save as PDF in your browser&apos;s print dialog.
        </p>
      </div>
    </>
  );
}
