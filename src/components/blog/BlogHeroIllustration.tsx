/**
 * Custom SVG illustration for the blog page hero section.
 * Depicts a stylised content creation scene — an open book, a writer,
 * and floating elements representing insights, articles, and knowledge.
 * Mirrors the visual language of HeroIllustration (same palette + structure).
 */
export default function BlogHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background soft shapes */}
      <circle cx="240" cy="200" r="180" fill="url(#blog-grad-1)" opacity="0.08" />
      <circle cx="340" cy="120" r="80" fill="url(#blog-grad-2)" opacity="0.1" />
      <circle cx="140" cy="300" r="60" fill="url(#blog-grad-2)" opacity="0.08" />

      {/* Open Book */}
      <g transform="translate(60, 110)">
        {/* Shadow */}
        <ellipse cx="110" cy="172" rx="100" ry="11" fill="#1a5fa8" opacity="0.1" />
        {/* Spine */}
        <rect x="98" y="12" width="24" height="152" rx="3" fill="#1a5fa8" />
        {/* Left page */}
        <path d="M12 28 L100 15 L100 164 L12 170 Z" fill="white" stroke="#1a5fa8" strokeWidth="2" />
        {/* Right page */}
        <path d="M100 15 L204 28 L204 170 L100 164 Z" fill="#f8fafd" stroke="#1a5fa8" strokeWidth="2" />

        {/* Left page — heading line */}
        <line x1="26" y1="43" x2="82" y2="40" stroke="#1a5fa8" strokeWidth="3" strokeLinecap="round" />
        {/* Left page — body lines */}
        <line x1="26" y1="57" x2="88" y2="54" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="69" x2="85" y2="66" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="81" x2="88" y2="78" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="93" x2="73" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="105" x2="86" y2="102" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="117" x2="82" y2="115" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="129" x2="68" y2="127" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Right page — image placeholder */}
        <rect x="116" y="28" width="72" height="52" rx="4" fill="#dbeafe" stroke="#1a5fa8" strokeWidth="1.5" opacity="0.8" />
        <path d="M125 76 L138 55 L152 66 L162 57 L188 76Z" fill="#3ea53e" opacity="0.35" />
        <circle cx="176" cy="40" r="7" fill="#f59e0b" opacity="0.5" />
        {/* Right page — body lines */}
        <line x1="116" y1="92" x2="188" y2="95" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="116" y1="104" x2="185" y2="107" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="116" y1="116" x2="188" y2="119" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="116" y1="128" x2="168" y2="131" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="116" y1="140" x2="184" y2="143" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Writer figure */}
      <g transform="translate(328, 100)">
        {/* Hair */}
        <path d="M16 30 Q30 8 56 30 L58 38 Q30 14 14 38Z" fill="#334155" />
        {/* Head */}
        <circle cx="36" cy="42" r="22" fill="#fcd9b6" stroke="#e8a87c" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="28" cy="40" r="2.5" fill="#334155" />
        <circle cx="44" cy="40" r="2.5" fill="#334155" />
        {/* Smile */}
        <path d="M28 48 Q36 54 44 48" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Body / shirt */}
        <path d="M14 64 L10 138 L62 138 L58 64 Q36 74 14 64Z" fill="#1a5fa8" opacity="0.85" />
        {/* Left arm — extended forward (writing) */}
        <line x1="12" y1="80" x2="-14" y2="112" stroke="#fcd9b6" strokeWidth="7" strokeLinecap="round" />
        {/* Right arm — relaxed */}
        <line x1="60" y1="80" x2="76" y2="104" stroke="#fcd9b6" strokeWidth="7" strokeLinecap="round" />
        {/* Pen in left hand */}
        <g transform="translate(-22, 106) rotate(-35)">
          <rect x="0" y="-2.5" width="26" height="5" rx="2.5" fill="#475569" />
          <polygon points="26,-4 26,4 34,0" fill="#1a5fa8" />
          <rect x="-3" y="-2.5" width="6" height="5" rx="1" fill="#94a3b8" />
        </g>
        {/* Legs */}
        <rect x="16" y="138" width="14" height="52" rx="4" fill="#1e293b" />
        <rect x="40" y="138" width="14" height="52" rx="4" fill="#1e293b" />
        {/* Boots */}
        <rect x="13" y="184" width="20" height="10" rx="4" fill="#475569" />
        <rect x="37" y="184" width="20" height="10" rx="4" fill="#475569" />
      </g>

      {/* Connection line — dashed arc from book to writer */}
      <path
        d="M278 198 Q305 155 328 175"
        stroke="#1a5fa8"
        strokeWidth="2"
        strokeDasharray="6 4"
        fill="none"
        opacity="0.4"
      />

      {/* Lightbulb — floating (insights) */}
      <g transform="translate(215, 48)" opacity="0.75">
        <circle cx="14" cy="14" r="12" fill="#f59e0b" opacity="0.18" />
        <path d="M14 3 C8.5 3 4 7.5 4 13 C4 17.5 6.5 21 10 22.5 L10 26 L18 26 L18 22.5 C21.5 21 24 17.5 24 13 C24 7.5 19.5 3 14 3Z" fill="#f59e0b" opacity="0.8" />
        <line x1="10" y1="27" x2="18" y2="27" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="11" y1="30" x2="17" y2="30" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Tag chip — floating (categories) */}
      <g transform="translate(368, 64)" opacity="0.7">
        <rect x="0" y="0" width="76" height="26" rx="13" fill="#3ea53e" opacity="0.14" stroke="#3ea53e" strokeWidth="1.5" />
        <circle cx="13" cy="13" r="5" fill="#3ea53e" opacity="0.5" />
        <line x1="24" y1="10" x2="66" y2="10" stroke="#3ea53e" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <line x1="24" y1="16" x2="56" y2="16" stroke="#3ea53e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Star ratings — floating */}
      <g transform="translate(68, 76)" opacity="0.65">
        <polygon points="8,0 10,6 16,6 11,10 13,16 8,12 3,16 5,10 0,6 6,6" fill="#f59e0b" />
      </g>
      <g transform="translate(88, 69)" opacity="0.5">
        <polygon points="6,0 7.5,4.5 12,4.5 8.5,7.5 9.5,12 6,9 2.5,12 3.5,7.5 0,4.5 4.5,4.5" fill="#f59e0b" />
      </g>
      <g transform="translate(104, 76)" opacity="0.4">
        <polygon points="5,0 6,3.5 10,3.5 7,6 8,10 5,7.5 2,10 3,6 0,3.5 4,3.5" fill="#f59e0b" />
      </g>

      {/* Speech bubble — floating comment */}
      <g transform="translate(382, 248)" opacity="0.5">
        <rect x="0" y="0" width="58" height="36" rx="8" fill="white" stroke="#1a5fa8" strokeWidth="1.5" />
        <path d="M10 36 L5 46 L22 36" fill="white" stroke="#1a5fa8" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="15" cy="18" r="3" fill="#1a5fa8" opacity="0.45" />
        <circle cx="29" cy="18" r="3" fill="#1a5fa8" opacity="0.45" />
        <circle cx="43" cy="18" r="3" fill="#1a5fa8" opacity="0.45" />
      </g>

      {/* Calendar icon — floating */}
      <g transform="translate(34, 268)" opacity="0.42">
        <rect x="0" y="6" width="42" height="38" rx="4" fill="white" stroke="#1a5fa8" strokeWidth="2" />
        <rect x="0" y="6" width="42" height="15" rx="4" fill="#1a5fa8" opacity="0.6" />
        <rect x="9" y="0" width="5" height="13" rx="2.5" fill="#1a5fa8" />
        <rect x="28" y="0" width="5" height="13" rx="2.5" fill="#1a5fa8" />
        <circle cx="11" cy="30" r="2.5" fill="#1a5fa8" opacity="0.45" />
        <circle cx="21" cy="30" r="2.5" fill="#1a5fa8" opacity="0.45" />
        <circle cx="31" cy="30" r="2.5" fill="#1a5fa8" opacity="0.45" />
        <circle cx="11" cy="39" r="2.5" fill="#3ea53e" opacity="0.6" />
        <circle cx="21" cy="39" r="2.5" fill="#1a5fa8" opacity="0.3" />
      </g>

      {/* Sparkle dots */}
      <circle cx="196" cy="92" r="3" fill="#3ea53e" opacity="0.5" />
      <circle cx="308" cy="84" r="2" fill="#1a5fa8" opacity="0.4" />
      <circle cx="52" cy="165" r="2.5" fill="#1a5fa8" opacity="0.3" />
      <circle cx="425" cy="195" r="3" fill="#3ea53e" opacity="0.4" />
      <circle cx="420" cy="160" r="2" fill="#f59e0b" opacity="0.5" />

      {/* Bookmark ribbon — top of right page */}
      <g transform="translate(185, 108)" opacity="0.5">
        <path d="M0 0 L12 0 L12 22 L6 16 L0 22Z" fill="#1a5fa8" opacity="0.7" />
      </g>

      <defs>
        <radialGradient id="blog-grad-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a5fa8" />
          <stop offset="100%" stopColor="#3ea53e" />
        </radialGradient>
        <radialGradient id="blog-grad-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3ea53e" />
          <stop offset="100%" stopColor="#1a5fa8" />
        </radialGradient>
      </defs>
    </svg>
  );
}
