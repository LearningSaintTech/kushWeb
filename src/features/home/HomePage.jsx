import React, { useState, useEffect } from 'react'
import { Helmet } from "react-helmet-async"
import { useSelector } from 'react-redux'
import Banner from './components/Banner'
import SpecialDiscount from './components/SpecialDiscount'
import LimitedEdition from './components/LimitedEdition'
import OurProduct from './components/OurProduct'
// import Collection from './components/Collection'
// import OurCategory from './components/OurCategory'
import NewArrivals from './components/NewArrivals'
import HomePageLoader from './components/HomePageLoader'
import { GiftCardBanner } from '../giftcard'
import StaticCard from '../staticCards/StaticCard.jsx'
import { sectionsService } from '../../services/content.service.js'

/** webOrder → home section component (static fallbacks when no API section for that slot). */
const WEB_ORDER_TO_COMPONENT = {
  1: NewArrivals,
  // 2: Couples,
  // 3: OurCategory,
  4: SpecialDiscount,
  5: LimitedEdition,
  6: OurProduct,
}

const HOME_SLOT_ORDERS = [1, 4, 5, 6]

function getSectionWebOrder(section) {
  let order = section.webOrder ?? section.webinfo?.webOrder ?? 999
  if (order === 0) order = 1
  return order
}

function HomePage() {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [sectionsByOrder, setSectionsByOrder] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = { isWeb: true, limit: 20, productLimit: 10 }
    if (pincode) params.pinCode = String(pincode)
    sectionsService
      .getActive(params)
      .then((res) => {
        if (cancelled) return
        console.log('[HomePage] sections API response:', res)
        console.log('[HomePage] sections API data:', res?.data)
        const raw = res?.data?.data?.items ?? res?.data?.items ?? []
        console.log('[HomePage] sections items (raw):', raw)
        const sorted = [...raw].sort(
          (a, b) => getSectionWebOrder(a) - getSectionWebOrder(b)
        )
        console.log('[HomePage] sections sorted by webOrder:', sorted)
        const byOrder = {}
        sorted.forEach((s) => {
          const order = getSectionWebOrder(s)
          if (order >= 1 && order <= 6) byOrder[order] = s
        })
        console.log('[HomePage] sections by slot (webOrder):', byOrder)
        setSectionsByOrder(byOrder)
      })
      .catch((err) => {
        console.error('[HomePage] sections API error:', err)
        if (!cancelled) setError(err?.message ?? 'Failed to load sections')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [pincode])

  return (
    <>
     <Helmet>
        <title>
          Buy Online Fashion Clothing for Women & Men | Khush Pehno
        </title>

  <meta
          name="description"
          content="Looking for Online Shopping Site for Fashion Clothing. We bring you the finest Collection of Women, Men. Shop today on khushpehno with Free delivery, Online Payment, COD."
        />

        <meta
          name="keywords"
          content="online shopping, fashion clothing, women clothing, men clothing, online fashion store"
        />

        
        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:title"
          content="Buy Online Fashion Clothing for Women & Men | Khush Pehno"
        />

         <meta
          property="og:description"
          content="Looking for Online Shopping Site for Fashion Clothing. We bring you the finest Collection of Women, Men. Shop today on khushpehno with Free delivery, Online Payment, COD."
        />
      </Helmet>

    <div>
      <Banner className="bg-white" />
      <StaticCard className="bg-white" />
      <GiftCardBanner className="bg-white" />
      {loading && <HomePageLoader />}
      {error && (
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="bg-white">
          <div className="pt-8 md:pt-12 lg:pt-16 space-y-8 md:space-y-12 lg:space-y-16">
            {HOME_SLOT_ORDERS.map((order) => {
              const SectionComponent = WEB_ORDER_TO_COMPONENT[order]
              const section = sectionsByOrder[order]
              if (!SectionComponent) return null
              return (
                <SectionComponent
                  key={`home-slot-${order}`}
                  section={section}
                />
              )
            })}
          </div>
        </div>
        
      )}
    </div>
    </>
  )
}

export default HomePage
