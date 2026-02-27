"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Phone, ArrowRight, RotateCcw } from "lucide-react";

type Step = "phone" | "otp";

export default function PhoneLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode]   = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.match(/^\+?[1-9]\d{6,14}$/)) {
      toast.error("Enter a valid phone number (e.g. +639XXXXXXXXX)");
      return;
    }
    setIsLoading(true);
    try {
      const res  = await fetch("/api/auth/phone/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send OTP"); return; }
      toast.success("OTP sent! Check your SMS.");
      setStep("otp");
    } catch { toast.error("Something went wrong"); }
    finally  { setIsLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!code.match(/^\d{6}$/)) { toast.error("Enter the 6-digit code"); return; }
    setIsLoading(true);
    try {
      const res  = await fetch("/api/auth/phone/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Verification failed"); return; }
      toast.success(data.message);
      router.refresh();
      router.replace("/client/dashboard");
    } catch { toast.error("Something went wrong"); }
    finally  { setIsLoading(false); }
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 mt-4 space-y-3 bg-slate-50">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Phone className="h-4 w-4 text-primary" />
        Phone sign-in
      </div>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="flex gap-2">
          <input
            type="tel"
            className="input flex-1 text-sm"
            placeholder="+639XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-primary px-4 flex items-center gap-1.5 text-sm"
            disabled={isLoading}
          >
            {isLoading ? "Sending…" : <><ArrowRight className="h-4 w-4" /> Send code</>}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-2">
          <p className="text-xs text-slate-500">
            Code sent to <span className="font-semibold text-slate-700">{phone}</span>.{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => { setStep("phone"); setCode(""); }}
            >
              Change
            </button>
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              className="input flex-1 text-sm tracking-widest text-center font-bold"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <button
              type="submit"
              className="btn-primary px-4 flex items-center gap-1.5 text-sm"
              disabled={isLoading}
            >
              {isLoading ? "Verifying…" : "Verify"}
            </button>
          </div>
          <button
            type="button"
            className="text-xs text-slate-500 flex items-center gap-1 hover:text-primary"
            onClick={() => sendOtp(new Event("submit") as unknown as React.FormEvent)}
          >
            <RotateCcw className="h-3 w-3" /> Resend code
          </button>
        </form>
      )}
    </div>
  );
}
