"use client";

import { usePathname } from "next/navigation";

type BuildingProps = {
  x: number; y: number; w: number; h: number;
  cols: number; rows: number;
  fill?: string; windowFill?: string;
};

function Building({ x, y, w, h, cols, rows, fill = "#0a3260", windowFill = "#1c5587" }: BuildingProps) {
  const padX = 7, padTop = 14, padBottom = 10, winW = 5, winH = 8;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const gapX = cols > 1 ? (innerW - cols * winW) / (cols - 1) : 0;
  const gapY = rows > 1 ? (innerH - rows * winH) / (rows - 1) : 0;
  const windows: React.ReactElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + padX + c * (winW + gapX);
      const wy = y + padTop + r * (winH + gapY);
      const dim = (r * 7 + c * 3) % 5 === 0;
      windows.push(
        <rect key={`${x}-${y}-${r}-${c}`} x={wx} y={wy} width={winW} height={winH} fill={windowFill} opacity={dim ? 0.35 : 0.85} />
      );
    }
  }
  return <g><rect x={x} y={y} width={w} height={h} fill={fill} />{windows}</g>;
}

function LoginHeroSvg() {
  return (
    <svg viewBox="0 0 600 760" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c3a6c" />
          <stop offset="60%" stopColor="#082c54" />
          <stop offset="100%" stopColor="#06223f" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#082545" />
          <stop offset="100%" stopColor="#020c1a" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="760" fill="url(#bgGrad)" />
      <rect width="600" height="760" fill="url(#glow)" />
      <circle cx="78"  cy="55" r="1.5" fill="white" opacity="0.55" />
      <circle cx="170" cy="38" r="1.2" fill="white" opacity="0.45" />
      <circle cx="258" cy="76" r="1.4" fill="white" opacity="0.55" />
      <circle cx="378" cy="48" r="1.2" fill="white" opacity="0.45" />
      <circle cx="496" cy="65" r="1.5" fill="white" opacity="0.55" />
      <circle cx="536" cy="28" r="1.2" fill="white" opacity="0.45" />
      <circle cx="320" cy="42" r="1.1" fill="white" opacity="0.40" />
      <Building x={15}  y={440} w={55}  h={140} cols={3} rows={8}  fill="#082c54" windowFill="#1a4f7d" />
      <Building x={80}  y={365} w={65}  h={215} cols={4} rows={13} />
      <Building x={158} y={330} w={58}  h={250} cols={3} rows={15} fill="#082c54" windowFill="#1a4f7d" />
      <Building x={228} y={295} w={88}  h={285} cols={5} rows={17} />
      <rect x="249" y="278" width="24" height="18" fill="#0a3260" />
      <rect x="255" y="268" width="12" height="12" fill="#0a3260" />
      <rect x="260" y="260" width="2"  height="10" fill="#0a3260" />
      <Building x={327} y={375} w={55}  h={205} cols={3} rows={12} fill="#082c54" windowFill="#1a4f7d" />
      <Building x={393} y={330} w={75}  h={250} cols={5} rows={15} />
      <line x1="430" y1="330" x2="430" y2="298" stroke="#0a3260" strokeWidth="2" />
      <circle cx="430" cy="296" r="2.5" fill="#0a3260" />
      <Building x={479} y={385} w={58}  h={195} cols={3} rows={11} fill="#082c54" windowFill="#1a4f7d" />
      <Building x={547} y={358} w={53}  h={222} cols={3} rows={13} />
      <rect x="0" y="572" width="600" height="188" fill="url(#groundGrad)" />
      <rect x="0" y="570" width="600" height="4" fill="#020c18" opacity="0.6" />
      <ellipse cx="72"  cy="568" rx="88" ry="62" fill="#155c28" />
      <ellipse cx="126" cy="546" rx="68" ry="54" fill="#1a6e30" />
      <ellipse cx="42"  cy="552" rx="54" ry="44" fill="#1f7a3a" />
      <ellipse cx="98"  cy="530" rx="50" ry="40" fill="#228540" />
      <ellipse cx="70"  cy="538" rx="40" ry="34" fill="#279e4a" />
      <ellipse cx="528" cy="566" rx="90" ry="62" fill="#155c28" />
      <ellipse cx="474" cy="546" rx="70" ry="54" fill="#1a6e30" />
      <ellipse cx="560" cy="550" rx="56" ry="44" fill="#1f7a3a" />
      <ellipse cx="502" cy="528" rx="52" ry="40" fill="#228540" />
      <ellipse cx="530" cy="535" rx="42" ry="34" fill="#279e4a" />
      <g transform="translate(148 418)">
        <ellipse cx="152" cy="152" rx="158" ry="8" fill="#010810" opacity="0.5" />
        <circle cx="58"  cy="128" r="24" fill="#0f172a" />
        <circle cx="58"  cy="128" r="14" fill="#dde4ed" />
        <g stroke="#64748b" strokeWidth="1" strokeLinecap="round">
          <line x1="58"  y1="116" x2="58"  y2="140" />
          <line x1="46"  y1="128" x2="70"  y2="128" />
          <line x1="49"  y1="119" x2="67"  y2="137" />
          <line x1="49"  y1="137" x2="67"  y2="119" />
        </g>
        <circle cx="58"  cy="128" r="4.5" fill="#1f2937" />
        <circle cx="240" cy="128" r="24" fill="#0f172a" />
        <circle cx="240" cy="128" r="14" fill="#dde4ed" />
        <g stroke="#64748b" strokeWidth="1" strokeLinecap="round">
          <line x1="240" y1="116" x2="240" y2="140" />
          <line x1="228" y1="128" x2="252" y2="128" />
          <line x1="231" y1="119" x2="249" y2="137" />
          <line x1="231" y1="137" x2="249" y2="119" />
        </g>
        <circle cx="240" cy="128" r="4.5" fill="#1f2937" />
        <path d="M 8 126 L 8 22 Q 8 10 20 10 L 235 10 Q 248 10 254 18 L 278 54 Q 290 62 292 72 L 292 126 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
        <rect x="8" y="120" width="284" height="7" fill="#dce4ef" />
        <line x1="186" y1="10" x2="186" y2="118" stroke="#b0bcc8" strokeWidth="0.8" />
        <rect x="22"  y="3"  width="155" height="8" rx="2"   fill="#0a2440" opacity="0.88" />
        <rect x="183" y="4"  width="22"  height="6" rx="1.5" fill="#0a2440" opacity="0.88" />
        <rect x="34"  y="-4" width="22" height="7" rx="1.5" fill="#0a2440" />
        <rect x="72"  y="-4" width="14" height="7" rx="1"   fill="#0a2440" />
        <rect x="142" y="-3" width="28" height="6" rx="1.5" fill="#0a2440" />
        <text x="104" y="76" textAnchor="middle" fontFamily="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial" fontSize="30" fontWeight="900" fill="#0a2440" letterSpacing="-0.8">
          Local<tspan fill="#16a34a">Pro</tspan>
        </text>
        <rect x="30" y="84" width="148" height="3" rx="1.5" fill="#16a34a" opacity="0.45" />
        <path d="M 200 18 L 234 18 Q 248 18 255 26 L 275 52 L 200 52 Z" fill="#0a2440" opacity="0.82" />
        <path d="M 206 22 L 228 22 L 240 35 L 220 35 Z" fill="#ffffff" opacity="0.1" />
        <rect x="188" y="26" width="10" height="20" rx="2" fill="#0a2440" opacity="0.7" />
        <path d="M 260 65 L 290 65 Q 296 65 296 70 L 290 80 L 262 80 Q 260 80 260 77 Z" fill="#fde68a" />
        <path d="M 263 68 L 273 68 L 271 74 L 263 74 Z" fill="#ffffff" opacity="0.8" />
        <rect x="263" y="82" width="30" height="20" rx="3" fill="#1e293b" opacity="0.72" />
        <line x1="265" y1="87" x2="291" y2="87" stroke="#475569" strokeWidth="0.6" />
        <line x1="265" y1="92" x2="291" y2="92" stroke="#475569" strokeWidth="0.6" />
        <line x1="265" y1="97" x2="291" y2="97" stroke="#475569" strokeWidth="0.6" />
        <path d="M 285 44 L 298 42 L 300 50 L 287 52 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.5" />
        <line x1="22" y1="10" x2="22" y2="118" stroke="#b0bcc8" strokeWidth="0.5" />
        <rect x="146" y="74" width="16" height="3" rx="1.5" fill="#94a3b8" />
      </g>
    </svg>
  );
}

function RegisterHeroSvg() {
  return (
    <svg viewBox="0 0 600 760" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="regBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a8048" />
          <stop offset="100%" stopColor="#155c2a" />
        </linearGradient>
        <radialGradient id="regGlow" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#3da85c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3da85c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="760" fill="url(#regBg)" />
      <rect width="600" height="760" fill="url(#regGlow)" />
      <circle cx="80"  cy="120" r="90"  fill="#349e55" opacity="0.15" />
      <circle cx="520" cy="180" r="70"  fill="#349e55" opacity="0.12" />
      <circle cx="300" cy="80"  r="110" fill="#349e55" opacity="0.10" />
      <rect x="0" y="655" width="600" height="105" fill="#0f3d18" opacity="0.55" />

      {/* Left worker — male, cap, arms crossed */}
      <g transform="translate(62 368)">
        <rect x="16" y="16" width="78" height="14" rx="4" fill="#1e3a8a" />
        <ellipse cx="55" cy="16" rx="36" ry="9" fill="#2d4fa3" />
        <rect x="7" y="27" width="16" height="5" rx="2" fill="#1e3a8a" />
        <circle cx="55" cy="52" r="32" fill="#d4956c" />
        <ellipse cx="44" cy="48" rx="3.5" ry="3" fill="#1a0a00" />
        <ellipse cx="66" cy="48" rx="3.5" ry="3" fill="#1a0a00" />
        <path d="M 44 62 Q 55 70 66 62" stroke="#1a0a00" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="47" y="82" width="16" height="16" rx="4" fill="#d4956c" />
        <path d="M 55 96 L 41 112 L 55 108 L 69 112 Z" fill="#3d5fb3" />
        <rect x="18" y="96" width="74" height="130" rx="8" fill="#2d4fa3" />
        <rect x="2"  y="106" width="22" height="56" rx="10" fill="#2d4fa3" />
        <rect x="86" y="106" width="22" height="56" rx="10" fill="#2d4fa3" />
        <rect x="18" y="134" width="74" height="20" rx="8" fill="#3652b8" />
        <rect x="18" y="220" width="74" height="8" rx="2" fill="#0f172a" />
        <rect x="49" y="218" width="12" height="12" rx="1" fill="#c9a820" />
        <rect x="20" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <rect x="60" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <ellipse cx="35" cy="335" rx="20" ry="9" fill="#0f172a" />
        <ellipse cx="75" cy="335" rx="20" ry="9" fill="#0f172a" />
      </g>

      {/* Center worker — female, dark hair, clipboard */}
      <g transform="translate(222 346)">
        <ellipse cx="56" cy="48" rx="38" ry="42" fill="#2a1200" />
        <circle cx="56" cy="46" r="30" fill="#c8856a" />
        <rect x="21" y="22" width="17" height="50" rx="8" fill="#2a1200" />
        <rect x="74" y="22" width="17" height="50" rx="8" fill="#2a1200" />
        <rect x="22" y="68" width="13" height="60" rx="6" fill="#2a1200" />
        <rect x="77" y="68" width="13" height="60" rx="6" fill="#2a1200" />
        <ellipse cx="47" cy="42" rx="3" ry="3.5" fill="#1a0a00" />
        <ellipse cx="65" cy="42" rx="3" ry="3.5" fill="#1a0a00" />
        <path d="M 46 57 Q 56 65 66 57" stroke="#1a0a00" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="49" y="74" width="14" height="16" rx="3" fill="#c8856a" />
        <path d="M 56 90 L 42 106 L 56 102 L 70 106 Z" fill="#3d5fb3" />
        <rect x="18" y="90" width="76" height="135" rx="8" fill="#2d4fa3" />
        <rect x="2"  y="100" width="20" height="62" rx="10" fill="#2d4fa3" />
        <rect x="90" y="100" width="20" height="62" rx="10" fill="#2d4fa3" />
        <rect x="22" y="108" width="68" height="84" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="46" y="103" width="20" height="11" rx="4" fill="#94a3b8" />
        <line x1="30" y1="130" x2="82" y2="130" stroke="#e2e8f0" strokeWidth="2" />
        <line x1="30" y1="144" x2="82" y2="144" stroke="#e2e8f0" strokeWidth="2" />
        <line x1="30" y1="158" x2="76" y2="158" stroke="#e2e8f0" strokeWidth="2" />
        <line x1="30" y1="172" x2="73" y2="172" stroke="#e2e8f0" strokeWidth="2" />
        <rect x="18" y="220" width="76" height="8" rx="2" fill="#0f172a" />
        <rect x="50" y="218" width="12" height="12" rx="1" fill="#c9a820" />
        <rect x="20" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <rect x="62" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <ellipse cx="35" cy="335" rx="20" ry="9" fill="#0f172a" />
        <ellipse cx="77" cy="335" rx="20" ry="9" fill="#0f172a" />
      </g>

      {/* Right worker — male, hard hat, beard */}
      <g transform="translate(382 368)">
        <ellipse cx="55" cy="18" rx="46" ry="13" fill="#f5c518" />
        <rect x="14" y="12" width="82" height="18" rx="4" fill="#f5c518" />
        <rect x="9"  y="27" width="92" height="7" rx="2" fill="#e8b400" />
        <circle cx="55" cy="56" r="32" fill="#d4956c" />
        <path d="M 28 66 Q 55 92 82 66 Q 82 86 55 96 Q 28 86 28 66 Z" fill="#4a2810" />
        <ellipse cx="44" cy="50" rx="3.5" ry="3" fill="#1a0a00" />
        <ellipse cx="66" cy="50" rx="3.5" ry="3" fill="#1a0a00" />
        <path d="M 42 67 Q 55 75 68 67" stroke="#4a2810" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="47" y="86" width="16" height="14" rx="4" fill="#d4956c" />
        <path d="M 55 98 L 41 114 L 55 110 L 69 114 Z" fill="#3d5fb3" />
        <rect x="18" y="98" width="74" height="128" rx="8" fill="#2d4fa3" />
        <rect x="40" y="98" width="30" height="128" fill="#f5c518" opacity="0.38" />
        <rect x="2"  y="108" width="22" height="56" rx="10" fill="#2d4fa3" />
        <rect x="86" y="108" width="22" height="56" rx="10" fill="#2d4fa3" />
        <rect x="18" y="136" width="74" height="20" rx="8" fill="#3652b8" />
        <rect x="18" y="220" width="74" height="8" rx="2" fill="#0f172a" />
        <rect x="49" y="218" width="12" height="12" rx="1" fill="#c9a820" />
        <rect x="20" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <rect x="60" y="226" width="30" height="108" rx="6" fill="#1e3a8a" />
        <ellipse cx="35" cy="335" rx="20" ry="9" fill="#0f172a" />
        <ellipse cx="75" cy="335" rx="20" ry="9" fill="#0f172a" />
      </g>
    </svg>
  );
}

function LoginPanelContent() {
  return (
    <div className="relative z-10 flex w-full flex-col items-center px-10 pt-20 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/40">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-9 w-9">
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="m8.5 12 2.4 2.4L16 9" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold leading-snug tracking-tight sm:text-[2rem]">
        Trusted. Verified.
        <br />
        Local Professionals.
      </h2>
      <p className="mt-3 max-w-sm text-base text-slate-200">
        Quality pros you can count on,
        <br />
        for every job, every time.
      </p>
    </div>
  );
}

function RegisterPanelContent() {
  const perks = ["Get verified", "Get discovered", "Grow your business", "Earn more"];
  return (
    <div className="relative z-10 flex w-full flex-col items-center px-10 pt-14 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
        <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden>
          <circle cx="24" cy="20" r="10" stroke="white" strokeWidth="2.2" />
          <path d="M9 42c0-8.3 6.7-15 15-15s15 6.7 15 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="35" cy="10" r="7" fill="#f5c518" stroke="white" strokeWidth="1.5" />
          <path d="M32.5 10 L34.5 12 L38 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-[1.75rem] font-extrabold leading-snug tracking-tight">
        Start your journey
        <br />
        with LocalPro
      </h2>
      <ul className="mt-6 w-full max-w-[220px] space-y-3 text-left">
        {perks.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-white/10">
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                <path d="M2 6 L4.5 8.5 L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[0.95rem] font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AuthRightPanel() {
  const pathname = usePathname();
  const isRegister = pathname.startsWith("/register");

  return (
    <aside className="relative hidden flex-1 overflow-hidden text-white lg:flex">
      {isRegister ? <RegisterHeroSvg /> : <LoginHeroSvg />}
      {isRegister ? <RegisterPanelContent /> : <LoginPanelContent />}
    </aside>
  );
}
