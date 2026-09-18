function StepCard({ n, title, body, tag }) {
  return (
    <article className="min-w-[220px] flex-1 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="font-inter text-xs font-semibold text-neutral-400">Step {n}</p>
      <h4 className="mt-1 font-inter text-sm font-semibold text-black">{title}</h4>
      <p className="mt-2 font-inter text-xs leading-relaxed text-neutral-600">{body}</p>
      {tag ? (
        <p className="mt-3 font-inter text-[11px] font-medium text-neutral-500">{tag}</p>
      ) : null}
    </article>
  )
}

function TermRow({ title, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-neutral-200 py-4 last:border-b-0 sm:flex-row sm:gap-8">
      <h3 className="w-full shrink-0 font-inter text-sm font-semibold text-black sm:w-48">
        {title}
      </h3>
      <p className="font-inter text-sm leading-relaxed text-neutral-600">{children}</p>
    </div>
  )
}

/** Creator / designer payment & earning policy — used on the public page and in settings. */
export default function PaymentEarningPolicyContent() {
  return (
    <div className="space-y-8">
      <p className="font-inter text-sm leading-relaxed text-neutral-600">
        How creators and designers earn on KHUSH, when commissions settle, and the minimum
        withdrawal amount.
      </p>

      <section>
        <h2 className="font-inter text-base font-semibold text-black">Creator earning flow</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          <StepCard
            n="1"
            title="Post & Tag Apparel"
            body="Post a picture or reel on the community tab with your purchased item tagged on it."
            tag="Product Tagging"
          />
          <StepCard
            n="2"
            title="User Purchase"
            body="Any user viewing your post can click on the tagged item and complete a purchase."
            tag="Direct Shop"
          />
          <StepCard
            n="3"
            title="Verify Commission"
            body="Commission settles once delivery is complete and the 15-day return and exchange window has closed."
            tag="15-Day Return Window"
          />
          <StepCard
            n="4"
            title="Earn & Cashout"
            body="Receive a flat commission of 2.5% of the item price. Redeem your wallet balance once it reaches ₹5."
            tag="2.5% Commission"
          />
        </div>
      </section>

      <section>
        <h2 className="font-inter text-base font-semibold text-black">Designer earning flow</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          <StepCard
            n="1"
            title="Submit Project Portfolio"
            body="Add your project portfolio page from the designer dashboard and wait for admin approval."
            tag="Portfolio Review"
          />
          <StepCard
            n="2"
            title="Launch Collections"
            body="Once approved, design and launch your signature collaborative clothing products with us."
            tag="Apparel Partnership"
          />
          <StepCard
            n="3"
            title="Sales Verification"
            body="Royalty commission is verified once the items are successfully delivered and the customer return period closes."
            tag="Settlement Verification"
          />
          <StepCard
            n="4"
            title="Lifetime Royalties"
            body="Earn a lifetime commission of 1% on every sale of your clothes. If tagged by a creator, they earn 2.5% too."
            tag="1% Royalty"
          />
        </div>
      </section>

      <section>
        <h2 className="font-inter text-base font-semibold text-black">Payment terms &amp; limits</h2>
        <div className="mt-1 divide-y divide-neutral-200 border-t border-neutral-200">
          <TermRow title="Creator Commission Rate">
            Creators receive a flat commission of 2.5% on the item price of any apparel tagged
            in their community posts or reels, once purchased by other users.
          </TermRow>
          <TermRow title="Designer Sales Share">
            Designers receive a lifetime commission of 1% on their designer clothes purchases
            once delivered and standard transactions are processed.
          </TermRow>
          <TermRow title="Creator Tagging Share">
            If a community creator tags your apparel in their post or reel resulting in a
            purchase, they receive a flat commission of 2.5% on the item price once delivered.
          </TermRow>
          <TermRow title="Minimum Redemption Limit">
            Wallet balances can only be redeemed once they reach a minimum threshold of ₹5.
            Withdrawals below this limit are not allowed.
          </TermRow>
        </div>
      </section>
    </div>
  )
}
