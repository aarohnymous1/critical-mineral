import { useEffect, useRef } from 'react'
import maplibregl, { type LayerSpecification, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Shared map foundation for the chain map and Earth Watch.
// MapLibre GL (the open-source Mapbox GL fork) over the CARTO Positron
// basemap — light, calm, no API key, matches the Credibl canvas.
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export interface MapViewProps {
  height?: number | string
  bounds: [[number, number], [number, number]]
  sources: Record<string, GeoJSON.FeatureCollection>
  layers: LayerSpecification[]
  /** Layer ids that respond to click / hover. */
  interactive?: string[]
  onFeatureClick?: (layerId: string, props: Record<string, unknown>) => void
  hoverHtml?: (layerId: string, props: Record<string, unknown>) => string | null
}

export function MapView({ height = 480, bounds, sources, layers, interactive = [], onFeatureClick, hoverHtml }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false)
  const addedLayersRef = useRef<string[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)

  // Latest props via refs so the once-bound handlers never go stale.
  const stateRef = useRef({ sources, layers, interactive, onFeatureClick, hoverHtml })
  stateRef.current = { sources, layers, interactive, onFeatureClick, hoverHtml }

  const sync = () => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const { sources: srcs, layers: lyrs } = stateRef.current
    Object.entries(srcs).forEach(([id, data]) => {
      const existing = map.getSource(id) as GeoJSONSource | undefined
      if (existing) existing.setData(data)
      else map.addSource(id, { type: 'geojson', data })
    })
    addedLayersRef.current.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id)
    })
    addedLayersRef.current = []
    lyrs.forEach((layer) => {
      map.addLayer(layer)
      addedLayersRef.current.push(layer.id)
    })
  }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      bounds,
      fitBoundsOptions: { padding: 40 },
      cooperativeGestures: true,
      attributionControl: { compact: true },
    })
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    // debug handle for automated verification
    ;(window as unknown as Record<string, unknown>).__credMap = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '300px' })

    map.on('error', (e) => console.warn('[MapView] map error:', e.error?.message ?? e))
    // 'style.load' fires as soon as the style JSON is parsed — sources and layers
    // can attach immediately, without waiting for every basemap tile and glyph
    // ('load' can hang for many seconds on slow tile pipelines).
    map.on('style.load', () => {
      readyRef.current = true
      try {
        sync()
      } catch (err) {
        console.warn('[MapView] layer sync failed:', (err as Error).message)
      }
    })

    const query = (point: maplibregl.PointLike) => {
      const ids = stateRef.current.interactive.filter((id) => map.getLayer(id))
      if (!ids.length) return []
      return map.queryRenderedFeatures(point, { layers: ids })
    }

    map.on('click', (e) => {
      const f = query(e.point)[0]
      if (f && stateRef.current.onFeatureClick) stateRef.current.onFeatureClick(f.layer.id, f.properties ?? {})
    })

    map.on('mousemove', (e) => {
      const f = query(e.point)[0]
      map.getCanvas().style.cursor = f ? 'pointer' : ''
      const popup = popupRef.current
      if (!popup) return
      const html = f && stateRef.current.hoverHtml ? stateRef.current.hoverHtml(f.layer.id, f.properties ?? {}) : null
      if (html) popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
      else popup.remove()
    })
    map.on('mouseout', () => popupRef.current?.remove())

    return () => {
      readyRef.current = false
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      addedLayersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync whenever data or layer definitions change.
  useEffect(() => {
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, layers])

  return <div ref={containerRef} style={{ height, width: '100%' }} className="overflow-hidden rounded-lg" />
}
