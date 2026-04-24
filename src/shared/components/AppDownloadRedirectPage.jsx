import { useEffect } from 'react'

const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.khushpehno.app'
const IOS_URL = 'https://apps.apple.com/in/app/khush-fashion-shopping-app/id6761365897'
const WEB_URL = 'https://yourwebsite.com'

export default function AppDownloadRedirectPage() {
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera

    if (/android/i.test(userAgent)) {
      window.location.href = ANDROID_URL
      return
    }

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      window.location.href = IOS_URL
      return
    }

    window.location.href = WEB_URL
  }, [])

  return <p style={{ padding: '16px', fontFamily: 'sans-serif' }}>Redirecting...</p>
}
