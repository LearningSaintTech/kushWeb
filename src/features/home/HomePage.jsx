import React, { useState, useEffect } from 'react'
import Banner from './components/Banner'
import OurProduct from './components/OurProduct'
import BestSellar from './components/BestSellar'
import Collection from './components/Collection'
import OurCategory from './components/OurCategory'
import NewArrivals from './components/NewArrivals'
import Couples from './components/Couples'
import WearYour from './components/WearYour'
import { sectionsService } from '../../services/content.service.js'

const WEB_ORDER_TO_COMPONENT = {
  1: NewArrivals,
  2: Couples,
  3: OurCategory,
  4: Collection,
  5: BestSellar,
  6: OurProduct,
}

function HomePage() {
  const [sectionsByOrder, setSectionsByOrder] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    sectionsService
      .getActive({ isWeb: true, limit: 20, productLimit: 12 })
      .then((res) => {
        if (cancelled) return
        const raw = res?.data?.data?.items ?? res?.data?.items ?? []
        const sorted = [...raw].sort(
          (a, b) => (a.webinfo?.webOrder ?? 999) - (b.webinfo?.webOrder ?? 999)
        )
        const byOrder = {}
        sorted.forEach((s) => {
          const order = s.webinfo?.webOrder ?? 999
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
  }, [])

  return (
    <div>
      <Banner />
      {loading && (
        <div className="container mx-auto px-4 py-8 text-center text-gray-500">
          Loading...
        </div>
      )}
      {error && (
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && [1, 2, 3, 4, 5, 6].map((order) => {
        const SectionComponent = WEB_ORDER_TO_COMPONENT[order]
        const section = sectionsByOrder[order]
        if (!SectionComponent) return null
        return <SectionComponent key={order} section={section} />
      })}
      {!loading && !error && Object.keys(sectionsByOrder).length === 0 && (
        <>
          <NewArrivals />
          <WearYour />
          <Couples />
          <OurCategory />
          <Collection />
          <BestSellar />
          <OurProduct />
        </>
      )}
    </div>
  )
}

export default HomePage
