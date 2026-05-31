import { Helmet } from 'react-helmet-async'
import PolicyPageLayout from './PolicyPageLayout'

export default function ReturnPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Return Policy | Khush Pehno</title>
        <meta
          name="description"
          content="Read the Return Policy of Khush Lifestyle Private Limited for return windows, eligibility, refunds to Khush Wallet, and the return process."
        />
        <meta
          name="keywords"
          content="return policy, exchange and returns, khush pehno returns, khush wallet refund, online shopping returns"
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Return Policy | Khush Pehno" />
        <meta
          property="og:description"
          content="Read the Return Policy of Khush Lifestyle Private Limited for return windows, eligibility, refunds to Khush Wallet, and the return process."
        />
      </Helmet>

      <PolicyPageLayout title="Return Policy – Khush Lifestyle Private Limited">
        <p>
          At Khush Lifestyle Private Limited, we strive to ensure that you love every purchase.
          If for any reason you are not completely satisfied, we offer a simple return process.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">1. Return Window</h2>
        <p>
          Customers may request a return within 7 days from the date of delivery of the product.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">2. Eligibility for Return</h2>
        <p>To be eligible for a return:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The product must be unused, unworn, unwashed, and in its original condition.</li>
          <li>All original tags, packaging, invoices, and accessories (if any) must be intact.</li>
          <li>Products showing signs of use, damage, or alteration will not be accepted.</li>
        </ul>

        <h2 className="text-lg font-semibold text-black mt-6">3. Refund Method</h2>
        <p>
          Once the returned product passes our quality inspection, the refund amount will be
          credited to the customer&apos;s Khush Wallet.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Wallet credits can be used for future purchases on our platform.</li>
          <li>
            No cash refund or bank transfer will be provided unless required under applicable law.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-black mt-6">4. Non-Returnable Items</h2>
        <p>The following items are not eligible for return:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Products purchased during clearance or final sale</li>
          <li>Innerwear, lingerie, socks, or personal hygiene items</li>
          <li>Customized or made-to-order products</li>
          <li>Gift cards / promotional items</li>
        </ul>

        <h2 className="text-lg font-semibold text-black mt-6">5. Return Process</h2>
        <p>To initiate a return:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Contact our customer support team within 7 days of delivery.</li>
          <li>Share your order number and reason for return.</li>
          <li>
            Our team will arrange pickup (where service is available) or guide you through the
            return shipping process.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-black mt-6">6. Quality Check &amp; Approval</h2>
        <p>Returned products will undergo a quality check upon receipt.</p>
        <p>
          If approved, wallet credit will be processed within 5–7 business days.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">7. Damaged / Wrong Product</h2>
        <p>
          If you receive a damaged, defective, or incorrect product, please report it within 48
          hours of delivery with supporting images/videos for faster resolution.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">8. Cancellation</h2>
        <p>
          Orders can be canceled before dispatch. Once shipped, cancellation may not be possible,
          but the return policy will apply.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">9. Company Rights</h2>
        <p>
          Khush Lifestyle Private Limited reserves the right to reject returns that do not meet
          the above conditions and to modify this policy at any time without prior notice.
        </p>
      </PolicyPageLayout>
    </>
  )
}
