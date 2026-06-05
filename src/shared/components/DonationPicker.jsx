import {
  DEFAULT_DONATION_AMOUNT,
  DONATION_PRESETS,
  getActiveDonationAmount,
} from '../../utils/donation.js'

export default function DonationPicker({
  donationEnabled,
  donationAmount,
  donationPresetUsed,
  donationError,
  onSelectPreset,
  className = '',
}) {
  const activeAmount = getActiveDonationAmount({
    donationEnabled,
    donationAmount,
    donationPresetUsed,
  })
  const displayAmount = activeAmount ?? DEFAULT_DONATION_AMOUNT

  return (
    <section className={className}>
      <p className="font-inter text-sm font-normal text-black">
        Would You Like To Donate ₹{displayAmount}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5 sm:gap-3">
        {DONATION_PRESETS.map((amt) => {
          const selected = donationEnabled && activeAmount === amt
          return (
            <button
              key={amt}
              type="button"
              onClick={() => onSelectPreset(amt)}
              aria-pressed={selected}
              className={`min-w-[3.25rem] rounded-full px-5 py-2 font-inter text-sm font-medium transition-colors ${
                selected
                  ? 'bg-black text-white'
                  : 'bg-black/10 text-gray-700 hover:bg-black/15'
              }`}
            >
              ₹{amt}
            </button>
          )
        })}
      </div>
      {donationError ? (
        <p className="mt-2 font-inter text-xs text-red-600">{donationError}</p>
      ) : null}
    </section>
  )
}
