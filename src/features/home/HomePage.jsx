import React, { useState, useEffect } from 'react'
import { debugLog, debugError } from '../../utils/debugLog.js';
import { Helmet } from "react-helmet-async"
import { useSelector } from 'react-redux'
import Banner from './components/Banner'
//  import SpecialDiscount from './components/SpecialDiscount'
import LimitedEdition from './components/LimitedEdition'
import OurProduct from './components/OurProduct'
// import Collection from './components/Collection'
// import OurCategory from './components/OurCategory'
import NewArrivals from './components/NewArrivals'
import HomePageLoader from './components/HomePageLoader'
import StaticCard from '../staticCards/StaticCard.jsx'
import { sectionsService } from '../../services/content.service.js'

/** webOrder → home section component (static fallbacks when no API section for that slot). */
const WEB_ORDER_TO_COMPONENT = {
  1: NewArrivals,
  // 2: Couples,
  // 3: OurCategory,
  // 4: SpecialDiscount,
  5: LimitedEdition,
  6: OurProduct,
  // 9: SpecialDiscount,
}

/** Render order on home; slot 9 = Fathers Day / special offer (falls back to webOrder 4). */
const HOME_SLOT_ORDERS = [1,  5, 6]

const HOME_WEB_ORDERS = new Set([1, 4, 5, 6,  10])

function getSectionWebOrder(section) {
  let order = section.webOrder ?? section.webinfo?.webOrder ?? 999
  if (order === 0) order = 1
  return order
}

function resolveSectionForHomeSlot(order, sectionsByOrder) {
  if (order === 9) return sectionsByOrder[9] ?? sectionsByOrder[4]
  return sectionsByOrder[order]
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
        debugLog('[HomePage] sections API response:', res)
        debugLog('[HomePage] sections API data:', res?.data)
        const raw = res?.data?.data?.items ?? res?.data?.items ?? []
        debugLog('[HomePage] sections items (raw):', raw)
        const sorted = [...raw].sort(
          (a, b) => getSectionWebOrder(a) - getSectionWebOrder(b)
        )
        debugLog('[HomePage] sections sorted by webOrder:', sorted)
        const byOrder = {}
        sorted.forEach((s) => {
          const order = getSectionWebOrder(s)
          if (HOME_WEB_ORDERS.has(order)) byOrder[order] = s
        })
        debugLog('[HomePage] sections by slot (webOrder):', byOrder)
        setSectionsByOrder(byOrder)
      })
      .catch((err) => {
        debugError('[HomePage] sections API error:', err)
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
      {loading && <HomePageLoader />}
      {error && (
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="bg-white">
          <div className="pt-5 md:pt-10 lg:pt-16 space-y-8 md:space-y-12 lg:space-y-16">
            {HOME_SLOT_ORDERS.map((order) => {
              const SectionComponent = WEB_ORDER_TO_COMPONENT[order]
              const section = resolveSectionForHomeSlot(order, sectionsByOrder)
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
