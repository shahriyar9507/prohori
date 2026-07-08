// Real equipment photography for RAKKHOK. The asset *designations* are synthetic
// (real fleet data is classified), so each maps to its real-world platform CLASS
// and we pull a genuine photo of that class from Wikipedia's REST API (CORS-
// enabled, freely licensed). Anything that fails falls back to the silhouette.
const ARTICLE = {
  ship: 'Corvette',                 // modern surface combatant
  patrol: 'Patrol boat',
  submarine: 'Attack submarine',
  jet: 'Maritime patrol aircraft',
  helicopter: 'Military helicopter',
  radar: 'Radar',
  air_defense: 'S-400 missile system',
  vehicle: 'BTR-80',                // operated by the Bangladesh Army
  generator: 'Engine-generator',
  uav: 'Bayraktar TB2',             // operated by Bangladesh
}

const _cache = {}  // iconKey → Promise<url|null>

export function equipImage(key) {
  if (key in _cache) return _cache[key]
  const title = ARTICLE[key]
  if (!title) return (_cache[key] = Promise.resolve(null))
  _cache[key] = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j?.thumbnail?.source || j?.originalimage?.source || null)
    .catch(() => null)
  return _cache[key]
}
