import PolicyPageLayout from './PolicyPageLayout'

export default function ContactUsPage() {
  return (
    <PolicyPageLayout title="Contact us">
      <p>We are here to help. Reach out for orders, returns, or general enquiries.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Email</h2>
      <p><a href="mailto:contact@yoraa.in" className="text-black underline hover:no-underline">support@khushpehno.com</a></p>
      <h2 className="text-lg font-semibold text-black mt-6">Customer support</h2>
      <p>For order-related queries, please include your order number. We aim to respond within 24–48 business hours.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Business enquiries</h2>
      <p>For partnerships, wholesale, or other business enquiries, please email us with the subject line “Business enquiry”.</p>
    </PolicyPageLayout>
  )
}
