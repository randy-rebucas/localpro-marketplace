/**
 * Custom SVG illustration for the homepage hero section.
 * Depicts a stylised scene of a homeowner and service professional
 * connected through the LocalPro platform — house, tools, handshake.
 */
export default function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background soft shapes */}
      <circle cx="240" cy="200" r="180" fill="url(#hero-grad-1)" opacity="0.08" />
      <circle cx="340" cy="120" r="80" fill="url(#hero-grad-2)" opacity="0.1" />
      <circle cx="140" cy="300" r="60" fill="url(#hero-grad-2)" opacity="0.08" />

      {/* House */}
      <g transform="translate(80, 100)">
        {/* Roof */}
        <path d="M0 120 L100 40 L200 120" stroke="#1a5fa8" strokeWidth="4" fill="#eef5fc" strokeLinecap="round" strokeLinejoin="round" />
        {/* Walls */}
        <rect x="20" y="120" width="160" height="120" rx="4" fill="white" stroke="#1a5fa8" strokeWidth="3" />
        {/* Door */}
        <rect x="80" y="170" width="40" height="70" rx="4" fill="#1a5fa8" opacity="0.15" stroke="#1a5fa8" strokeWidth="2" />
        <circle cx="112" cy="208" r="3" fill="#1a5fa8" />
        {/* Window left */}
        <rect x="35" y="140" width="32" height="28" rx="3" fill="#d5e9f8" stroke="#1a5fa8" strokeWidth="2" />
        <line x1="51" y1="140" x2="51" y2="168" stroke="#1a5fa8" strokeWidth="1.5" />
        <line x1="35" y1="154" x2="67" y2="154" stroke="#1a5fa8" strokeWidth="1.5" />
        {/* Window right */}
        <rect x="133" y="140" width="32" height="28" rx="3" fill="#d5e9f8" stroke="#1a5fa8" strokeWidth="2" />
        <line x1="149" y1="140" x2="149" y2="168" stroke="#1a5fa8" strokeWidth="1.5" />
        <line x1="133" y1="154" x2="165" y2="154" stroke="#1a5fa8" strokeWidth="1.5" />
        {/* Chimney */}
        <rect x="145" y="55" width="24" height="45" rx="2" fill="white" stroke="#1a5fa8" strokeWidth="2.5" />
      </g>

      {/* Service professional figure */}
      <g transform="translate(330, 140)">
        {/* Hard hat */}
        <ellipse cx="40" cy="20" rx="28" ry="8" fill="#3ea53e" opacity="0.9" />
        <rect x="18" y="12" width="44" height="10" rx="5" fill="#3ea53e" />
        {/* Head */}
        <circle cx="40" cy="36" r="18" fill="#fcd9b6" stroke="#e8a87c" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="34" cy="34" r="2" fill="#334155" />
        <circle cx="46" cy="34" r="2" fill="#334155" />
        {/* Smile */}
        <path d="M34 42 Q40 48 46 42" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Body / shirt */}
        <path d="M20 54 L15 120 L65 120 L60 54 Q40 64 20 54Z" fill="#3ea53e" opacity="0.85" />
        {/* Arms */}
        <line x1="15" y1="70" x2="-5" y2="95" stroke="#fcd9b6" strokeWidth="6" strokeLinecap="round" />
        <line x1="65" y1="70" x2="85" y2="95" stroke="#fcd9b6" strokeWidth="6" strokeLinecap="round" />
        {/* Wrench in hand */}
        <g transform="translate(80, 85) rotate(25)">
          <rect x="0" y="-3" width="28" height="6" rx="3" fill="#94a3b8" />
          <circle cx="28" cy="0" r="8" fill="none" stroke="#94a3b8" strokeWidth="4" />
        </g>
        {/* Legs */}
        <rect x="22" y="120" width="14" height="50" rx="4" fill="#1e293b" />
        <rect x="44" y="120" width="14" height="50" rx="4" fill="#1e293b" />
        {/* Boots */}
        <rect x="19" y="165" width="20" height="10" rx="4" fill="#475569" />
        <rect x="41" y="165" width="20" height="10" rx="4" fill="#475569" />
      </g>

      {/* Connection line — dashed arc from house to pro */}
      <path
        d="M280 210 Q310 160 330 180"
        stroke="#1a5fa8"
        strokeWidth="2"
        strokeDasharray="6 4"
        fill="none"
        opacity="0.4"
      />

      {/* Shield / escrow badge */}
      <g transform="translate(290, 270)">
        <path d="M20 0 L40 8 L40 28 Q40 44 20 52 Q0 44 0 28 L0 8Z" fill="#1a5fa8" opacity="0.12" stroke="#1a5fa8" strokeWidth="2" />
        <path d="M14 26 L18 30 L28 18" stroke="#3ea53e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Star ratings floating */}
      <g transform="translate(100, 75)" opacity="0.6">
        <polygon points="8,0 10,6 16,6 11,10 13,16 8,12 3,16 5,10 0,6 6,6" fill="#f59e0b" />
      </g>
      <g transform="translate(120, 68)" opacity="0.5">
        <polygon points="6,0 7.5,4.5 12,4.5 8.5,7.5 9.5,12 6,9 2.5,12 3.5,7.5 0,4.5 4.5,4.5" fill="#f59e0b" />
      </g>
      <g transform="translate(136, 75)" opacity="0.4">
        <polygon points="5,0 6,3.5 10,3.5 7,6 8,10 5,7.5 2,10 3,6 0,3.5 4,3.5" fill="#f59e0b" />
      </g>

      {/* Map pin */}
      <g transform="translate(355, 280)" opacity="0.5">
        <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.4 18.6 0 12 0Z" fill="#1a5fa8" opacity="0.2" stroke="#1a5fa8" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="5" fill="#1a5fa8" opacity="0.5" />
      </g>

      {/* Peso sign */}
      <g transform="translate(60, 280)" opacity="0.3">
        <text x="0" y="24" fontSize="28" fontWeight="700" fill="#1a5fa8" fontFamily="system-ui">&#x20B1;</text>
      </g>

      <defs>
        <radialGradient id="hero-grad-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a5fa8" />
          <stop offset="100%" stopColor="#3ea53e" />
        </radialGradient>
        <radialGradient id="hero-grad-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3ea53e" />
          <stop offset="100%" stopColor="#1a5fa8" />
        </radialGradient>
      </defs>
    </svg>
  );
}
