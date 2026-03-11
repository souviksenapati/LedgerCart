import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import { Package, MapPin, CreditCard, Truck, CheckCircle2, XCircle, RotateCcw, Clock, Cog, ShoppingBag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ORDER_STEPS = [
  { key: 'pending',    label: 'Order Placed',  Icon: ShoppingBag },
  { key: 'confirmed',  label: 'Confirmed',      Icon: CheckCircle2 },
  { key: 'processing', label: 'Processing',     Icon: Cog },
  { key: 'shipped',    label: 'Shipped',        Icon: Truck },
  { key: 'delivered',  label: 'Delivered',      Icon: Package },
];
const STEP_INDEX = { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4 };

function OrderTimeline({ status, paymentStatus }) {
  if (status === 'cancelled') return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 text-red-600">
        <XCircle className="w-6 h-6" />
        <span className="font-semibold text-lg">Order Cancelled</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        {paymentStatus === 'refunded'
          ? 'Your order has been cancelled. A refund has been initiated and should reflect in your account within 5–7 business days.'
          : paymentStatus === 'paid'
          ? 'Your order has been cancelled. A refund will be processed within 5–7 business days.'
          : 'Your order has been cancelled. No payment was charged.'}
      </p>
    </div>
  );
  if (status === 'returned') return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 text-orange-600">
        <RotateCcw className="w-6 h-6" />
        <span className="font-semibold text-lg">Order Returned</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">Your return has been received. A refund will be processed within 5–7 business days.</p>
    </div>
  );

  const currentIndex = STEP_INDEX[status] ?? 0;

  return (
    <div className="card p-6 mb-6">
      <h2 className="font-bold text-lg mb-5">Order Progress</h2>
      <div className="relative">
        {/* connector line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 mx-5" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary-500 mx-5 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (ORDER_STEPS.length - 1)) * 100}% - ${currentIndex === ORDER_STEPS.length - 1 ? '0px' : '0px'})` }}
        />
        <div className="relative flex justify-between">
          {ORDER_STEPS.map((step, idx) => {
            const done    = idx < currentIndex;
            const active  = idx === currentIndex;
            const pending = idx > currentIndex;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                  done   ? 'bg-primary-500 border-primary-500 text-white' :
                  active ? 'bg-white border-primary-500 text-primary-600 shadow-md' :
                           'bg-white border-gray-300 text-gray-300'
                }`}>
                  <step.Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs text-center font-medium ${
                  done || active ? 'text-gray-800' : 'text-gray-400'
                }`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const CANCEL_REASONS = [
    'I changed my mind',
    'I ordered by mistake',
    'I found a better price elsewhere',
    'Delivery time is too long',
    'I want to change the delivery address',
    'I want to change the payment method',
    'Duplicate order placed',
    'Other',
  ];

  useEffect(() => {
    ordersAPI.get(id)
      .then(r => setOrder(r.data))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  const cancelOrder = async () => {
    const finalReason = cancelReason === 'Other' ? (cancelOther.trim() || 'Other') : cancelReason;
    if (!finalReason) { toast.error('Please select a reason'); return; }
    setCancelling(true);
    try {
      await ordersAPI.cancel(id, finalReason);
      toast.success('Order cancelled successfully');
      setOrder({ ...order, status: 'cancelled', payment_status: order.payment_status === 'paid' ? 'refunded' : order.payment_status });
      setCancelModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <h2 className="text-xl font-bold text-gray-600">Order not found</h2>
      <Link to="/orders" className="btn-primary inline-block mt-4">Back to Orders</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/orders" className="text-primary-600 hover:underline mb-2 inline-block">← Back to Orders</Link>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      {/* Order Progress Timeline */}
      <OrderTimeline status={order.status} paymentStatus={order.payment_status} />

      {/* Order Items */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Order Items
        </h2>
        <div className="space-y-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
              <img 
                src={item.product?.images?.find(i => i.is_primary)?.image_url || item.product?.images?.[0]?.image_url || 'https://placehold.co/100x100/EEE/999?text=No+Image'} 
                alt={item.product_name}
                className="w-20 h-20 object-cover rounded border bg-gray-50"
              />
              <div className="flex-1">
                {item.product?.slug
                  ? <Link to={`/product/${item.product.slug}`} className="font-medium hover:text-primary-600">{item.product_name}</Link>
                  : <p className="font-medium">{item.product_name}</p>
                }
                <p className="text-sm text-gray-500 mt-1">SKU: {item.product_sku}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Delivery Address */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Delivery Address
          </h2>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{order.shipping_name}</p>
            <p className="mt-1">{order.shipping_address1}</p>
            {order.shipping_address2 && <p>{order.shipping_address2}</p>}
            <p>{order.shipping_city}, {order.shipping_state} — {order.shipping_pincode}</p>
            <p className="mt-1">📞 {order.shipping_phone}</p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{Number(order.subtotal)?.toLocaleString()}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{Number(order.discount_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">{order.shipping_charge > 0 ? `₹${Number(order.shipping_charge).toLocaleString()}` : 'Free'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST (18%)</span>
              <span className="font-medium">₹{Number(order.tax_amount)?.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{Number(order.total).toLocaleString()}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-600">Payment Method</p>
              <p className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</p>
              <p className={`text-xs mt-1 font-medium ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.payment_status?.charAt(0).toUpperCase() + order.payment_status?.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Timeline / Tracking */}
      {order.tracking_number && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" /> Tracking Information
          </h2>
          <p className="text-sm text-gray-600">Tracking Number: <span className="font-mono font-medium">{order.tracking_number}</span></p>
        </div>
      )}

      {/* Actions */}
      {(order.status === 'pending' || order.status === 'confirmed') && (
        <div className="flex justify-end">
          <button onClick={() => { setCancelReason(''); setCancelOther(''); setCancelModal(true); }}
            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            Cancel Order
          </button>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900">Cancel Order</h2>
                  <p className="text-xs text-gray-400">{order.order_number}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Please tell us why you want to cancel. This helps us serve you better.
              </p>
            </div>

            {/* Reasons */}
            <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
              {CANCEL_REASONS.map(r => (
                <label key={r} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                  cancelReason === r ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r}
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
              {cancelReason === 'Other' && (
                <textarea
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mt-1"
                  rows={3}
                  placeholder="Please describe your reason…"
                  value={cancelOther}
                  onChange={e => setCancelOther(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {/* Refund note for paid orders */}
            {order.payment_status === 'paid' && (
              <div className="mx-5 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                <span className="text-lg leading-none">ℹ️</span>
                <span>Since this order is paid, a refund will be initiated within 5–7 business days after cancellation.</span>
              </div>
            )}

            {/* Actions */}
            <div className="p-5 border-t flex gap-3">
              <button
                onClick={() => setCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
                Keep Order
              </button>
              <button
                onClick={cancelOrder}
                disabled={!cancelReason || cancelling}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
