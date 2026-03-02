import PolicyPageLayout from './PolicyPageLayout'

export default function FAQsPage() {
  return (
    <PolicyPageLayout title="FAQs">
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-black">Orders and checkout</h2>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            <li><strong>How do I place an order?</strong> Add items to cart, proceed to checkout, enter delivery and payment details, and confirm your order.</li>
            <li><strong>Can I modify or cancel my order?</strong> You can cancel before the order is shipped. Modifications may be possible in some cases—contact support.</li>
            <li><strong>How do I track my order?</strong> Use the tracking link sent to your email or log in to your account and view order history.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">Returns and refunds</h2>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            <li><strong>What is your return window?</strong> Returns are accepted within the period mentioned in our Refund and Cancel Policy, typically from the delivery date.</li>
            <li><strong>How will I receive my refund?</strong> Refunds are processed to the original payment method and may take 5–10 business days to reflect.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">Delivery</h2>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            <li><strong>Do you deliver to my area?</strong> Enter your pincode on the product or checkout page to check serviceability and delivery options.</li>
            <li><strong>What if I am not available for delivery?</strong> The courier may attempt again or leave the package at a safe location as per their policy; you can also reschedule where supported.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">Account and security</h2>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            <li><strong>How do I reset my password?</strong> Use the &quot;Forgot password&quot; link on the login page and follow the instructions sent to your email.</li>
            <li><strong>Who do I contact for help?</strong> Reach out via the Contact Us page or the email/phone provided on our website.</li>
          </ul>
        </section>
      </div>
    </PolicyPageLayout>
  )
}
