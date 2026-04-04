import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sanitizeMarkdown } from "@/lib/markdown";
import {
  MapPin,
  CalendarDays,
  Briefcase,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PhilippinePeso,
  ListChecks,
} from "lucide-react";

import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { getCurrentUser } from "@/lib/auth";
import { ShareButtons } from "./ShareButtons";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const PROVIDER_REGISTER_URL = `${APP_URL}/register?role=provider`;
const LOGIN_URL = `${APP_URL}/login`;
const BOARD_URL = `${APP_URL}/board`;
const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/?format=png&color=0d2340&bgcolor=ffffff&margin=6";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(d: Date | string) {
  const ms  = Date.now() - new Date(d).getTime();
  const m   = Math.floor(ms / 60_000);
  if (m < 60)  return `${m}m ago`;
  const h   = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type JobStatus =
  | "pending_validation" | "open" | "assigned"
  | "in_progress" | "completed" | "disputed"
  | "rejected" | "refunded" | "expired";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; badge: string; dot: string }
> = {
  open:                { label: "Open",             badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400" },
  pending_validation:  { label: "Pending Review",   badge: "bg-yellow-500/20  text-yellow-300  border-yellow-500/40",  dot: "bg-yellow-400"  },
  assigned:            { label: "Assigned",         badge: "bg-amber-500/20   text-amber-300   border-amber-500/40",   dot: "bg-amber-400"   },
  in_progress:         { label: "In Progress",      badge: "bg-amber-500/20   text-amber-300   border-amber-500/40",   dot: "bg-amber-400"   },
  completed:           { label: "Completed",        badge: "bg-blue-500/20    text-blue-300    border-blue-500/40",    dot: "bg-blue-400"    },
  disputed:            { label: "Disputed",         badge: "bg-rose-500/20    text-rose-300    border-rose-500/40",    dot: "bg-rose-400"    },
  rejected:            { label: "Rejected",         badge: "bg-slate-500/20   text-slate-400   border-slate-500/30",   dot: "bg-slate-400"   },
  refunded:            { label: "Refunded",         badge: "bg-slate-500/20   text-slate-400   border-slate-500/30",   dot: "bg-slate-400"   },
  expired:             { label: "Expired",          badge: "bg-slate-500/20   text-slate-400   border-slate-500/30",   dot: "bg-slate-400"   },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

interface PublicJob {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  scheduleDate: string;
  description: string;
  specialInstructions?: string;
  status: JobStatus;
  jobSource?: "peso" | "lgu";
  jobTags?: string[];
  milestones?: { _id: string; title: string; amount: number; description?: string; status: string }[];
  createdAt: string;
}

async function getJob(id: string): Promise<PublicJob | null> {
  try {
    await connectDB();
    const doc = await Job.findById(id)
      .select(
        "_id title category location budget scheduleDate description specialInstructions status jobSource jobTags milestones createdAt"
      )
      .lean();
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc)) as PublicJob;
  } catch {
    return null;
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  try {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job Not Found" };

  const title = `${job.title} — ${job.category} | LocalPro`;
  const description = `${job.description.slice(0, 150)}… Location: ${job.location}. Budget: ${formatPeso(job.budget)}.`;
  const ogImageUrl = `${APP_URL}/api/og?${new URLSearchParams({
    title: `${job.title} — ${job.category}`,
    description: `${job.location} · ${formatPeso(job.budget)}`,
    tag: job.status === "open" ? "Open Job" : job.category,
  }).toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_URL}/jobs/${id}`,
      siteName: "LocalPro Marketplace",
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
  } catch {
    return { title: "Job Details | LocalPro" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JobDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [job, session] = await Promise.all([getJob(id), getCurrentUser()]);
  if (!job) notFound();

  const isProvider = session?.role === "provider";
  const isGovJob   = job.jobSource === "peso" || job.jobSource === "lgu";
  const pageUrl    = `${APP_URL}/jobs/${job._id}`;
  const applyUrl   = `${APP_URL}/provider/marketplace?ref=${job._id}`;
  const qrUrl      = `${QR_BASE}&size=160x160&data=${encodeURIComponent(applyUrl)}`;
  const shareText  = `📌 Job Available: ${job.title} in ${job.location} — ${formatPeso(job.budget)}. Apply via LocalPro!`;
  const isOpen     = job.status === "open";
  const statusCfg  = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.expired;
  const ctaLabel   = isGovJob ? "Apply for Position" : "Apply Now";
  const registerLabel = isGovJob ? "Apply for Position" : "Apply as a Provider";

  // JSON-LD: JobPosting schema for Google Jobs and rich results
  const jobSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    validThrough: job.scheduleDate,
    employmentType: "CONTRACTOR",
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: "LocalPro",
      sameAs: APP_URL,
      logo: `${APP_URL}/logo.jpg`,
    },
    jobLocation: {
      "@type": "Place",
      name: job.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "PH",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "PHP",
      value: {
        "@type": "QuantitativeValue",
        value: job.budget,
        unitText: "FLAT_RATE",
      },
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">
        <Link
          href={BOARD_URL}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Board</span>
        </Link>

        <Link href={APP_URL} className="flex items-center gap-1.5">
          <span className="text-lg font-extrabold text-slate-900 tracking-tight">LocalPro</span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Marketplace</span>
        </Link>

        {isProvider ? (
          <a
            href={applyUrl}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-white"
          >
            {ctaLabel}
          </a>
        ) : (
          <a
            href={PROVIDER_REGISTER_URL}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-white"
          >
            Register as Provider
          </a>
        )}
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col lg:flex-row gap-6">

        {/* ── Left: Job Detail ─────────────────────────────────────────────── */}
        <article className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
              <Briefcase className="h-3 w-3 mr-1.5" />
              {job.category}
            </span>
            {job.jobSource === "peso" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold uppercase tracking-wider">
                🏛️ PESO
              </span>
            )}
            {job.jobSource === "lgu" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold uppercase tracking-wider">
                🏛️ LGU
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${statusCfg.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot} ${isOpen ? "animate-pulse" : ""}`} />
              {statusCfg.label}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              Posted {formatTimeAgo(job.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {job.title}
          </h1>

          {/* Key info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Location</p>
                <p className="text-sm font-semibold text-slate-900">{job.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <PhilippinePeso className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Budget</p>
                <p className="text-lg font-extrabold text-emerald-600">{formatPeso(job.budget)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <CalendarDays className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Schedule</p>
                <p className="text-sm font-semibold text-slate-900">{formatDate(job.scheduleDate)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              About this Job
            </h2>
            <div
              className="prose prose-sm max-w-none text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(job.description ?? "") }}
            />
          </section>

          {/* Special instructions */}
          {job.specialInstructions && job.specialInstructions.trim().length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Special Instructions
              </h2>
              <div
                className="prose prose-sm max-w-none text-amber-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(job.specialInstructions ?? "") }}
              />
            </section>
          )}

          {/* Gov source notice */}
          {isGovJob && (
            <section className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">🏛️</span>
              <div>
                <p className="text-sm font-bold text-sky-900 mb-1">
                  {job.jobSource === "peso" ? "PESO — Public Employment Service Office" : "LGU — Local Government Unit"} Posted Job
                </p>
                <p className="text-xs text-sky-700 leading-relaxed">
                  This job was posted by a government office through LocalPro's official integration.
                  Applicants are evaluated directly by the posting office.
                  No fees are charged to apply.
                </p>
              </div>
            </section>
          )}

          {/* Milestones */}
          {job.milestones && job.milestones.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Payment Milestones
              </h2>
              <div className="flex flex-col gap-2">
                {job.milestones.map((m, i) => (
                  <div
                    key={m._id ?? i}
                    className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
                        {m.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{m.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-base font-bold text-emerald-600 whitespace-nowrap">
                        {formatPeso(m.amount)}
                      </span>
                      {m.status === "released" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Payments are held in escrow and released per milestone.
              </p>
            </section>
          )}

          {/* Mobile-only share (below description on small screens) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 lg:hidden">
            <ShareButtons url={pageUrl} text={shareText} />
          </div>
        </article>

        {/* ── Right: Apply + QR ────────────────────────────────────────────── */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">

          {/* Apply card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Budget</p>
              <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {formatPeso(job.budget)}
              </p>
              {isGovJob && (
                <p className="text-[11px] text-sky-600 font-medium mt-1 flex items-center gap-1">
                  🏛️ {job.jobSource === "peso" ? "PESO" : "LGU"} Government Job
                </p>
              )}
            </div>

            {isOpen ? (
              <>
                {isProvider ? (
                  <a
                    href={applyUrl}
                    className="block w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-center font-bold text-white text-sm transition-colors"
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <>
                    <a
                      href={PROVIDER_REGISTER_URL}
                      className="block w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-center font-bold text-white text-sm transition-colors"
                    >
                      {registerLabel}
                    </a>
                    <a
                      href={`${LOGIN_URL}?redirect=/jobs/${job._id}`}
                      className="block w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-center font-semibold text-slate-700 text-sm transition-colors"
                    >
                      Log in to Apply
                    </a>
                  </>
                )}
              </>
            ) : (
              <div className="py-3 rounded-xl bg-slate-100 border border-slate-200 text-center text-sm font-semibold text-slate-600">
                This job is no longer accepting applications
              </div>
            )}

            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              {isGovJob
                ? "This is a government-posted job. Applications are reviewed by the PESO/LGU office."
                : "All payments are protected by LocalPro escrow. You only get paid when the client confirms completion."
              }
            </p>
          </div>

          {/* QR code card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isGovJob ? "Scan to Apply" : "Scan to Quote"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Scan QR code to apply"
              width={160}
              height={160}
              className="rounded-xl border border-slate-200 bg-white p-2"
            />
            <p className="text-[11px] text-slate-600 text-center">
              Scan with your phone camera to open this job on LocalPro
            </p>
          </div>

          {/* Desktop share */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 hidden lg:block">
            <ShareButtons url={pageUrl} text={shareText} />
          </div>

          {/* Posted at */}
          <p className="text-[11px] text-slate-600 text-center">
            Posted on {formatDate(job.createdAt)}
          </p>
        </aside>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-6 mt-8 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Powered by{" "}
            <Link href={APP_URL} className="text-primary hover:text-primary/80 font-semibold">
              LocalPro Marketplace
            </Link>
          </span>
          <div className="flex items-center gap-4">
            <Link href={BOARD_URL} className="hover:text-slate-900 transition-colors">
              View All Jobs
            </Link>
            <Link href={PROVIDER_REGISTER_URL} className="hover:text-slate-900 transition-colors">
              Become a Provider
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
