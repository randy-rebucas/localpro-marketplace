import type { ClientTier } from "@/types";

const TIER_CONFIG: Record<ClientTier, { label: string; bg: string; text: string; ring: string }> = {
  standard: { label: "Standard", bg: "bg-slate-100",  text: "text-slate-600",  ring: "ring-slate-200" },
  silver:   { label: "Silver",   bg: "bg-blue-100",   text: "text-blue-700",   ring: "ring-blue-200" },
  gold:     { label: "Gold",     bg: "bg-amber-100",  text: "text-amber-700",  ring: "ring-amber-200" },
  platinum: { label: "Platinum", bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
};

const TIER_EMOJI: Record<ClientTier, string> = {
  standard: "⭐",
  silver:   "🥈",
  gold:     "🥇",
  platinum: "💎",
};

interface Props {
  tier: ClientTier;
  size?: "sm" | "md";
  showEmoji?: boolean;
}

export default function LoyaltyBadge({ tier, size = "sm", showEmoji = true }: Props) {
  const config = TIER_CONFIG[tier];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${config.bg} ${config.text} ${config.ring} ${sizeClass}`}
    >
      {showEmoji && <span>{TIER_EMOJI[tier]}</span>}
      {config.label}
    </span>
  );
}
