// Equipment silhouettes for RAKKHOK assets — a small library of recognizable
// military-platform icons, picked by matching the asset's type string. Pure
// inline SVG (no external images) so it renders offline and themes with CSS.

const P = { fill: 'currentColor', stroke: 'none' }

const ICONS = {
  jet: (
    <path {...P} d="M31 4c1.3 0 2 1.8 2.2 4.2l.6 12.4 22 12v4l-22-5.5.4 12 7 5v3l-9-2.3-1.2 6.6c-.1.6-.5 1.1-1 1.1s-.9-.5-1-1.1L27.8 51 18.8 53v-3l7-5 .4-12L4 38.6v-4l22-12 .6-12.4C26.9 5.8 27.6 4 31 4z" />
  ),
  helicopter: (
    <>
      <rect {...P} x="6" y="14" width="52" height="3" rx="1.5" />
      <rect {...P} x="30" y="8" width="3" height="10" rx="1" />
      <path {...P} d="M20 30c0-4 4-7 12-7s16 3 20 8l6 1c1 .2 1.6 1 1.6 2s-.8 1.8-1.8 1.9L44 37l-2 6c-.5 1.5-2 2.5-3.6 2.5H22c-3 0-5-2-5-5v-4c0-3 1.5-5 3-6z" />
      <rect {...P} x="30" y="44" width="3" height="8" rx="1" />
      <rect {...P} x="20" y="51" width="24" height="3" rx="1.5" />
      <path {...P} d="M17 33 L2 31 C1 30.9 1 33 2 33z" />
    </>
  ),
  ship: (
    <>
      <path {...P} d="M6 40h52l-6 12c-.7 1.4-2.1 2.3-3.7 2.3H15.7c-1.6 0-3-.9-3.7-2.3z" />
      <path {...P} d="M12 38V26c0-1.1.9-2 2-2h22c1 0 1.9.5 2.5 1.3L46 36c.6.9 1.6 1.4 2.7 1.4H54v2.6z" />
      <rect {...P} x="18" y="12" width="4" height="12" rx="1" />
      <rect {...P} x="26" y="16" width="10" height="9" rx="1.5" />
    </>
  ),
  patrol: (
    <>
      <path {...P} d="M8 38h48l-5.5 10c-.7 1.3-2 2.1-3.5 2.1H17c-1.5 0-2.8-.8-3.5-2.1z" />
      <path {...P} d="M16 36V28c0-1.1.9-2 2-2h16c.8 0 1.5.3 2 .9L44 34c.5.6 1.3 1 2.1 1H52v1z" />
      <rect {...P} x="22" y="18" width="9" height="8" rx="1.5" />
      <rect {...P} x="25" y="10" width="3" height="9" rx="1" />
    </>
  ),
  submarine: (
    <>
      <path {...P} d="M8 32c0-5 10-9 24-9s24 4 24 9-10 9-24 9S8 37 8 32z" />
      <rect {...P} x="28" y="14" width="8" height="10" rx="2" />
      <rect {...P} x="31" y="8" width="2.5" height="8" rx="1" />
      <path {...P} d="M56 32c3 0 5 1.5 6 4h-6zM56 32c3 0 5-1.5 6-4h-6z" />
    </>
  ),
  radar: (
    <>
      <path {...P} d="M32 40c-9 0-16-9-16-20 0-3 .8-5.8 2.2-8C20.5 15.7 26 22 26 30c0 3.3-.9 6.3-2.4 8.6C25.9 39.5 28.8 40 32 40z" transform="rotate(20 32 30)" />
      <rect {...P} x="30" y="38" width="4" height="12" />
      <rect {...P} x="22" y="50" width="20" height="4" rx="1.5" />
    </>
  ),
  vehicle: (
    <>
      <path {...P} d="M8 34c0-1.1.9-2 2-2h30l10 6h4c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2z" />
      <path {...P} d="M14 24h16l6 8H14z" />
      <circle {...P} cx="18" cy="48" r="6" />
      <circle {...P} cx="46" cy="48" r="6" />
    </>
  ),
  air_defense: (
    <>
      <rect {...P} x="10" y="40" width="44" height="8" rx="2" />
      <circle {...P} cx="20" cy="52" r="5" />
      <circle {...P} cx="44" cy="52" r="5" />
      <rect {...P} x="24" y="30" width="16" height="12" rx="2" />
      <rect {...P} x="30" y="8" width="4" height="24" rx="1.5" transform="rotate(28 32 20)" />
      <rect {...P} x="36" y="8" width="4" height="24" rx="1.5" transform="rotate(28 38 20)" />
    </>
  ),
  uav: (
    <>
      <path {...P} d="M31 12c1 0 1.6 1 1.7 2.6l.5 9L58 27v3l-24.8-2 .3 12 5 4v2l-7-1.6-.5 3c-.1.6-.5 1-1 1s-.9-.4-1-1l-.5-3-7 1.6v-2l5-4 .3-12L8 30v-3l24.8-3.4.5-9C29.4 13 30 12 31 12z" />
    </>
  ),
  generator: (
    <>
      <rect {...P} x="7" y="24" width="30" height="22" rx="4" />
      <rect {...P} x="38" y="28" width="17" height="18" rx="3" />
      <rect {...P} x="21" y="17" width="9" height="7" rx="1.5" />
      <rect {...P} x="12" y="11" width="3.4" height="13" rx="1.7" />
      <circle {...P} cx="16" cy="50" r="3.6" />
      <circle {...P} cx="46" cy="50" r="3.6" />
    </>
  ),
}

// Map an asset's type string to the closest silhouette — ordered so specific
// models win over generic words (e.g. "missile boat" = a vessel, not a SAM).
export function iconKeyFor(type = '') {
  const s = type.toLowerCase()
  if (/(uav|drone|unmanned)/.test(s)) return 'uav'
  if (/(generator|genset|power unit|power pack|powerpack)/.test(s)) return 'generator'
  if (/(missile boat|fast attack|\bfac\b|gun boat|gunboat)/.test(s)) return 'patrol'
  if (/(sam|surface.to.air|air.?defen|s-300|s-400|missile system|missile battery)/.test(s)) return 'air_defense'
  if (/(helicopter|heli|rotor)/.test(s)) return 'helicopter'
  if (/(mpa|maritime patrol aircraft|fighter|\bjet\b|f-\d|mig|combat aircraft|interceptor|aircraft|transport|plane)/.test(s)) return 'jet'
  if (/(frigate|corvette|destroyer|warship|naval ship)/.test(s)) return 'ship'
  if (/(opv|offshore patrol|ipv|inshore patrol|patrol boat|patrol vessel|\bfpb\b|boat|cutter|craft)/.test(s)) return 'patrol'
  if (/(submarine|\bsub\b)/.test(s)) return 'submarine'
  if (/(radar|sensor|surveillance)/.test(s)) return 'radar'
  if (/(tank|\bapc\b|armou?r|vehicle|artillery|truck|carrier|\btrk\b)/.test(s)) return 'vehicle'
  if (/(ship|vessel)/.test(s)) return 'ship'
  return 'radar'
}

export default function EquipmentIcon({ type, size = 64, className = '' }) {
  const key = iconKeyFor(type)
  return (
    <svg className={`equip-icon ${className}`} width={size} height={size} viewBox="0 0 64 64"
      role="img" aria-label={type || 'equipment'}>
      {ICONS[key]}
    </svg>
  )
}
