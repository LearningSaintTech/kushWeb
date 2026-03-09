import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// India: default center and bounds (restrict pan to India only)
const DEFAULT_CENTER = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5
const INDIA_BOUNDS = [
  [8.0, 68.0],
  [35.0, 97.0],
]

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function CenterUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, map.getZoom())
  }, [map, center])
  return null
}

const markerIcon = L.divIcon({
  className: 'custom-marker',
  html: `<span style="
    display: block;
    width: 24px;
    height: 24px;
    background: #000;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function MapPicker({ initialCenter, center: controlledCenter, initialZoom = 13, onSelect, height = 240 }) {
  const centerFromProps = controlledCenter ?? initialCenter
  const initialPos =
    centerFromProps && centerFromProps.lat != null && centerFromProps.lng != null
      ? [centerFromProps.lat, centerFromProps.lng]
      : null

  const [position, setPosition] = useState(initialPos)
  const [center, setCenter] = useState(initialPos || DEFAULT_CENTER)
  const [zoom, setZoom] = useState(initialZoom)

  // When parent passes center (e.g. from address geocode), update map and marker
  useEffect(() => {
    if (controlledCenter && controlledCenter.lat != null && controlledCenter.lng != null) {
      const next = [controlledCenter.lat, controlledCenter.lng]
      setPosition(next)
      setCenter(next)
    }
  }, [controlledCenter?.lat, controlledCenter?.lng])

  const handleSelect = useCallback(
    (lat, lng) => {
      setPosition([lat, lng])
      setCenter([lat, lng])
      onSelect?.(lat, lng)
    },
    [onSelect]
  )

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: `${height}px` }}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1}
        style={{ minHeight: height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelect={handleSelect} />
        <CenterUpdater center={position || center} />
        {position && <Marker position={position} icon={markerIcon} />}
      </MapContainer>
    </div>
  )
}
