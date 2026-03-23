import PolicyPageLayout from './PolicyPageLayout'
import { Shield, Lock, FileText, UserCheck } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
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

      </div>
    </PolicyPageLayout>
  )
}