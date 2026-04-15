"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Eye, Calendar, Link as LinkIcon, Loader, BarChart3, Download, RotateCcw, Zap } from "lucide-react";
import { toast } from "react-hot-toast";

interface BlogAnalytics {
  blogId: string;
  title: string;
  slug: string;
  views: number;
  avgReadTime: number;
  avgScrollDepth: number;
  returnVisits: number;
  latestView: string;
}

interface ReferrerData {
  referrer: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  topArticles: BlogAnalytics[];
  referrers: ReferrerData[];
  totalViews: number;
  totalArticles: number;
}

/**
 * Admin Analytics Dashboard
 * 
 * Displays blog analytics including:
 * - Date range filtering
 * - Top articles by views with engagement scoring
 * - Traffic referrer analysis
 * - Advanced metrics (bounce rate, engagement score)
 * - Export functionality
 */
export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [sortBy, setSortBy] = useState<"views" | "engagement" | "readtime">("views");

  useEffect(() => {
    loadAnalytics();
  }, [dateFrom, dateTo]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric: "top-articles",
        dateFrom,
        dateTo,
      });

      const topArticlesUrl = `/api/admin/analytics?${params.toString()}`;
      const referrersUrl = `/api/admin/analytics?metric=referrers&${new URLSearchParams({ dateFrom, dateTo }).toString()}`;

      console.log("Fetching analytics from:", topArticlesUrl);
      console.log("Fetching referrers from:", referrersUrl);

      const [topArticlesRes, referrersRes] = await Promise.all([
        fetch(topArticlesUrl),
        fetch(referrersUrl),
      ]);

      // Better error handling with response details
      if (!topArticlesRes.ok) {
        const errorData = await topArticlesRes.text();
        console.error("Top articles API error:", topArticlesRes.status, errorData);
        throw new Error(`Failed to load blog articles (${topArticlesRes.status}): ${errorData}`);
      }

      if (!referrersRes.ok) {
        const errorData = await referrersRes.text();
        console.error("Referrers API error:", referrersRes.status, errorData);
        throw new Error(`Failed to load referrer data (${referrersRes.status}): ${errorData}`);
      }

      const topArticles = await topArticlesRes.json();
      const referrers = await referrersRes.json();

      setAnalytics({
        topArticles: topArticles.articles || [],
        referrers: referrers.referrers || [],
        totalViews: topArticles.articles?.reduce((sum: number, a: BlogAnalytics) => sum + a.views, 0) || 0,
        totalArticles: topArticles.articles?.length || 0,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error loading analytics:", errorMsg);
      toast.error(`Failed to load analytics: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateEngagementScore = (article: BlogAnalytics): number => {
    // Engagement score: (views × read_time × scroll_depth%) / 100
    return Math.round((article.views * article.avgReadTime * article.avgScrollDepth) / 100);
  };

  const calculateBounceRate = (article: BlogAnalytics): number => {
    // Bounce rate estimate: 100 - (avg_scroll_depth × 0.8 + return_visits_ratio × 0.2)
    return Math.max(0, 100 - (article.avgScrollDepth * 0.8 + (article.returnVisits / Math.max(article.views, 1)) * 100 * 0.2));
  };

  const getSortedArticles = () => {
    if (!analytics?.topArticles) return [];
    
    const sorted = [...analytics.topArticles];
    if (sortBy === "engagement") {
      sorted.sort((a, b) => calculateEngagementScore(b) - calculateEngagementScore(a));
    } else if (sortBy === "readtime") {
      sorted.sort((a, b) => b.avgReadTime - a.avgReadTime);
    } else {
      sorted.sort((a, b) => b.views - a.views);
    }
    return sorted;
  };

  const exportAsCSV = () => {
    if (!analytics?.topArticles || analytics.topArticles.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Title", "Views", "Avg Read Time (min)", "Scroll Depth (%)", "Return Visits", "Engagement Score", "Bounce Rate (%)", "Latest View"];
    const rows = analytics.topArticles.map(a => [
      a.title,
      a.views,
      a.avgReadTime.toFixed(1),
      a.avgScrollDepth.toFixed(1),
      a.returnVisits,
      calculateEngagementScore(a),
      calculateBounceRate(a).toFixed(1),
      new Date(a.latestView).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-analytics-${dateFrom}_to_${dateTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
            <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              No analytics data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sortedArticles = getSortedArticles();
  const avgReadTimeAll = analytics.topArticles.length > 0 
    ? (analytics.topArticles.reduce((sum, a) => sum + a.avgReadTime, 0) / analytics.topArticles.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                  Blog Analytics
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Track engagement and performance metrics across your blog
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={loadAnalytics}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportAsCSV}
                className="px-3.5 py-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800 hover:shadow-sm transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
              />
            </div>
            <button
              onClick={() => {
                const d = new Date();
                setDateTo(d.toISOString().split("T")[0]);
                d.setDate(d.getDate() - 30);
                setDateFrom(d.toISOString().split("T")[0]);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Total Views
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {analytics.totalViews.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Published Articles
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {analytics.totalArticles}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Avg Read Time
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {avgReadTimeAll}
                </p>
                <p className="text-xs text-slate-500 mt-1">min</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Traffic Sources
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {analytics.referrers.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Articles */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              Top Performing Articles
            </h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <option value="views">Sort by Views</option>
              <option value="engagement">Sort by Engagement</option>
              <option value="readtime">Sort by Read Time</option>
            </select>
          </div>

          {sortedArticles.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No article data available for the selected date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Article</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Views</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Read Time</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Scroll Depth</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Returns</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Engagement</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedArticles.map((article, idx) => {
                    const engagementScore = calculateEngagementScore(article);
                    const bounceRate = calculateBounceRate(article);
                    return (
                      <tr
                        key={article.blogId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-bold text-slate-400 mt-0.5">#{idx + 1}</span>
                            <div className="min-w-0">
                              <a
                                href={`/blog/${article.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                              >
                                {article.title}
                                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                              </a>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(article.latestView).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold">
                            {article.views.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {article.avgReadTime.toFixed(1)} min
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                                style={{ width: `${article.avgScrollDepth}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-10 text-right">
                              {article.avgScrollDepth.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {article.returnVisits}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {engagementScore.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {bounceRate.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Referrers */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Traffic Referrers
          </h2>

          {analytics.referrers.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No referrer data available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.referrers.map((referrer) => (
                <div key={referrer.referrer} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <a
                        href={referrer.referrer !== "direct" ? referrer.referrer : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 break-all transition-colors"
                      >
                        {referrer.referrer === "direct" ? "🔗 Direct / Internal" : referrer.referrer}
                      </a>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-4 flex-shrink-0">
                        {referrer.count.toLocaleString()} — {referrer.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                        style={{ width: `${referrer.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
