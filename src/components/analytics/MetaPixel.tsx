"use client";

/**
 * Meta (Facebook) Pixel — injected dynamically after cookie consent,
 * matching the same pattern used by CookieConsent for GTM.
 *
 * Usage: call `injectMetaPixel()` after the user accepts cookies.
 * The noscript fallback is rendered by this component once mounted.
 */

import { useEffect, useState } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Inject the fbevents.js snippet and fire PageView. Safe to call multiple times. */
export function injectMetaPixel() {
  if (!PIXEL_ID) return;
  if (document.getElementById("meta-pixel-script")) return;

  type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[][];
    push: (...args: unknown[]) => void;
    loaded: boolean;
    version: string;
  };

  const win = window as Window & { fbq?: Fbq; _fbq?: Fbq };

  if (!win.fbq) {
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    win.fbq = fbq;
    win._fbq = fbq;
  }

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  win.fbq!("init", PIXEL_ID);
  win.fbq!("track", "PageView");
}

/** Push a standard or custom event to the Pixel (no-op if Pixel not loaded). */
export function trackPixelEvent(event: string, params?: Record<string, unknown>) {
  const win = window as Window & { fbq?: (...args: unknown[]) => void };
  if (!win.fbq) return;
  win.fbq("track", event, params);
}

/**
 * Noscript fallback pixel image — renders once after mount so it doesn't
 * cause a hydration mismatch.
 */
export default function MetaPixelNoscript() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !PIXEL_ID) return null;
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
