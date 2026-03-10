import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressesAPI, ordersAPI, couponsAPI } from '../../api';
import { useCart } from '../../context/CartContext';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, subtotal, clearCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newAddr, setNewAddr] = useState({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', label: 'Home' });
  const [showNewAddr, setShowNewAddr] = useState(false);

  const shipping = subtotal >= 500 ? 0 : 50;
  const taxable = subtotal - discount;            // GST on effective price after coupon
  const tax = Math.round(taxable * 0.18);
  const total = subtotal - discount + shipping + tax;

  useEffect(() => {
    addressesAPI.list().then(r => {
      setAddresses(r.data);
      const def = r.data.find(a => a.is_default);
      if (def) setSelectedAddr(def.id);
    });
  }, []);

  const applyCoupon = async () => {
    try {
      const r = await couponsAPI.validate({ code: couponCode, order_total: subtotal });
      setDiscount(r.data.discount);
      toast.success(`Coupon applied! ₹${r.data.discount} off`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid coupon');
      setDiscount(0);
    }
  };

  const handleNewAddress = async () => {
    try {
      const r = await addressesAPI.create(newAddr);
      setAddresses([...addresses, r.data]);
      setSelectedAddr(r.data.id);
      setShowNewAddr(false);
      toast.success('Address added');
    } catch (err) {
      toast.error('Failed to add address');
    }
  };

  const placeOrder = async () => {
    if (!selectedAddr) { toast.error('Please select a delivery address'); return; }
    setSubmitting(true);
    try {
      const r = await ordersAPI.create({
        address_id: selectedAddr,
        payment_method: paymentMethod,
        coupon_code: discount > 0 ? couponCode : null,
        notes
      });
      await clearCart();
      if (paymentMethod === 'cod') {
        // COD: go straight to order detail
        navigate(`/orders/${r.data.id}`);
        toast.success('Order placed! Pay on delivery.');
      } else {
        // Online payment: go to payment gateway page
        navigate(`/payment/${r.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.items?.length) { navigate('/cart'); return null; }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Address Selection */}
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Delivery Address</h2>
            <div className="space-y-3">
              {addresses.map(a => (
                <label key={a.id} className={`block border rounded-lg p-4 cursor-pointer ${selectedAddr === a.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="address" checked={selectedAddr === a.id} onChange={() => setSelectedAddr(a.id)} className="mr-2" />
                  <span className="font-medium">{a.full_name}</span> <span className="badge bg-gray-100 text-gray-600 ml-2">{a.label}</span>
                  <p className="text-sm text-gray-600 ml-6 mt-1">{a.address_line1}, {a.city}, {a.state} - {a.pincode}</p>
                  <p className="text-sm text-gray-500 ml-6">📞 {a.phone}</p>
                </label>
              ))}
            </div>

            <button onClick={() => setShowNewAddr(!showNewAddr)} className="text-primary-600 text-sm font-medium mt-3 hover:underline">+ Add New Address</button>

            {showNewAddr && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                <input value={newAddr.full_name} onChange={e => setNewAddr({...newAddr, full_name: e.target.value})} placeholder="Full Name *" className="input-field" />
                <input value={newAddr.phone} onChange={e => setNewAddr({...newAddr, phone: e.target.value})} placeholder="Phone *" className="input-field" />
                <input value={newAddr.address_line1} onChange={e => setNewAddr({...newAddr, address_line1: e.target.value})} placeholder="Address Line 1 *" className="input-field col-span-2" />
                <input value={newAddr.address_line2} onChange={e => setNewAddr({...newAddr, address_line2: e.target.value})} placeholder="Address Line 2" className="input-field col-span-2" />
                <input value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} placeholder="City *" className="input-field" />
                <input value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} placeholder="State *" className="input-field" />
                <input value={newAddr.pincode} onChange={e => setNewAddr({...newAddr, pincode: e.target.value})} placeholder="Pincode *" className="input-field" />
                <select value={newAddr.label} onChange={e => setNewAddr({...newAddr, label: e.target.value})} className="input-field">
                  <option>Home</option><option>Office</option><option>Other</option>
                </select>
                <button onClick={handleNewAddress} className="btn-primary col-span-2">Save Address</button>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Payment Method</h2>
            <div className="space-y-2">
              {[
                { val: 'cod', label: 'Cash on Delivery', desc: 'Pay when delivered' },
                { val: 'upi', label: 'UPI', desc: 'PhonePe / GPay / Paytm' },
                { val: 'card', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, RuPay' },
                { val: 'netbanking', label: 'Net Banking', desc: 'All major banks' },
              ].map(pm => (
                <label key={pm.val} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer ${paymentMethod === pm.val ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === pm.val} onChange={() => setPaymentMethod(pm.val)} />
                  <div><p className="font-medium text-sm">{pm.label}</p><p className="text-xs text-gray-500">{pm.desc}</p></div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Order Notes (Optional)</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." rows={3} className="input-field" />
          </div>
        </div>

        {/* Order Summary */}
        <div className="card p-6 h-fit sticky top-24">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm mb-4">
            {cart.items?.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-600 line-clamp-1">{item.product.name} × {item.quantity}</span>
                <span className="shrink-0 ml-2">₹{(item.product.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <hr className="my-3" />

          {/* Coupon */}
          <div className="flex gap-2 mb-4">
            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="input-field text-sm" />
            <button onClick={applyCoupon} className="btn-secondary text-sm !px-3 shrink-0">Apply</button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">GST (18%)</span><span>₹{tax.toLocaleString()}</span></div>
            <hr />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
          </div>

          <button onClick={placeOrder} disabled={submitting} className="btn-primary w-full mt-4">
            {submitting ? 'Placing Order...' : paymentMethod === 'cod' ? 'Place Order' : 'Proceed to Payment →'}
          </button>
        </div>
      </div>
    </div>
  );
}
