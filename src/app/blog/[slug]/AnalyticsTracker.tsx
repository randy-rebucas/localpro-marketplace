"use client";

import { useEffect, useRef, useState } from "react";

interface AnalyticsTrackerProps {
  blogId: string;
}

/**
 * Analytics Tracker Component
 * Tracks page views, read time, and scroll depth
 * Should be placed near the top of blog article pages
 */
export default function AnalyticsTracker({ blogId }: AnalyticsTrackerProps) {
  const sessionIdRef = useRef<string>("");
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);

  // Generate or retrieve session ID
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Try to get existing session ID from sessionStorage
    let sessionId = sessionStorage.getItem("_blog_session_id");
    if (!sessionId) {
      // Generate new session ID
      sessionId =
        "sess_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("_blog_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;

    // Track scroll depth
    const handleScroll = () => {
      if (typeof window === "undefined") return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const scrolled = (scrollTop / (documentHeight - windowHeight)) * 100;
      scrollDepthRef.current = Math.min(Math.max(scrolled, 0), 100);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Track engagement on page leave
  useEffect(() => {
    const trackPageView = async () => {
      if (!sessionIdRef.current || !blogId) return;

      const readTime = (Date.now() - startTimeRef.current) / 1000; // in seconds
      const referrer = document.referrer;

      try {
        await fetch(`/api/blog/${blogId}/track-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            readTime: Math.round(readTime),
            scrollDepth: Math.round(scrollDepthRef.current),
            referrer: referrer || undefined,
          }),
          // Use keepalive to ensure request is sent even if page is closing
          keepalive: true,
        }).catch(() => {
          // Silently handle errors
        });
      } catch (error) {
        // Silently handle errors
      }
    };

    // Track on page unload
    window.addEventListener("beforeunload", trackPageView);

    // Also track on component unmount (in case of SPA navigation)
    return () => {
      window.removeEventListener("beforeunload", trackPageView);
      trackPageView();
    };
  }, [blogId]);

  // This component doesn't render anything visible
  return null;
}
