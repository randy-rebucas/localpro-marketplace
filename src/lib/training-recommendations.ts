/**
 * Deterministic training recommendations: trade clusters, TESDA/industry pathways,
 * LocalPro course ranking from catalog snapshots, and performance-aware rationale templates.
 */

import type { TrainingCourseCategory } from "@/types";

export type TradeCluster =
  | "electrical"
  | "plumbing"
  | "cleaning"
  | "beauty"
  | "construction"
  | "food"
  | "it"
  | "hvac"
  | "general_service";

export type RecommendationSource = "localpro" | "external";

export interface ExternalCertSuggestion {
  cluster: TradeCluster;
  /** Display title (TESDA NC or industry-recognized pathway) */
  title: string;
  /** Short factual framing — informational only */
  pathwayNote: string;
}

export interface CatalogCourseInput {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: TrainingCourseCategory;
  enrolled?: boolean;
  enrollmentStatus?: string | null;
}

export interface ProviderPerformanceSnapshot {
  skillLabels: string[];
  completedJobCount: number;
  avgRating: number;
  completionRate: number;
  avgResponseTimeHours: number;
  earnedBadgeSlugs: string[];
  profileCertificationsCount: number;
}

export interface TrainingRecommendationItem {
  source: RecommendationSource;
  courseId?: string;
  slug?: string;
  title: string;
  category?: TrainingCourseCategory;
  rationale: string;
  /** External programs (TESDA / accredited pathways) */
  pathwayNote?: string;
  externalUrl?: string;
}

export interface TrainingRecommendationsResult {
  clusters: TradeCluster[];
  performanceHint: string;
  items: TrainingRecommendationItem[];
  cpdMessage: string;
}

const TESDA_PORTAL_URL = "https://www.tesda.gov.ph/";

const CLUSTER_KEYWORDS: Record<TradeCluster, string[]> = {
  electrical: ["electric", "electrical", "wiring", "breaker", "lineman", "prc electrical"],
  plumbing: ["plumb", "pipe", "sanitary", "water line", "leak"],
  cleaning: ["clean", "maid", "sanitize", "janitorial", "deep clean"],
  beauty: ["salon", "beauty", "hair", "barber", "spa", "nail"],
  construction: ["build", "carpent", "mason", "paint", "welding", "steel"],
  food: ["cook", "culinar", "catering", "bakery", "food"],
  it: ["software", "computer", "network", "developer", "technician", "programming", "laptop", "server"],
  hvac: ["hvac", "aircon", "cooling", "refrigerat"],
  general_service: [],
};

/** Curated suggestions — informational; providers verify current NC offerings with TESDA/regulators */
export const EXTERNAL_CERTS_BY_CLUSTER: Record<TradeCluster, ExternalCertSuggestion[]> = {
  electrical: [
    {
      cluster: "electrical",
      title: "TESDA Electrical Installation and Maintenance NC II",
      pathwayNote: "National competency standard for residential and commercial electrical work.",
    },
    {
      cluster: "electrical",
      title: "PRC Registered Electrical Engineer / Master Electrician (where applicable)",
      pathwayNote: "Industry-recognized licensure for advanced electrical practice.",
    },
  ],
  plumbing: [
    {
      cluster: "plumbing",
      title: "TESDA Plumbing NC II",
      pathwayNote: "Core competencies for water supply, sanitary, and drainage installations.",
    },
  ],
  cleaning: [
    {
      cluster: "cleaning",
      title: "TESDA Domestic Work NC II",
      pathwayNote: "Structured competencies for professional cleaning and household services.",
    },
    {
      cluster: "cleaning",
      title: "BOSH / occupational safety awareness (industry-recognized)",
      pathwayNote: "Supports safe chemical handling and client-site protocols.",
    },
  ],
  beauty: [
    {
      cluster: "beauty",
      title: "TESDA Hairdressing NC II / Beauty Care NC II",
      pathwayNote: "Aligned with salon and wellness service standards.",
    },
  ],
  construction: [
    {
      cluster: "construction",
      title: "TESDA Carpentry NC II / Masonry NC II",
      pathwayNote: "Trade-aligned pathways depending on your primary construction discipline.",
    },
    {
      cluster: "construction",
      title: "Construction safety orientation (OSHC-industry programs)",
      pathwayNote: "Reduces site risk and supports higher-trust bookings.",
    },
  ],
  food: [
    {
      cluster: "food",
      title: "TESDA Cookery / Bread & Pastry NC II",
      pathwayNote: "Recognized entry-to-mid pathways for culinary service providers.",
    },
    {
      cluster: "food",
      title: "Food safety / HACCP awareness training",
      pathwayNote: "Industry-recognized baseline for client-facing food work.",
    },
  ],
  it: [
    {
      cluster: "it",
      title: "TESDA Computer Systems Servicing NC II",
      pathwayNote: "Common competency baseline for field IT support roles.",
    },
    {
      cluster: "it",
      title: "Vendor-neutral certifications (e.g. networking/cloud fundamentals)",
      pathwayNote: "Choose accredited providers; aligns skills with enterprise expectations.",
    },
  ],
  hvac: [
    {
      cluster: "hvac",
      title: "TESDA RAC Servicing NC II (domestic)",
      pathwayNote: "Relevant for AC installation and maintenance service lines.",
    },
  ],
  general_service: [
    {
      cluster: "general_service",
      title: "TESDA Customer Services NC II",
      pathwayNote: "Strengthens communication and service recovery — valuable across categories.",
    },
    {
      cluster: "general_service",
      title: "Leadership of Self / small-business skills programs (TESDA or accredited partners)",
      pathwayNote: "Supports scaling quality as your marketplace volume grows.",
    },
  ],
};

export function inferTradeClusters(skillLabels: string[]): TradeCluster[] {
  const haystack = skillLabels.map((s) => s.toLowerCase()).join(" ");
  const hits = new Set<TradeCluster>();
  (Object.keys(CLUSTER_KEYWORDS) as TradeCluster[]).forEach((cluster) => {
    if (cluster === "general_service") return;
    const kws = CLUSTER_KEYWORDS[cluster];
    if (kws.some((kw) => haystack.includes(kw.trim()))) hits.add(cluster);
  });
  if (hits.size === 0) hits.add("general_service");
  return [...hits];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function performanceHintLine(p: ProviderPerformanceSnapshot): string {
  const parts: string[] = [];
  if (p.completedJobCount < 10) {
    parts.push("you are still building your marketplace track record");
  }
  if (p.avgRating > 0 && p.avgRating < 4.0) {
    parts.push("client ratings suggest sharpening service delivery and communication");
  }
  if (p.completionRate > 0 && p.completionRate < 80) {
    parts.push("completion rate points to finishing jobs reliably on scope");
  }
  if (p.avgResponseTimeHours >= 24) {
    parts.push("response times are slower than many top providers");
  }
  if (parts.length === 0) {
    parts.push("your profile metrics support investing in deeper specialization");
  }
  return parts.slice(0, 2).join(", ");
}

/** Score catalog courses by relevance to skills + performance nudges */
export function scoreCourseForProvider(
  course: CatalogCourseInput,
  skillText: string,
  p: ProviderPerformanceSnapshot
): number {
  const corpus = `${course.title} ${course.slug} ${course.description}`.toLowerCase();
  const tokens = new Set(tokenize(skillText));
  let score = 0;
  for (const t of tokens) {
    if (corpus.includes(t)) score += 3;
  }
  if (p.avgRating > 0 && p.avgRating < 4.2 && course.category === "basic") score += 4;
  if (p.completionRate > 0 && p.completionRate < 85 && course.category === "advanced") score += 2;
  if (course.category === "safety") score += p.avgRating > 0 && p.avgRating < 4.2 ? 10 : 6;
  if (course.category === "certification") score += 5;
  if (course.enrollmentStatus === "completed") score -= 100;
  if (course.enrolled && course.enrollmentStatus !== "completed") score -= 30;
  return score;
}

function localProRationale(course: CatalogCourseInput, p: ProviderPerformanceSnapshot): string {
  const hint = performanceHintLine(p);
  if (course.category === "safety") {
    return `Based on your focus areas and performance (${hint}), strengthening safety habits can reduce incidents and improve client confidence.`;
  }
  if (course.category === "certification") {
    return `Your service profile (${hint}) pairs well with a formal certification track clients can recognize alongside marketplace badges.`;
  }
  if (p.avgRating > 0 && p.avgRating < 4.2) {
    return `Given ${hint}, this course supports clearer scopes, communication, and repeatable quality—often reflected in ratings.`;
  }
  return `Aligned with your stated skills and marketplace activity (${hint}), this LocalPro module complements hands-on work with structured learning.`;
}

function externalRationale(cluster: TradeCluster, p: ProviderPerformanceSnapshot): string {
  const hint = performanceHintLine(p);
  const clusterLabel =
    cluster === "general_service"
      ? "broad service excellence"
      : `${cluster.replace(/_/g, " ")} trades`;
  return `For ${clusterLabel}, this pathway is widely cited in the Philippines skills ecosystem (${hint}); verify current schedules with TESDA or an accredited training partner.`;
}

export function buildTrainingRecommendations(
  performance: ProviderPerformanceSnapshot,
  catalog: CatalogCourseInput[],
  maxLocalPro = 3,
  maxExternal = 4
): TrainingRecommendationsResult {
  const clusters = inferTradeClusters(performance.skillLabels);
  const skillText = performance.skillLabels.join(" ");

  const perfHint = performanceHintLine(performance);

  const ranked = [...catalog]
    .map((c) => ({ c, s: scoreCourseForProvider(c, skillText, performance) }))
    .sort((a, b) => b.s - a.s);

  const pickedLocal = ranked.filter((x) => x.s > -50).slice(0, maxLocalPro).map((x) => x.c);

  const items: TrainingRecommendationItem[] = [];

  for (const course of pickedLocal) {
    items.push({
      source: "localpro",
      courseId: course._id,
      slug: course.slug,
      title: course.title,
      category: course.category,
      rationale: localProRationale(course, performance),
    });
  }

  const externals: ExternalCertSuggestion[] = [];
  for (const cl of clusters) {
    externals.push(...EXTERNAL_CERTS_BY_CLUSTER[cl]);
  }
  const dedupe = new Map<string, ExternalCertSuggestion>();
  for (const e of externals) {
    dedupe.set(e.title, e);
  }
  [...dedupe.values()].slice(0, maxExternal).forEach((e) => {
    items.push({
      source: "external",
      title: e.title,
      pathwayNote: e.pathwayNote,
      rationale: externalRationale(e.cluster, performance),
      externalUrl: TESDA_PORTAL_URL,
    });
  });

  const cpdMessage =
    "Continuous professional development keeps your skills aligned with TESDA standards, industry expectations, and what LocalPro clients reward—schedule regular upskilling alongside every milestone on the platform.";

  return {
    clusters,
    performanceHint: perfHint,
    items,
    cpdMessage,
  };
}
