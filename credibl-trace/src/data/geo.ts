// ---------------------------------------------------------------------------
// Geography for the evidence graph.
//
// Nodes carry tier-lane coordinates (x/y) for the logical chain layout; this
// module gives every entity its real place on Earth. [lon, lat] order —
// the GeoJSON convention MapLibre expects.
// ---------------------------------------------------------------------------

export const NODE_COORDS: Record<string, [number, number]> = {
  'n-own-pune': [73.86, 18.52], // Pune, IN
  'n-hanjin': [127.43, 36.72], // Ochang, KR
  'n-kepler': [12.1, 49.01], // Regensburg, DE
  'n-sundram': [76.97, 11.02], // Coimbatore, IN
  'n-zhejiang': [118.87, 28.97], // Quzhou, Zhejiang, CN
  'n-tianyuan': [118.05, 36.8], // Zibo, Shandong, CN
  'n-foil': [120.98, 31.39], // Kunshan, CN
  'n-ningbo': [121.54, 29.87], // Ningbo, CN
  'n-kwangyang': [127.7, 34.94], // Gwangyang, KR
  'n-heilongjiang': [130.97, 45.3], // Jixi, Heilongjiang, CN
  'n-bangka': [106.11, -2.13], // Pangkalpinang, Bangka, ID
  'n-ulba': [82.61, 49.95], // Ust-Kamenogorsk, KZ
  'n-yunnan': [102.83, 24.88], // Kunming, CN
  'n-baotou': [109.84, 40.66], // Baotou, CN
  'n-huaxin': [118.75, 28.94], // Quzhou, CN
  'n-kolwezi': [25.47, -10.72], // Kolwezi, CD
  'n-jiangxi': [114.38, 27.8], // Yichun, Jiangxi, CN
  'n-sulawesi': [121.93, -2.64], // Morowali, ID
  'n-guizhou': [106.63, 26.65], // Guiyang, CN
  'n-mufulira-smelter': [28.24, -12.55], // Mufulira, ZM
  'n-meridian': [8.52, 47.17], // Zug, CH
  'n-revolt': [11.62, 52.13], // Magdeburg, DE
  'n-lualaba': [25.2, -10.6], // Lualaba, CD
  'n-kasulo': [25.5, -10.66], // Kolwezi district, CD
  'n-kalgoorlie': [121.47, -30.75], // Kalgoorlie, AU
  'n-sorowako': [121.33, -2.53], // Sorowako, ID
  'n-cabodelgado': [38.57, -13.35], // Balama, MZ
  'n-mufulira-mine': [28.26, -12.57], // Mufulira, ZM
  'n-wastate': [98.85, 22.34], // Wa State, MM
  'n-bayanobo': [109.97, 41.77], // Bayan Obo, CN
}

/** Bounds that frame the whole chain (Europe → Australia), [[W,S],[E,N]]. */
export const CHAIN_BOUNDS: [[number, number], [number, number]] = [
  [2, -36],
  [138, 56],
]

const R = 6371 // km

export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/**
 * A curved arc between two points — quadratic bezier bowed perpendicular to
 * the midpoint. Good enough visually at continental scale; none of our routes
 * cross the antimeridian.
 */
export function arc(from: [number, number], to: [number, number], steps = 42, curvature = 0.18): [number, number][] {
  const [x1, y1] = from
  const [x2, y2] = to
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  // control point offset perpendicular to the segment
  const cx = mx - dy * curvature
  const cy = my + dx * curvature
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a1 = (1 - t) ** 2
    const a2 = 2 * (1 - t) * t
    const a3 = t ** 2
    pts.push([a1 * x1 + a2 * cx + a3 * x2, a1 * y1 + a2 * cy + a3 * y2])
  }
  return pts
}

/** A circle polygon of the given radius in km around a centre point. */
export function circlePoly(center: [number, number], radiusKm: number, steps = 64): [number, number][] {
  const [lon, lat] = center
  const latR = (lat * Math.PI) / 180
  const dLat = radiusKm / 110.574
  const dLon = radiusKm / (111.32 * Math.cos(latR))
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    pts.push([lon + dLon * Math.cos(t), lat + dLat * Math.sin(t)])
  }
  return pts
}
