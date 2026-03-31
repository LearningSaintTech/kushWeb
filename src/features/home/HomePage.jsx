import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Banner from './components/Banner'
import OurProduct from './components/OurProduct'
import BestSellar from './components/BestSellar'
import Collection from './components/Collection'
import OurCategory from './components/OurCategory'
import NewArrivals from './components/NewArrivals'
// import Couples from './components/Couples'
// import WearYour from './components/WearYour'
import HomePageLoader from './components/HomePageLoader'
import { sectionsService } from '../../services/content.service.js'

// API webOrder 1,2,3zz... maps to these components. WearYour is static (not in API order).
const WEB_ORDER_TO_COMPONENT = {
  1: NewArrivals,
  // 2: Couples,
  // 3: OurCategory,
  // 4: Collection,
  // 5: BestSellar,
  6: OurProduct,
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
        console.log("res", res)
        if (cancelled) return
        const raw = res?.data?.data?.items ?? res?.data?.items ?? []
        console.log("raw", raw)
        const sorted = [...raw].sort(
          (a, b) => (a.webinfo?.webOrder ?? 999) - (b.webinfo?.webOrder ?? 999)
        )
        console.log("sorted", sorted)
        const byOrder = {}
        sorted.forEach((s) => {
          let order = s.webinfo?.webOrder ?? 999
          if (order === 0) order = 1 // webOrder 0 → slot 1 (New Arrivals)
          if (order >= 1 && order <= 6) byOrder[order] = s
        })
        setSectionsByOrder(byOrder)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load sections')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [pincode])

  return (
    <div>
      <Banner />
      {loading && <HomePageLoader />}
      {error && (
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="pt-8 md:pt-12 lg:pt-16 space-y-8 md:space-y-12 lg:space-y-16">
          {[1, 2, 3, 4, 5, 6].map((order) => {
            const SectionComponent = WEB_ORDER_TO_COMPONENT[order]
            const section = sectionsByOrder[order]
            return (
              <React.Fragment key={order}>
                {/* {order === 2 && <WearYour key="wear-your-static" />} */}
                {SectionComponent ? <SectionComponent key={`section-${order}`} section={section} /> : null}
              </React.Fragment>
            )
          })}
          {Object.keys(sectionsByOrder).length === 0 && (
            <>
              <NewArrivals />
              {/* <WearYour /> */}
              {/* <Couples /> */}
              {/* <OurCategory /> */}
              {/* <Collection /> */}
              {/* <BestSellar /> */}
              <OurProduct />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default HomePage
