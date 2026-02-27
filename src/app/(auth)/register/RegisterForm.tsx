"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";

type Role = "client" | "provider";

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "client",
    label: "Client",
    description: "I need to hire local service professionals",
  },
  {
    value: "provider",
    label: "Service Provider",
    description: "I offer professional services to clients",
  },
];

export default function RegisterForm() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "client" as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name || form.name.length < 2) errs.name = "Name must be at least 2 characters";
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.password || form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errs.password = "Must contain uppercase, lowercase, and a number";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Registration failed");
        return;
      }

      setUser(data.user);
      toast.success("Account created successfully!");
      router.push(`/${data.user.role}/dashboard`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Create account</h2>
      <p className="text-slate-500 text-sm mb-6">Join LocalPro today</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selection */}
        <div>
          <p className="label mb-2">I am a...</p>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  form.role === r.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className={`text-sm font-medium ${form.role === r.value ? "text-primary" : "text-slate-700"}`}>
                  {r.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{r.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="label block mb-1">Full name</label>
          <input
            id="name"
            type="text"
            className={`input w-full ${errors.name ? "border-red-400" : ""}`}
            placeholder="John Smith"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={isLoading}
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label block mb-1">Email address</label>
          <input
            id="email"
            type="email"
            className={`input w-full ${errors.email ? "border-red-400" : ""}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label block mb-1">Password</label>
          <input
            id="password"
            type="password"
            className={`input w-full ${errors.password ? "border-red-400" : ""}`}
            placeholder="Min 8 chars, upper + lower + number"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          By creating an account you agree to our{" "}
          <Link href="/terms"   className="underline hover:text-primary transition-colors">Terms of Service</Link>
          {" "}&amp;{" "}
          <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>

      <div className="flex items-center gap-3 my-4">
        <div className="border-t border-slate-200 flex-1" />
        <span className="text-xs text-slate-400">or sign up with</span>
        <div className="border-t border-slate-200 flex-1" />
      </div>

      <a
        href="/api/auth/facebook"
        className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors text-sm font-medium text-slate-700"
      >
        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.932-1.956 1.887v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
        Continue with Facebook
      </a>
    </>
  );
}
