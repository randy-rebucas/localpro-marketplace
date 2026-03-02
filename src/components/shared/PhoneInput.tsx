"use client";

import { forwardRef } from "react";
import BasePhoneInput, {
  type Country,
  type Value,
  getCountryCallingCode,
} from "react-phone-number-input";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export { isValidPhoneNumber };
export type { Value as PhoneValue };

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Override auto-detected default country (ISO 3166-1 alpha-2) */
  defaultCountry?: Country;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// ─── Custom text input — matches the project's input style ───────────────────

const StyledInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function StyledInput({ className: _cls, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    );
  }
);
StyledInput.displayName = "StyledInput";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PhoneInput — internationally formatted phone number field.
 * Auto-detects region based on selected country flag; validates on blur.
 * Stores value in E.164 format (e.g. +639123456789).
 */
export default function PhoneInput({
  value,
  onChange,
  defaultCountry = "PH",
  placeholder,
  disabled,
  className,
  id,
}: PhoneInputProps) {
  // Format a hint like "+63 9XX XXX XXXX" for the selected country
  const callingCode = (() => {
    try {
      if (value) {
        const p = parsePhoneNumber(value);
        if (p?.country) return `+${getCountryCallingCode(p.country)}`;
      }
    } catch { /* ignore */ }
    return `+${getCountryCallingCode(defaultCountry)}`;
  })();

  const isValid = value ? isValidPhoneNumber(value) : null;

  return (
    <div className={className}>
      <div
        className={[
          "flex items-center gap-1 w-full rounded-lg border px-3 py-2 transition-colors",
          "focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary",
          isValid === false
            ? "border-red-300 bg-red-50/40"
            : "border-slate-200 bg-white",
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <BasePhoneInput
          id={id}
          flags={flags}
          international
          countryCallingCodeEditable={false}
          defaultCountry={defaultCountry}
          value={value as Value}
          onChange={(v) => onChange(v ?? "")}
          placeholder={placeholder ?? `${callingCode} …`}
          disabled={disabled}
          inputComponent={StyledInput}
          // Inline minimal style overrides for the flag + country selector
          className="contents"
        />
      </div>
      {isValid === false && value.length > 4 && (
        <p className="mt-1 text-xs text-red-500">
          Invalid phone number for the selected country.
        </p>
      )}
      {isValid === true && (
        <p className="mt-1 text-xs text-emerald-600">✓ Valid number</p>
      )}
    </div>
  );
}
