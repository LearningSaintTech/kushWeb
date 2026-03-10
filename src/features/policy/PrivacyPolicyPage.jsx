import PolicyPageLayout from './PolicyPageLayout'

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageLayout title="Privacy policy">
      {/* <p><strong>Last updated:</strong> [Date]</p> */}
      <p>KHUSH respects your privacy. This policy describes how we collect, use, and protect your personal information when you use our website and services.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Information we collect</h2>
      <p>We may collect your name, email, phone number, delivery address, payment details, and browsing data when you register, place orders, or interact with our site.</p>
      <h2 className="text-lg font-semibold text-black mt-6">How we use it</h2>
      <p>We use your information to process orders, communicate with you, improve our services, send promotional communications (with your consent), and comply with legal obligations.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Sharing and disclosure</h2>
      <p>We do not sell your personal data. We may share information with service providers (e.g. payment gateways, couriers) necessary to fulfil orders and run our business, subject to confidentiality and data protection obligations.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Security and retention</h2>
      <p>We implement reasonable security measures to protect your data. We retain your information for as long as needed for the purposes described in this policy or as required by law.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Your rights</h2>
      <p>You may request access, correction, or deletion of your personal data, or withdraw consent for marketing, by contacting us. Applicable laws may give you additional rights.</p>
    </PolicyPageLayout>
  )
}
