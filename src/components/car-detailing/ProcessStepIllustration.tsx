interface ProcessIllustrationProps {
  variant: "wash-day" | "wash-package" | "ready-for-techs" | "clean-car";
}

function CarSvg({ clean = false, dirty = false }: { clean?: boolean; dirty?: boolean }) {
  const bodyFill = clean ? "#FCD34D" : dirty ? "#CA8A04" : "#FBBF24";
  return (
    <g transform="translate(40, 28)">
      <ellipse cx="60" cy="72" rx="52" ry="8" fill="#E5E7EB" opacity={0.8} />
      <path
        d="M12 48 L22 32 H42 L52 24 H88 L98 32 H118 L128 48 V58 H12 Z"
        fill={bodyFill}
        stroke="#1F2937"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M44 24 L52 32 H88 L96 24" fill="#93C5FD" stroke="#1F2937" strokeWidth="1" />
      <circle cx="32" cy="58" r="10" fill="#374151" />
      <circle cx="32" cy="58" r="5" fill="#9CA3AF" />
      <circle cx="108" cy="58" r="10" fill="#374151" />
      <circle cx="108" cy="58" r="5" fill="#9CA3AF" />
      {dirty && (
        <>
          <circle cx="70" cy="40" r="4" fill="#78350F" opacity="0.5" />
          <circle cx="55" cy="50" r="3" fill="#78350F" opacity="0.4" />
          <circle cx="90" cy="45" r="3.5" fill="#78350F" opacity="0.45" />
        </>
      )}
      {clean && (
        <>
          <path d="M8 20 L12 16 M120 18 L124 14 M64 8 L64 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="20" r="2" fill="#F59E0B" />
          <circle cx="124" cy="14" r="2" fill="#F59E0B" />
        </>
      )}
    </g>
  );
}

export default function ProcessStepIllustration({ variant }: ProcessIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      className="mx-auto h-32 w-full max-w-[200px] sm:h-36"
      aria-hidden
    >
      {variant === "wash-day" && (
        <>
          <CarSvg dirty />
          <circle cx="36" cy="36" r="14" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
          <path d="M30 36 H42 M36 30 V42" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="148" y="52" width="28" height="36" rx="4" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.5" />
          <circle cx="162" cy="64" r="6" fill="#BFDBFE" />
          <path d="M156 78 H168" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M118 32 Q130 24 142 32"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="130" cy="26" r="3" fill="#93C5FD" />
        </>
      )}

      {variant === "wash-package" && (
        <>
          <ellipse cx="100" cy="88" rx="56" ry="10" fill="#E5E7EB" />
          <CarSvg dirty />
          <rect x="148" y="20" width="36" height="44" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <path d="M154 30 H178 M154 38 H174 M154 46 H176 M154 54 H170" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {variant === "ready-for-techs" && (
        <>
          <rect x="20" y="16" width="100" height="72" rx="4" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 2" />
          <CarSvg />
          <rect x="36" y="52" width="24" height="28" rx="4" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.5" />
          <circle cx="48" cy="62" r="5" fill="#BFDBFE" />
          <rect x="128" y="64" width="32" height="20" rx="3" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
          <ellipse cx="144" cy="72" rx="6" ry="4" fill="#FECACA" />
          <rect x="128" y="48" width="14" height="18" rx="2" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1" />
        </>
      )}

      {variant === "clean-car" && (
        <>
          <ellipse cx="100" cy="88" rx="56" ry="10" fill="#E5E7EB" />
          <CarSvg clean />
        </>
      )}
    </svg>
  );
}
