import PolicyPageLayout from './PolicyPageLayout'

export default function ShippingDeliveryPolicyPage() {
  return (
    <PolicyPageLayout title="Shipping and delivery policy">
      <p><strong>Last updated:</strong> [Date]</p>
      <p>KHUSH delivers across India. Delivery timelines and charges depend on your location and the delivery option chosen at checkout.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Delivery options</h2>
      <p>We offer standard delivery, express delivery (where available), and same-day or quick delivery in select pin codes. Options and charges are shown at checkout based on your pincode.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Processing time</h2>
      <p>Orders are processed within 1–2 business days. Delivery time starts after the order is shipped. You will receive tracking details once the order is dispatched.</p>
      <h2 className="text-lg font-semibold text-black mt-6">Shipping charges</h2>
      <p>Shipping charges may apply based on order value, weight, and destination. Free delivery may be offered on orders above a certain value or for specific promotions.</p>
    </PolicyPageLayout>
  )
}
