"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";

const STORAGE_KEY = "wallet_topup_session";

/**
 * Rendered on the wallet page whenever ?topup=success is in the URL.
 * Reads the session ID from sessionStorage (set by WalletTopUpForm before redirect),
 * calls the verify API once, refreshes the server component to show the new balance,
 * then clears the stored session ID.
 */
export default function WalletTopUpConfirm() {
  const router = useRouter();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);

    // Parse stored value — supports both legacy plain string and new {sessionId, createdAt} format
    let sessionId: string | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { sessionId?: string; createdAt?: number };
        const TTL_MS = 60 * 60 * 1000; // 1 hour
        if (parsed.sessionId && parsed.createdAt && Date.now() - parsed.createdAt < TTL_MS) {
          sessionId = parsed.sessionId;
        }
      } catch {
        // Legacy plain-string format
        sessionId = raw;
      }
    }

    if (!sessionId) {
      // No valid session ID — webhook may have already credited it, just refresh
      router.refresh();
      return;
    }

    apiFetch("/api/wallet/topup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json())
      .then((data: { result?: string }) => {
        if (data.result === "credited") {
          toast.success("Wallet topped up! Your balance has been updated.");
        }
        // "already_done" means webhook beat us — balance already credited
        // "not_paid" should not happen on the success URL, but handle gracefully
        router.refresh();
      })
      .catch(() => {
        // Non-fatal — webhook fallback will still credit the wallet
        router.refresh();
      });
  }, [router]);

  return null;
}
