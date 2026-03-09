import { useCallback, useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script-khush'
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
const DEFAULT_ZOOM = 5
// India bounds (south, west, north, east)
const INDIA_BOUNDS = { south: 8, west: 68, north: 35, east: 97 }

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window undefined'))
      return
    }
    if (window.google?.maps) {
      resolve(window.google.maps)
      return
    }
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check)
          resolve(window.google.maps)
        }
      }, 100)
      return
    }
    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google?.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

export default function GoogleMapPicker({ initialCenter, center: controlledCenter, initialZoom = 13, onSelect, height = 240 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)

  const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY

  const centerFromProps = controlledCenter ?? initialCenter
  const initialPos =
    centerFromProps && centerFromProps.lat != null && centerFromProps.lng != null
      ? { lat: Number(centerFromProps.lat), lng: Number(centerFromProps.lng) }
      : null

  const [position, setPosition] = useState(initialPos)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Load script and init map
  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key not set (VITE_GOOGLE_MAPS_API_KEY)')
      return
    }
    setError(null)
    loadGoogleMapsScript(apiKey)
      .then((maps) => {
        setLoaded(true)
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load Google Maps')
      })
  }, [apiKey])

  // Create map when loaded and container ready
  useEffect(() => {
    if (!loaded || !window.google?.maps || !containerRef.current || mapRef.current) return

    const maps = window.google.maps
    const center = position || DEFAULT_CENTER
    const map = new maps.Map(containerRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: initialZoom,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      restriction: {
        latLngBounds: { north: INDIA_BOUNDS.north, south: INDIA_BOUNDS.south, east: INDIA_BOUNDS.east, west: INDIA_BOUNDS.west },
        strictBounds: true,
      },
    })

    let marker = null
    const listener = maps.event.addListener(map, 'click', (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      setPosition({ lat, lng })
      if (marker) marker.setMap(null)
      marker = new maps.Marker({ position: { lat, lng }, map })
      markerRef.current = marker
      onSelectRef.current?.(lat, lng)
    })

    if (position) {
      marker = new maps.Marker({ position: { lat: position.lat, lng: position.lng }, map })
      markerRef.current = marker
    }

    mapRef.current = map
    return () => {
      maps.event.removeListener(listener)
      if (markerRef.current) markerRef.current.setMap(null)
      mapRef.current = null
      markerRef.current = null
    }
  }, [loaded, initialZoom])

  // Sync map and marker when controlled center changes
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    if (controlledCenter && controlledCenter.lat != null && controlledCenter.lng != null) {
      const lat = Number(controlledCenter.lat)
      const lng = Number(controlledCenter.lng)
      setPosition({ lat, lng })
      mapRef.current.setCenter({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
      })
    }
  }, [controlledCenter?.lat, controlledCenter?.lng])

  if (error) {
    return (
      <div
        className="rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-500 text-sm"
        style={{ height: `${height}px` }}
      >
        {error}
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div
        className="rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-500 text-sm"
        style={{ height: `${height}px` }}
      >
        Add VITE_GOOGLE_MAPS_API_KEY to .env to show map
      </div>
    )
  }

  if (!loaded) {
    return (
      <div
        className="rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-500 text-sm"
        style={{ height: `${height}px` }}
      >
        Loading map…
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden border border-gray-200"
      style={{ height: `${height}px` }}
      ref={containerRef}
      aria-label="Map to pick delivery location"
    />
  )
}
