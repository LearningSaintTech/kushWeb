import PolicyPageLayout from './PolicyPageLayout';

export default function FAQsPage() {
  return (
    <PolicyPageLayout> {/* ← Remove title prop if it duplicates the h1 */}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900 sm:mb-10 sm:text-4xl">
          Frequently Asked Questions
        </h1>

        <div className="space-y-8 sm:space-y-10">
          {/* Orders and Checkout */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:mb-4 sm:text-2xl">
              Orders & Checkout
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <FaqItem
                question="How do I place an order?"
                answer="Add items to your cart, proceed to checkout, enter your delivery and payment details, and confirm your order."
              />
              <FaqItem
                question="Can I modify or cancel my order?"
                answer="You can cancel your order before it is shipped. Modifications are possible in some cases — please contact support as soon as possible."
              />
              <FaqItem
                question="How do I track my order?"
                answer="Use the tracking link sent to your email or log in to your account → Orders section to view real-time status."
              />
            </div>
          </section>

          {/* Returns and Refunds */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:mb-4 sm:text-2xl">
              Returns & Refunds
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <FaqItem
                question="What is your return window?"
                answer="Returns are accepted within the timeframe specified in our Refund & Cancellation Policy, usually starting from the date of delivery."
              />
              <FaqItem
                question="How will I receive my refund?"
                answer="Refunds are  processes to Khush Wallet. The refund amount will be credit to your wallet balance after your return is approved .
                You can use the wallet balance for future purchases on Khush. Refunds are typically credited within 5-10 business days."
              />
            </div>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:mb-4 sm:text-2xl">
              Delivery
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <FaqItem
                question="Do you deliver to my area?"
                answer="Enter your pincode on the product page or during checkout to check serviceability and available delivery options."
              />
              <FaqItem
                question="What if I am not available for delivery?"
                answer="The courier may attempt redelivery the next day or leave the package at a safe location (as per their policy). You can also reschedule delivery in many cases via the tracking link."
              />
            </div>
          </section>

          {/* Account */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:mb-4 sm:text-2xl">
              Account & Security
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <FaqItem
                question="How do I reset my password?"
                answer='Click "Forgot password?" on the login page and follow the instructions sent to your registered email.'
              />
              <FaqItem
                question="Who do I contact for help?"
                answer="Use the Contact Us form on our website, or reach out via email / phone number listed in the footer or Contact section."
              />
            </div>
          </section>
        </div>
      </div>
    </PolicyPageLayout>
  );
}

function FaqItem({ question, answer }) {
  return (
    <div className="group rounded-xl px-3 py-4 transition-colors hover:bg-gray-50/60 sm:px-4">
      <dt className="text-base font-semibold leading-6 text-gray-900 group-hover:text-indigo-600 sm:text-lg sm:leading-7">
        {question}
      </dt>
      <dd className="mt-1.5 text-sm leading-6 text-gray-600 sm:text-base">
        {answer}
      </dd>
    </div>
  );
}