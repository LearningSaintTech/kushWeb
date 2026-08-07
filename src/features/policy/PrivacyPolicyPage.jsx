import { Helmet } from "react-helmet-async"
import PolicyPageLayout from './PolicyPageLayout'
import { Shield, Lock, FileText, UserCheck } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>
          Privacy Policy | Khush Pehno
        </title>

        <meta
          name="description"
          content="Read the Privacy Policy of Khush Pehno to learn how we collect, use, and protect your personal information while shopping on our website."
        />

        <meta
          name="keywords"
          content="privacy policy, khush pehno privacy, data protection, online shopping privacy"
        />

        <meta property="og:type" content="website" />

        <meta
          property="og:title"
          content="Privacy Policy | Khush Pehno"
        />

        <meta
          property="og:description"
          content="Read the Privacy Policy of Khush Pehno to learn how we collect, use, and protect your personal information while shopping on our website."
        />
      </Helmet>

      <PolicyPageLayout title="Privacy Policy">
        <div className="space-y-6 text-gray-700 leading-relaxed">

          {/* Intro */}
          <div className="bg-gray-50 p-5 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500 mb-2">
              {/* <strong>Last updated:</strong> March 2026 */}
            </p>

            <p>
              <span className="font-semibold text-black">KHUSH</span> values your privacy.
              This policy explains how we collect, use, and protect your personal information.
            </p>
          </div>

          {/* Information We Collect */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} />

              <h2 className="text-lg font-semibold text-black">
                Information We Collect
              </h2>
            </div>

            <ul className="list-disc ml-5 space-y-1">
              <li>Personal details (name, email, phone, address)</li>
              <li>Payment details via secure gateways</li>
              <li>Browsing & purchase history</li>
            </ul>
          </div>

          {/* How We Use */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={18} />

              <h2 className="text-lg font-semibold text-black">
                How We Use Your Information
              </h2>
            </div>

            <ul className="list-disc ml-5 space-y-1">
              <li>To process and deliver orders</li>
              <li>Provide customer support</li>
              <li>Send updates, offers, and promotions</li>
            </ul>
          </div>

          {/* Data Protection */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} />

              <h2 className="text-lg font-semibold text-black">
                Data Protection
              </h2>
            </div>

            <p>
              Your data is stored securely and never shared for marketing without your consent.
              You can request account deletion anytime via Contact Us.
            </p>
          </div>

          {/* Cookies */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} />

              <h2 className="text-lg font-semibold text-black">
                Cookies & Tracking
              </h2>
            </div>

            <p>
              We use cookies to enhance your browsing experience and analyze website traffic.
            </p>
          </div>

          {/* User Rights */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <h2 className="text-lg font-semibold text-black mb-2">
              Your Rights
            </h2>

            <p>
              You can access, update, or delete your personal data anytime.
            </p>

            <p className="mt-2">
              Contact us at:
              <span className="text-blue-600 font-medium ml-1">
                support@khushpehno.com
              </span>
            </p>
          </div>

          {/* AI-Generated Images */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <h2 className="text-lg font-semibold text-black mb-2">
              AI-Generated Images
            </h2>

            <p>
              Some images displayed on the Khush website may be generated or enhanced using
              artificial intelligence (AI). While these images are intended to represent
              fictional individuals or illustrative concepts, they may, in rare cases, bear
              an unintended resemblance to real persons.
            </p>

            <p className="mt-3">
              If you believe that an image on our website resembles you or infringes upon
              your rights, please contact us at{' '}
              <a
                href="mailto:support@khushpehno.com"
                className="text-blue-600 font-medium hover:underline"
              >
                support@khushpehno.com
              </a>
              . Upon receiving your request, we will review the matter promptly and take
              appropriate action, including the removal of the image where deemed necessary.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-white p-5 rounded-xl shadow border">
            <h2 className="text-lg font-semibold text-black mb-2">
              Governing Law and Jurisdiction
            </h2>

            <p>
              This Privacy Policy shall be governed by and construed in accordance with the
              laws of India. Any dispute, claim, or legal proceeding arising out of or
              relating to this Privacy Policy shall be subject to the exclusive jurisdiction
              of the competent courts located in Noida, Uttar Pradesh, India, to the
              exclusion of all other jurisdictions.
            </p>
          </div>

        </div>
      </PolicyPageLayout>
    </>
  )
}