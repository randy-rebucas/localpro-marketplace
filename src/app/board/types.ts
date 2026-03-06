// ─── Board Types ──────────────────────────────────────────────────────────────

export interface ActivityFeedItem {
  id: string;
  icon: string;
  message: string;
}

export interface BoardJob {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  scheduleDate: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  _id: string;
  name: string;
  avatar: string | null;
  completedJobCount: number;
  avgRating: number;
  completionRate: number;
  isLocalProCertified: boolean;
}

export interface BoardAnnouncement {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
}

export interface BoardData {
  jobs: BoardJob[];
  leaderboard: LeaderboardEntry[];
  announcements: BoardAnnouncement[];
  stats: { openJobs: number; completedJobs: number; topProviders: number };
  features: {
    activityFeed: boolean;
    earningsWidget: boolean;
    categoryDemand: boolean;
    achievementsWidget: boolean;
    urgentJobs: boolean;
    trainingCta: boolean;
    marketplaceStats: boolean;
    priceGuide: boolean;
    businessCta: boolean;
    partners: boolean;
    jobAlerts: boolean;
  };
  generatedAt: string;
}
