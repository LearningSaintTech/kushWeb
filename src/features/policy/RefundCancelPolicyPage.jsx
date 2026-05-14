import { Helmet } from "react-helmet-async"
import PolicyPageLayout from './PolicyPageLayout'

export default function RefundCancelPolicyPage() {
  return (
    <>
      <Helmet>
        <title>
          Refund & Cancellation Policy | Khush Pehno
        </title>

        <meta
          name="description"
          content="Read the Refund & Cancellation Policy of Khush Pehno for details on returns, cancellations, refunds, and order-related policies."
        />

        <meta
          name="keywords"
          content="refund policy, cancellation policy, returns, khush pehno refunds, online shopping returns"
        />

        <meta property="og:type" content="website" />

        <meta
          property="og:title"
          content="Refund & Cancellation Policy | Khush Pehno"
        />

        <meta
          property="og:description"
          content="Read the Refund & Cancellation Policy of Khush Pehno for details on returns, cancellations, refunds, and order-related policies."
        />
      </Helmet>

      <PolicyPageLayout title="Refund and cancel policy">

        {/* <p><strong>Last updated:</strong> [Date]</p> */}

        <p>
          At KHUSH, we want you to be satisfied with your purchase.
          If you are not completely satisfied, you may request a refund
          or cancel your order subject to the following conditions.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          Eligibility
        </h2>

        <p>
          Refunds and cancellations are available for items returned in
          original condition within the specified return window.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          How to request
        </h2>

        <p>
          Contact our support team with your order number and reason for
          refund or cancellation. We will process eligible requests within
          5–7 business days.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          Cancellation window
        </h2>

        <p>
          Orders can be cancelled free of charge before shipment.
          Once shipped, our standard return and refund policy applies.
        </p>

      </PolicyPageLayout>
    </>
  )
}