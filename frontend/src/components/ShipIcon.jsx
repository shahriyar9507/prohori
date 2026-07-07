// Vessel silhouette illustrations by category — clean, free, offline (no photo
// API needed). Rendered large in the contact profile as the "ship image".
export default function ShipIcon({ category = 'generic', color = '#38bdf8' }) {
  const shapes = {
    // Fishing trawler: hull, wheelhouse, A-frame net gantry
    fishing: (
      <>
        <path d="M14 44 H126 L112 60 H30 Z" />
        <rect x="48" y="28" width="24" height="16" rx="2" />
        <path d="M60 28 V12 M60 14 H86 L78 24 H60" fill="none" strokeWidth="3" stroke={color} />
        <path d="M96 44 V22 L112 44 Z" opacity="0.7" />
      </>
    ),
    // Cargo / container ship: long hull, container stacks, bridge aft
    cargo: (
      <>
        <path d="M8 40 H132 L116 58 H24 Z" />
        <rect x="22" y="26" width="12" height="14" rx="1" />
        <rect x="36" y="22" width="12" height="18" rx="1" />
        <rect x="50" y="26" width="12" height="14" rx="1" />
        <rect x="64" y="24" width="12" height="16" rx="1" />
        <rect x="98" y="18" width="18" height="22" rx="2" />
        <rect x="104" y="10" width="6" height="10" rx="1" />
      </>
    ),
    // Coast Guard patrol cutter: sleek hull, angled superstructure, mast
    patrol: (
      <>
        <path d="M10 42 H130 L110 56 H84 L80 42 Z" />
        <path d="M40 42 L52 24 H74 L84 42 Z" />
        <path d="M60 24 V10 M60 12 H78" fill="none" strokeWidth="3" stroke={color} />
        <rect x="16" y="38" width="22" height="5" rx="2" opacity="0.7" />
      </>
    ),
    // Dark contact: generic hull with an alert glyph
    dark: (
      <>
        <path d="M14 44 H126 L112 60 H30 Z" opacity="0.85" />
        <rect x="52" y="30" width="22" height="14" rx="2" opacity="0.85" />
        <text x="70" y="26" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>!</text>
      </>
    ),
    // STS: two small vessels alongside
    sts: (
      <>
        <path d="M8 40 H62 L52 52 H18 Z" />
        <rect x="26" y="30" width="14" height="10" rx="2" />
        <path d="M78 44 H132 L122 56 H88 Z" />
        <rect x="96" y="34" width="14" height="10" rx="2" />
      </>
    ),
    generic: (
      <>
        <path d="M14 44 H126 L112 60 H30 Z" />
        <rect x="50" y="30" width="26" height="14" rx="2" />
        <path d="M63 30 V16" fill="none" strokeWidth="3" stroke={color} />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 140 72" className="ship-svg" role="img" aria-label={`${category} vessel`}>
      <defs>
        <linearGradient id="shipg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g fill="url(#shipg)">{shapes[category] || shapes.generic}</g>
      <path d="M4 63 H136" stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 5" />
    </svg>
  )
}
