import PolicyPageLayout from './PolicyPageLayout'

export default function PaymentPolicyPage() {
  return (
    <PolicyPageLayout title="Payment policy">
      <p><strong>Last updated:</strong> [Date]</p>
      <p>KHUSH accepts secure payments through multiple methods. By placing an order, you agree to our payment terms.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Accepted methods</h2>
      <p>We accept credit/debit cards, net banking, UPI, and cash on delivery (COD) where available. All online payments are processed through secure, encrypted gateways.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Pricing and currency</h2>
      <p>All prices are displayed in Indian Rupees (INR) and include applicable taxes unless stated otherwise. Final amount may include delivery and other charges at checkout.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Failed or disputed payments</h2>
      <p>If a payment fails, your order will not be confirmed. For disputed or duplicate charges, please contact us with your order and transaction details for resolution.</p>
    </PolicyPageLayout>
  )
}
