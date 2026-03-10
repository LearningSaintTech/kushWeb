import PolicyPageLayout from './PolicyPageLayout'

export default function TermsConditionsPage() {
  return (
    <PolicyPageLayout title="Terms & conditions">
      {/* <p><strong>Last updated:</strong> [Date]</p> */}
      <p>By using the KHUSH website and services, you agree to these Terms and Conditions. Please read them carefully.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Use of the website</h2>
      <p>You may use our website for lawful purposes only. You must not misuse the site, attempt unauthorised access, or use it in any way that could harm the platform or other users.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Orders and contracts</h2>
      <p>Placing an order constitutes an offer to purchase. We reserve the right to accept or decline orders. A contract is formed when we confirm your order and payment is received or verified.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Pricing and availability</h2>
      <p>Prices and availability are subject to change. We strive to display accurate information but do not guarantee that product details or pricing are error-free. We may correct errors and cancel orders arising from such errors.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Intellectual property</h2>
      <p>All content on this website, including text, images, logos, and design, is the property of KHUSH or its licensors and is protected by applicable intellectual property laws.</p>
    </PolicyPageLayout>
  )
}
