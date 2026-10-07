import { useEffect, useState } from 'react'

const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.khushpehno.app'
const IOS_URL = 'https://apps.apple.com/in/app/khush-fashion-shopping-app/id6761365897'

function storeUrlForDevice() {
  const ua = navigator.userAgent || navigator.vendor || ''
  if (/android/i.test(ua)) return ANDROID_URL
  if (/iPad|iPhone|iPod/.test(ua)) return IOS_URL
  // iPadOS 13+ reports itself as a Mac.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return IOS_URL
  return null
}

/** /app-download — one link for every device: Play Store on Android, App Store on iOS. */
export default function AppDownloadRedirectPage() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const url = storeUrlForDevice()
    if (url) {
      window.location.replace(url)
    } else {
      setIsDesktop(true)
    }
  }, [])

  if (!isDesktop) {
    return <p style={{ padding: '16px', fontFamily: 'sans-serif' }}>Opening the app store…</p>
  }

  return (
    <div style={{ padding: '32px 16px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Get the Khush app</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={ANDROID_URL} style={{ padding: '10px 18px', borderRadius: '8px', background: '#111', color: '#fff', textDecoration: 'none' }}>
          Google Play
        </a>
        <a href={IOS_URL} style={{ padding: '10px 18px', borderRadius: '8px', background: '#111', color: '#fff', textDecoration: 'none' }}>
          App Store
        </a>
      </div>
    </div>
  )
}
