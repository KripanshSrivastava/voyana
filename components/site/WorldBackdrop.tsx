/**
 * Decorative illustrated world-landscape backdrop — used behind cinematic
 * sections (hero, mid-page banner, final CTA) whenever no real CMS photo has
 * been uploaded yet. Pure inline SVG: no network request, no layout shift,
 * negligible render cost. Purely visual chrome, not business data.
 */
export function WorldBackdrop({ className, id = "wb" }: { className?: string; id?: string }) {
  const sunId = `${id}-sun`;
  const skyId = `${id}-sky`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className ?? "absolute inset-0 h-full w-full"}
    >
      <defs>
        <radialGradient id={sunId} cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#fb9a3c" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#f97316" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#091428" />
          <stop offset="55%" stopColor="#0f1e38" />
          <stop offset="100%" stopColor="#135456" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${skyId})`} />
      <circle cx="800" cy="560" r="420" fill={`url(#${sunId})`} />

      {/* Stylized world-map dotted arc — evokes global travel, not a real map. */}
      <g fill="#72dcd4" opacity="0.35">
        {Array.from({ length: 46 }).map((_, i) => {
          const t = i / 45;
          const x = 80 + t * 1440;
          const y = 140 + Math.sin(t * Math.PI) * -70 + Math.sin(t * 9) * 10;
          return <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 3.2 : 1.6} />;
        })}
      </g>

      {/* Scattered stars, upper sky only. */}
      <g fill="#e2e8f2">
        {[
          [120, 90, 1.4], [260, 150, 1], [420, 70, 1.6], [610, 130, 1],
          [820, 60, 1.3], [980, 110, 1], [1150, 80, 1.5], [1320, 140, 1],
          [1460, 95, 1.3], [180, 220, 0.9], [980, 210, 0.9],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} opacity="0.55" />
        ))}
      </g>

      {/* Layered mountain skyline, back to front. */}
      <path d="M0 620 L140 500 L300 600 L470 460 L640 590 L820 480 L1000 610 L1180 470 L1360 600 L1600 520 L1600 900 L0 900 Z" fill="#26324b" opacity="0.55" />
      <path d="M0 700 L180 580 L360 680 L560 540 L760 690 L980 560 L1180 700 L1400 580 L1600 660 L1600 900 L0 900 Z" fill="#0f1e38" opacity="0.8" />
      <path d="M0 780 L220 680 L420 760 L660 640 L880 770 L1120 650 L1340 760 L1600 700 L1600 900 L0 900 Z" fill="#091428" />
    </svg>
  );
}
