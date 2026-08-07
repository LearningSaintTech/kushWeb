import { Link } from 'react-router-dom'
import PolicyPageLayout from './PolicyPageLayout'
import { ROUTES } from '../../utils/constants'

export default function TermsConditionsPage() {
  return (
    <PolicyPageLayout title="Terms & Condition">
      <p className="text-sm text-gray-500">Last Updated: May 26, 2026</p>

      <p>
        Welcome to Khush. These Terms &amp; Conditions govern your use of our website,
        mobile application, and services. By accessing or using our platform, you agree
        to comply with these terms.
      </p>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">1. Acceptance of Terms</h2>
        <p>
          By using our website or placing an order, you agree to be bound by these Terms
          &amp; Conditions, our{' '}
          <Link to={ROUTES.PRIVACY_POLICY} className="underline hover:text-black">
            Privacy Policy
          </Link>
          , and any other policies posted on our platform. If you do not agree with any part
          of these terms, please do not use our services.
        </p>
      </section>

      {/* <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">2. Eligibility</h2>
        <p>To use our platform, you must:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Be at least 18 years old or use the platform under parental supervision</li>
          <li>Provide accurate and complete information</li>
          <li>Use the website only for lawful purposes</li>
        </ul>
      </section> */}

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">3. Products &amp; Pricing</h2>
        <p>
          We strive to ensure that all product details, images, descriptions, and prices
          are accurate. However:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Colors may slightly vary due to screen settings</li>
          <li>Prices may change without prior notice</li>
          <li>We reserve the right to discontinue products anytime</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">4. Orders &amp; Payments</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>All orders are subject to availability and confirmation</li>
          <li>We reserve the right to cancel or refuse any order</li>
          <li>Payments must be completed through approved payment methods</li>
          <li>In case of payment failure, the order may not be processed</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">5. Shipping &amp; Delivery</h2>
        <p>
          Delivery timelines are estimated and may vary depending on location and courier
          services. We are not responsible for delays caused by:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Natural disasters</li>
          <li>Courier issues</li>
          <li>Incorrect shipping information provided by customers</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">6. Returns &amp; Refunds</h2>
        <p>
          Customers may request returns or refunds according to our Return Policy. Items may
          not be eligible for return if:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>They are used, damaged, or washed</li>
          <li>Original tags are removed</li>
          <li>Return request exceeds the allowed return period</li>
        </ul>
        <p>Refunds are processed within the specified timeline after approval.</p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">7. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account
          credentials. We reserve the right to suspend or terminate accounts involved in:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Fraudulent activity</li>
          <li>Abuse of offers or discounts</li>
          <li>Violation of platform policies</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">8. Intellectual Property</h2>
        <p>All content on the platform including:
        All content on the platform including: Logos, Images, Graphics, Product designs, Text and UI elements are the property of Khush and may not be copied or used without permission.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">9. AI-Generated Images</h2>
        <p>
          Some images displayed on the Khush website may be generated or enhanced using
          artificial intelligence (AI). While these images are intended to represent
          fictional individuals or illustrative concepts, they may, in rare cases, bear an
          unintended resemblance to real persons.
        </p>
        <p>
          If you believe that an image on our website resembles you or infringes upon your
          rights, please contact us at{' '}
          <a href="mailto:support@khushpehno.com" className="underline hover:text-black">
            support@khushpehno.com
          </a>
          . Upon receiving your request, we will review the matter promptly and take
          appropriate action, including the removal of the image where deemed necessary.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">
          10. Governing Law and Jurisdiction
        </h2>
        <p>
          These Terms &amp; Conditions shall be governed by and construed in accordance with
          the laws of India. Any dispute, claim, or legal proceeding arising out of or
          relating to these Terms &amp; Conditions shall be subject to the exclusive
          jurisdiction of the competent courts located in Noida, Uttar Pradesh, India, to
          the exclusion of all other jurisdictions.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-black">11. Agreement</h2>
        <p>
          By accessing or using our platform, you acknowledge that you have read, understood,
          and agreed to these Terms &amp; Conditions.
        </p>
      </section>
    </PolicyPageLayout>
  )
}
