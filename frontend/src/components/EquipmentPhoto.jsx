import { useEffect, useState } from 'react'
import EquipmentIcon, { iconKeyFor } from './EquipmentIcon.jsx'
import { equipImage } from '../equipmentImages.js'

// Real class photo when available, silhouette otherwise (loading or offline).
export default function EquipmentPhoto({ type, size = 64, radius = 12 }) {
  const key = iconKeyFor(type)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    equipImage(key).then((u) => alive && setUrl(u))
    return () => { alive = false }
  }, [key])

  if (url) {
    return <img className="equip-photo" src={url} alt={type} loading="lazy"
      onError={() => setUrl(null)} style={{ width: size, height: size, borderRadius: radius }} />
  }
  return <EquipmentIcon type={type} size={Math.round(size * 0.6)} />
}
