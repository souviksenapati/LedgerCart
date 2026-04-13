import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  { cat: 'Orders & Payments', items: [
    { q: 'How do I place an order?', a: 'Browse products, add items to cart, proceed to checkout, select your address and payment method, then place the order.' },
    { q: 'What payment methods are accepted?', a: 'We accept Cash on Delivery (COD), UPI, Credit/Debit Cards, Net Banking, and Wallet payments.' },
    { q: 'Can I modify my order after placing it?', a: 'You can cancel and re-order if the order hasn\'t been shipped yet. Modifications to existing orders are not supported.' },
    { q: 'Is Cash on Delivery available for all orders?', a: 'COD is available for orders up to ₹10,000. For higher amounts, please use online payment.' },
  ]},
  { cat: 'Shipping & Delivery', items: [
    { q: 'How long does delivery take?', a: 'Metro cities: 2-4 days. Tier-2 cities: 4-6 days. Remote areas: 6-10 days. Timelines may vary during peak seasons.' },
    { q: 'Do you offer free shipping?', a: 'Yes! Free shipping on all orders above ₹1,000. Orders below ₹500 have a ₹49 delivery charge.' },
    { q: 'Can I track my order?', a: 'Yes. Once shipped, you\'ll receive a tracking number via email/SMS. You can also track from "My Orders" page.' },
    { q: 'Do you deliver heavy items like cement or rods?', a: 'Yes, we deliver heavy and bulky items. Additional shipping charges may apply and will be shown at checkout.' },
  ]},
  { cat: 'Returns & Refunds', items: [
    { q: 'What is your return policy?', a: 'Returns are accepted within 7 days of delivery. Products must be unused, in original packaging with all tags and accessories.' },
    { q: 'How do I return a defective product?', a: 'Report within 48 hours with photos. We\'ll arrange a free pickup and send a replacement or issue a refund.' },
    { q: 'When will I get my refund?', a: 'Refunds are processed within 5-7 business days after we receive and inspect the returned product.' },
  ]},
  { cat: 'Account & General', items: [
    { q: 'How do I create an account?', a: 'Click "Register" in the top menu. Fill in your name, email, phone, and password to create an account.' },
    { q: 'I forgot my password. What do I do?', a: 'Click "Forgot Password" on the login page and follow the instructions to reset your password via email.' },
    { q: 'Are the products genuine/branded?', a: 'Yes, 100%. We source directly from authorized distributors and manufacturers. All products come with manufacturer warranty.' },
    { q: 'Do you offer bulk/wholesale pricing?', a: 'Yes! Contact us at info@ledgercart.com or call +91 98765 43210 for bulk order inquiries and special pricing.' },
  ]},
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
        <span className="font-medium text-gray-800">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-gray-600">{a}</div>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-10">Find answers to common questions about our products, orders, and services.</p>

      {faqs.map(section => (
        <div key={section.cat} className="mb-10">
          <h2 className="text-xl font-bold mb-4">{section.cat}</h2>
          <div className="space-y-3">
            {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      ))}

      <div className="card p-8 text-center mt-12">
        <h3 className="text-lg font-bold mb-2">Still have questions?</h3>
        <p className="text-gray-500 mb-4">Our support team is here to help.</p>
        <a href="/contact" className="btn-primary inline-block">Contact Us</a>
      </div>
    </div>
  );
}
