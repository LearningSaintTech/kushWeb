import { useEffect, useState } from 'react'
import { Gift, X } from 'lucide-react'
import { giftItemsService } from '../../services/giftItems.service.js'

export default function FreeGiftPicker({ selectedGift, onChange }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGiftItems = async () => {
    try {
      setLoading(true)
      setError('')
      setItems(await giftItemsService.getActive())
    } catch {
      setItems([])
      setError('Unable to load free gifts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGiftItems()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const chooseGift = (item) => {
    onChange(item)
    setOpen(false)
  }

  return (
    <section className="border-y border-gray-200 py-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-black">
          Choose Your Free Gift
        </h2>
        <Gift className="h-4 w-4 shrink-0 text-black" aria-hidden="true" />
        <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
      </div>

      {selectedGift ? (
        <div className="mb-3 flex items-center gap-3 border border-gray-200 bg-gray-50 p-2.5">
          <img
            src={selectedGift.image}
            alt={selectedGift.name}
            className="h-14 w-14 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-black">
              {selectedGift.name}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase text-green-700">
              Free gift selected
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold uppercase text-gray-600 underline hover:text-black"
          >
            Remove
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!loading && items.length === 0 && !error}
        className="w-full bg-black px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {selectedGift ? 'Change Gift' : 'Select Gift'}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-gift-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h3
                  id="free-gift-title"
                  className="text-base font-semibold uppercase tracking-wide text-black"
                >
                  Choose Your Free Gift
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Select one complimentary gift
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-gray-500 transition-colors hover:text-black"
                aria-label="Close gift selection"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Loading free gifts…
                </p>
              ) : error ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={loadGiftItems}
                    className="mt-3 bg-black px-4 py-2 text-xs font-semibold uppercase text-white"
                  >
                    Try again
                  </button>
                </div>
              ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  No free gifts are available right now.
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {items.map((item) => {
                    const isSelected = selectedGift?._id === item._id
                    return (
                      <li
                        key={item._id}
                        className={`flex items-center gap-3 py-3 ${
                          isSelected ? 'bg-gray-50' : ''
                        }`}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-20 shrink-0 border border-gray-200 object-cover sm:h-24 sm:w-24"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-black">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="min-w-24 border border-gray-400 bg-white px-4 py-2 text-xs font-semibold uppercase text-black hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => chooseGift(item)}
                            className="min-w-24 bg-black px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-gray-800"
                          >
                            Add
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
