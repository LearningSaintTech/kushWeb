import PolicyPageLayout from './PolicyPageLayout';

export default function FAQsPage() {
  return (
    <PolicyPageLayout title="">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Frequently Asked Questions
        </h1>

        <div className="space-y-12">
          {/* Orders and Checkout */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Orders & Checkout
            </h2>
            <div className="divide-y divide-gray-200">
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
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Returns & Refunds
            </h2>
            <div className="divide-y divide-gray-200">
              <FaqItem
                question="What is your return window?"
                answer="Returns are accepted within the timeframe specified in our Refund & Cancellation Policy, usually starting from the date of delivery."
              />
              <FaqItem
                question="How will I receive my refund?"
                answer="Refunds are processed back to the original payment method. It typically takes 5–10 business days to reflect in your account, depending on your bank/payment provider."
              />
            </div>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Delivery
            </h2>
            <div className="divide-y divide-gray-200">
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
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Account & Security
            </h2>
            <div className="divide-y divide-gray-200">
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

// Cleaner, more modern FAQ item (no group hover effects)
function FaqItem({ question, answer }) {
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <dt className="text-lg font-medium leading-7 text-gray-900">
        {question}
      </dt>
      <dd className="mt-3 text-base leading-7 text-gray-600">
        {answer}
      </dd>
    </div>
  );
}