export default function CancellationRefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Cancellation & Refund Policy</h1>
      <div className="prose max-w-none text-gray-600 space-y-6">
        <p><strong>Last updated:</strong> February 10, 2026</p>

        <h2 className="text-xl font-bold text-gray-900">1. Order Cancellation</h2>
        <ul className="list-disc pl-6">
          <li>Orders can be cancelled before they are shipped (status: Pending or Confirmed).</li>
          <li>Once an order has been shipped, it cannot be cancelled. You may initiate a return instead.</li>
          <li>To cancel, go to "My Orders" and click "Cancel Order", or contact us directly.</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-900">2. Cancellation by LedgerCart</h2>
        <p>We reserve the right to cancel orders in the following cases:</p>
        <ul className="list-disc pl-6">
          <li>Product is out of stock after order placement</li>
          <li>Pricing or product information error</li>
          <li>Suspected fraudulent transaction</li>
          <li>Delivery address is unserviceable</li>
        </ul>
        <p>If we cancel your order, you will receive a full refund.</p>

        <h2 className="text-xl font-bold text-gray-900">3. Refund Policy</h2>
        <table className="w-full border-collapse border border-gray-200 text-sm">
          <thead><tr className="bg-gray-50"><th className="border border-gray-200 p-2">Scenario</th><th className="border border-gray-200 p-2">Refund Timeline</th></tr></thead>
          <tbody>
            <tr><td className="border border-gray-200 p-2">Cancelled before shipping</td><td className="border border-gray-200 p-2">3-5 business days</td></tr>
            <tr><td className="border border-gray-200 p-2">Returned product (undamaged)</td><td className="border border-gray-200 p-2">5-7 business days after receiving</td></tr>
            <tr><td className="border border-gray-200 p-2">Defective product</td><td className="border border-gray-200 p-2">Replacement or refund within 5-7 days</td></tr>
            <tr><td className="border border-gray-200 p-2">Wrong product delivered</td><td className="border border-gray-200 p-2">Replacement or refund within 5-7 days</td></tr>
          </tbody>
        </table>

        <h2 className="text-xl font-bold text-gray-900">4. Refund Method</h2>
        <ul className="list-disc pl-6">
          <li><strong>Online payments:</strong> Refund to original payment method</li>
          <li><strong>COD orders:</strong> Refund via bank transfer (NEFT/UPI). You'll be asked for bank details.</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-900">5. Non-Refundable Items</h2>
        <ul className="list-disc pl-6">
          <li>Items damaged due to misuse or improper handling by customer</li>
          <li>Products with missing original packaging/accessories</li>
          <li>Custom or made-to-order items</li>
          <li>Items returned after 7 days of delivery</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-900">6. Contact for Refunds</h2>
        <p>Email: <strong>info@ledgercart.com</strong> | Phone: <strong>+91 98765 43210</strong></p>
      </div>
    </div>
  );
}
