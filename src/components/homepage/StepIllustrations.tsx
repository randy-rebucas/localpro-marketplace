/**
 * Custom SVG illustrations for the "How It Works" steps.
 * Each illustration is a small, clean scene that matches the step's purpose.
 */

export function PostJobIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Clipboard */}
      <rect x="25" y="15" width="70" height="90" rx="8" fill="white" stroke="#1a5fa8" strokeWidth="2.5" />
      <rect x="40" y="8" width="40" height="14" rx="7" fill="#1a5fa8" opacity="0.15" stroke="#1a5fa8" strokeWidth="2" />
      {/* Lines on clipboard */}
      <rect x="38" y="38" width="44" height="5" rx="2.5" fill="#1a5fa8" opacity="0.12" />
      <rect x="38" y="50" width="36" height="5" rx="2.5" fill="#1a5fa8" opacity="0.08" />
      <rect x="38" y="62" width="40" height="5" rx="2.5" fill="#1a5fa8" opacity="0.08" />
      {/* Checkmark */}
      <circle cx="38" cy="80" r="8" fill="#3ea53e" opacity="0.15" />
      <path d="M34 80 L37 83 L43 76" stroke="#3ea53e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pencil */}
      <g transform="translate(78, 70) rotate(30)">
        <rect x="0" y="0" width="6" height="30" rx="1" fill="#f59e0b" />
        <polygon points="0,30 6,30 3,38" fill="#fcd9b6" />
        <rect x="0" y="0" width="6" height="6" rx="1" fill="#e8a87c" />
      </g>
    </svg>
  );
}

export function GetQuotesIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Chat bubbles */}
      <rect x="10" y="25" width="60" height="40" rx="12" fill="#1a5fa8" opacity="0.1" stroke="#1a5fa8" strokeWidth="2" />
      <polygon points="30,65 25,78 42,65" fill="#1a5fa8" opacity="0.1" stroke="#1a5fa8" strokeWidth="2" strokeLinejoin="round" />
      {/* Lines in first bubble */}
      <rect x="22" y="37" width="36" height="4" rx="2" fill="#1a5fa8" opacity="0.2" />
      <rect x="22" y="46" width="28" height="4" rx="2" fill="#1a5fa8" opacity="0.15" />

      {/* Second bubble (reply) */}
      <rect x="50" y="55" width="60" height="40" rx="12" fill="#3ea53e" opacity="0.1" stroke="#3ea53e" strokeWidth="2" />
      <polygon points="90,95 95,108 78,95" fill="#3ea53e" opacity="0.1" stroke="#3ea53e" strokeWidth="2" strokeLinejoin="round" />
      {/* Peso sign in reply */}
      <text x="68" y="80" fontSize="18" fontWeight="700" fill="#3ea53e" opacity="0.5" fontFamily="system-ui">&#x20B1;</text>

      {/* Stars above */}
      <g transform="translate(75, 15)" opacity="0.5">
        <polygon points="6,0 7.5,4 12,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 0,4.5 4.5,4" fill="#f59e0b" />
      </g>
      <g transform="translate(90, 20)" opacity="0.35">
        <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" fill="#f59e0b" />
      </g>

      {/* Verified check */}
      <circle cx="18" cy="18" r="10" fill="#1a5fa8" opacity="0.12" />
      <path d="M14 18 L17 21 L23 15" stroke="#1a5fa8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaySafelyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Shield */}
      <path d="M60 10 L100 28 L100 60 Q100 95 60 112 Q20 95 20 60 L20 28Z" fill="#1a5fa8" opacity="0.06" stroke="#1a5fa8" strokeWidth="2.5" />
      {/* Inner shield */}
      <path d="M60 22 L90 36 L90 58 Q90 86 60 100 Q30 86 30 58 L30 36Z" fill="#1a5fa8" opacity="0.04" />

      {/* Lock body */}
      <rect x="44" y="55" width="32" height="26" rx="4" fill="#1a5fa8" opacity="0.15" stroke="#1a5fa8" strokeWidth="2" />
      {/* Lock shackle */}
      <path d="M48 55 L48 45 Q48 35 60 35 Q72 35 72 45 L72 55" stroke="#1a5fa8" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Keyhole */}
      <circle cx="60" cy="65" r="4" fill="#1a5fa8" opacity="0.4" />
      <rect x="58.5" y="66" width="3" height="8" rx="1.5" fill="#1a5fa8" opacity="0.4" />

      {/* Checkmark */}
      <circle cx="85" cy="85" r="12" fill="#3ea53e" opacity="0.15" stroke="#3ea53e" strokeWidth="2" />
      <path d="M80 85 L84 89 L92 80" stroke="#3ea53e" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Peso coins */}
      <g transform="translate(20, 85)" opacity="0.3">
        <circle cx="10" cy="10" r="10" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
        <text x="5.5" y="15" fontSize="12" fontWeight="700" fill="#92400e" fontFamily="system-ui">&#x20B1;</text>
      </g>
    </svg>
  );
}
