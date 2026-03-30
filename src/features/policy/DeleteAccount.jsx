import PolicyPageLayout from './PolicyPageLayout'

export default function DeleteAccountPage() {
  return (
    <PolicyPageLayout title="Delete Your Account">
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          We’re sorry to see you go! At <span className="font-semibold text-black">KHUSH</span>, your privacy and
          personal data are important to us. If you wish to delete your account, please follow these steps:
        </p>

        <ul className="list-disc ml-5 space-y-2">
          <li>
            Contact us via our <span className="font-semibold text-black">Contact Us</span> form or email us at{' '}
            <a href="mailto:support@khushpehno.com" className="text-blue-600 font-medium hover:underline">
              support@khushpehno.com
            </a>
            .
          </li>
          <li>Include your account details (email address and username).</li>
          <li>
            Our team will process your request and permanently delete your account and associated data within 7
            business days.
          </li>
        </ul>

        <p>
          <span className="font-semibold text-black">Note:</span> Once your account is deleted, your order history,
          saved addresses, and personal preferences will be removed and cannot be recovered.
        </p>

        <p>We value your time with us and hope to see you back someday!</p>
      </div>
    </PolicyPageLayout>
  )
}