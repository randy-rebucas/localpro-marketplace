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
  PhilippinePeso,
  ListChecks,
} from "lucide-react";

import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { getCurrentUser } from "@/lib/auth";
import { ShareButtons } from "./ShareButtons";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const PROVIDER_REGISTER_URL = `${APP_URL}/register?role=provider`;
const LOGIN_URL = `${APP_URL}/login`;
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
  open:                { label: "Open",             badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  pending_validation:  { label: "Pending Review",   badge: "bg-yellow-50  text-yellow-700  border-yellow-200",  dot: "bg-yellow-500"  },
  assigned:            { label: "Assigned",         badge: "bg-amber-50   text-amber-700   border-amber-200",   dot: "bg-amber-500"   },
  in_progress:         { label: "In Progress",      badge: "bg-amber-50   text-amber-700   border-amber-200",   dot: "bg-amber-500"   },
  completed:           { label: "Completed",        badge: "bg-blue-50    text-blue-700    border-blue-200",    dot: "bg-blue-500"    },
  disputed:            { label: "Disputed",         badge: "bg-rose-50    text-rose-700    border-rose-200",    dot: "bg-rose-500"    },
  rejected:            { label: "Rejected",         badge: "bg-slate-100  text-slate-600   border-slate-200",   dot: "bg-slate-400"   },
  refunded:            { label: "Refunded",         badge: "bg-slate-100  text-slate-600   border-slate-200",   dot: "bg-slate-400"   },
  expired:             { label: "Expired",          badge: "bg-slate-100  text-slate-600   border-slate-200",   dot: "bg-slate-400"   },
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

      <PublicHeader />

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:py-10">
        <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-700">Home</Link>
          <span>/</span>
          <Link href="/jobs" className="hover:text-brand-700">Browse Jobs</Link>
          <span>/</span>
          <span className="text-slate-700">{job.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

        {/* ── Left: Job Detail ─────────────────────────────────────────────── */}
        <article className="min-w-0">

          <div className="mb-6 rounded-3xl bg-gradient-to-br from-white via-brand-50/45 to-primary-50/60 p-6 shadow-[0_16px_55px_rgba(10,37,64,0.08)] ring-1 ring-slate-200 sm:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
                <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                {job.category}
              </span>
              {job.jobSource === "peso" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 ring-1 ring-sky-200">
                  PESO
                </span>
              )}
              {job.jobSource === "lgu" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700 ring-1 ring-teal-200">
                  LGU
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusCfg.badge}`}
              >
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusCfg.dot} ${isOpen ? "animate-pulse" : ""}`} />
                {statusCfg.label}
              </span>
            </div>

            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-[#0a2540] sm:text-4xl">
              {job.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Review the job details, confirm the scope, and apply as a verified LocalPro provider.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-700" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-brand-700" />
                {formatDate(job.scheduleDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-700" />
                Posted {formatTimeAgo(job.createdAt)}
              </span>
            </div>
          </div>

          {/* Key info grid */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-700" />
              <div>
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</p>
                <p className="text-sm font-bold text-[#0a2540]">{job.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <PhilippinePeso className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-700" />
              <div>
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Budget</p>
                <p className="text-lg font-extrabold text-brand-700">{formatPeso(job.budget)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-700" />
              <div>
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Schedule</p>
                <p className="text-sm font-bold text-[#0a2540]">{formatDate(job.scheduleDate)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0a2540]">
              <Briefcase className="h-4 w-4" />
              About this job
            </h2>
            <div
              className="prose prose-sm max-w-none text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(job.description ?? "") }}
            />
          </section>

          {/* Special instructions */}
          {job.specialInstructions && job.specialInstructions.trim().length > 0 && (
            <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-amber-900">
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
            <section className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <span className="mt-0.5 text-2xl leading-none">🏛️</span>
              <div>
                <p className="mb-1 text-sm font-bold text-sky-900">
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
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0a2540]">
                <ListChecks className="h-4 w-4" />
                Payment Milestones
              </h2>
              <div className="flex flex-col gap-3">
                {job.milestones.map((m, i) => (
                  <div
                    key={m._id ?? i}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
                        {m.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{m.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap text-base font-bold text-brand-700">
                        {formatPeso(m.amount)}
                      </span>
                      {m.status === "released" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Payments are held in escrow and released per milestone.
              </p>
            </section>
          )}

          {/* Mobile-only share (below description on small screens) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:hidden">
            <ShareButtons url={pageUrl} text={shareText} />
          </div>
        </article>

        {/* ── Right: Apply + QR ────────────────────────────────────────────── */}
        <aside className="w-full flex-shrink-0 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-4">

          {/* Apply card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(10,37,64,0.08)]">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Project Budget</p>
              <p className="text-3xl font-extrabold tracking-tight text-brand-700">
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
                    className="block w-full rounded-xl bg-brand py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <>
                    <a
                      href={PROVIDER_REGISTER_URL}
                      className="block w-full rounded-xl bg-brand py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-600"
                    >
                      {registerLabel}
                    </a>
                    <a
                      href={`${LOGIN_URL}?redirect=/jobs/${job._id}`}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Log in to Apply
                    </a>
                  </>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-100 py-3 text-center text-sm font-semibold text-slate-600">
                This job is no longer accepting applications
              </div>
            )}

            <div className="rounded-xl bg-brand-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0a2540]">
                <CheckCircle2 className="h-4 w-4 text-brand-700" />
                Why apply through LocalPro?
              </p>
              <ul className="space-y-2 text-xs leading-5 text-slate-600">
                <li>Verified customers and protected communication.</li>
                <li>Escrow-backed payment support for marketplace jobs.</li>
                <li>Build your profile with successful completed work.</li>
              </ul>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-slate-600">
              {isGovJob
                ? "This is a government-posted job. Applications are reviewed by the PESO/LGU office."
                : "All payments are protected by LocalPro escrow. You only get paid when the client confirms completion."
              }
            </p>
          </div>

          {/* QR code card */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#0a2540]">
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
            <p className="text-center text-[11px] text-slate-600">
              Scan with your phone camera to open this job on LocalPro
            </p>
          </div>

          {/* Desktop share */}
          <div className="hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:block">
            <ShareButtons url={pageUrl} text={shareText} />
          </div>

          {/* Posted at */}
          <p className="text-center text-[11px] text-slate-600">
            Posted on {formatDate(job.createdAt)}
          </p>
          </div>
        </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
