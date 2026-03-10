export default function ShippingExchangePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shipping & Exchange Policy</h1>
      <div className="prose max-w-none text-gray-600 space-y-6">
        <p><strong>Last updated:</strong> February 10, 2026</p>

        <h2 className="text-xl font-bold text-gray-900">1. Shipping Coverage</h2>
        <p>We currently deliver across India. Some remote areas may have limited delivery options. Delivery availability is verified at checkout using your PIN code.</p>

        <h2 className="text-xl font-bold text-gray-900">2. Shipping Charges</h2>
        <table className="w-full border-collapse border border-gray-200 text-sm">
          <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-2">Order Value</th><th className="border border-gray-200 p-2">Shipping Charge</th></tr></thead>
          <tbody>
            <tr><td className="border border-gray-200 p-2">Below ₹500</td><td className="border border-gray-200 p-2">₹49</td></tr>
            <tr><td className="border border-gray-200 p-2">₹500 - ₹999</td><td className="border border-gray-200 p-2">₹29</td></tr>
            <tr><td className="border border-gray-200 p-2">₹1,000 and above</td><td className="border border-gray-200 p-2">FREE</td></tr>
          </tbody>
        </table>
        <p>Heavy/bulky items (cement, rods, large machinery) may have additional shipping fees shown at checkout.</p>

        <h2 className="text-xl font-bold text-gray-900">3. Estimated Delivery Time</h2>
        <ul className="list-disc pl-6">
          <li><strong>Metro cities:</strong> 2-4 business days</li>
          <li><strong>Tier-2 cities:</strong> 4-6 business days</li>
          <li><strong>Rural/remote areas:</strong> 6-10 business days</li>
        </ul>
        <p>Delivery timelines may vary during sale events, festivals, or extreme weather conditions.</p>

        <h2 className="text-xl font-bold text-gray-900">4. Order Tracking</h2>
        <p>Once your order is shipped, you'll receive a tracking number via email/SMS. Track your order on "My Orders" page.</p>

        <h2 className="text-xl font-bold text-gray-900">5. Exchange Policy</h2>
        <ul className="list-disc pl-6">
          <li>Exchanges are accepted within <strong>7 days</strong> of delivery.</li>
          <li>Product must be unused, in original packaging with all tags/accessories.</li>
          <li>Contact our support team to initiate an exchange request.</li>
          <li>Replacement will be shipped after we receive and inspect the returned product.</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-900">6. Damaged / Wrong Items</h2>
        <p>If you receive a damaged or wrong product:</p>
        <ol className="list-decimal pl-6">
          <li>Take photos of the product and packaging</li>
          <li>Report within 48 hours of delivery</li>
          <li>We will arrange a free pickup and send a replacement or issue a refund</li>
        </ol>

        <h2 className="text-xl font-bold text-gray-900">7. Contact Us</h2>
        <p>Email: <strong>info@ledgercart.com</strong> | Phone: <strong>+91 98765 43210</strong></p>
      </div>
    </div>
  );
}
