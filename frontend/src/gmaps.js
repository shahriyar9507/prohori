// Lightweight Google Maps JS API loader (no extra dependency).
let promise = null
export function loadGoogleMaps(key) {
  if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve(window.google)
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    if (!key) { reject(new Error('missing maps key')); return }
    // Google fires this callback only once google.maps is fully initialised.
    window.__prahariGmapsReady = () => resolve(window.google)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&loading=async&callback=__prahariGmapsReady`
    s.async = true
    s.onerror = () => reject(new Error('maps script failed'))
    document.head.appendChild(s)
  })
  return promise
}

// Compact dark "night" style for the roadmap base.
export const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1626' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ea0c4' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#22314f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2740' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070f1f' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
]
