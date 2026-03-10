/**
 * PaymentPage.jsx — Gateway-Ready Payment Page
 *
 * CURRENT: Mock payment simulation (no real gateway SDK required).
 *
 * ┌─ TO INTEGRATE RAZORPAY ──────────────────────────────────────────────────┐
 * │ 1. Add to public/index.html:                                             │
 * │      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>│
 * │ 2. In handlePay(), after receiving `session` from initiatePayment:       │
 * │      const rzp = new window.Razorpay({                                   │
 * │        key:        session.key_id,          // from backend env var       │
 * │        amount:     session.amount,          // paise                      │
 * │        currency:   'INR',                                                │
 * │        order_id:   session.gateway_order_id,                             │
 * │        name:       'LedgerCart',                                         │
 * │        description: session.order_number,                                │
 * │        prefill:    { name: order.shipping_name,                          │
 * │                      contact: order.shipping_phone },                    │
 * │        handler: async (response) => {                                    │
 * │          // response contains razorpay_payment_id & razorpay_signature   │
 * │          await ordersAPI.verifyPayment(orderId, {                        │
 * │            gateway_order_id: session.gateway_order_id,                   │
 * │            transaction_id:   response.razorpay_payment_id,               │
 * │            signature:        response.razorpay_signature,                │
 * │          });                                                              │
 * │          navigate(`/orders/${orderId}`);                                 │
 * │        },                                                                │
 * │        modal: { ondismiss: () => setStep('ready') }                      │
 * │      });                                                                 │
 * │      rzp.open();   // <-- replaces the fake setTimeout block             │
 * │ 3. Delete the [Demo] "Simulate Failure" button in production             │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import {
  CreditCard, Smartphone, Building2,
  CheckCircle2, XCircle, Loader2, ShieldCheck, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

const METHOD_META = {
  upi:        { label: 'UPI Payment',   Icon: Smartphone },
  card:       { label: 'Card Payment',  Icon: CreditCard  },
  netbanking: { label: 'Net Banking',   Icon: Building2   },
};

export default function PaymentPage() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [order,   setOrder]   = useState(null);
  const [session, setSession] = useState(null);  // gateway session from /initiate
  const [step,    setStep]    = useState('loading'); // loading | ready | processing | success | failed
  const [txnId,   setTxnId]   = useState('');

  /* ─── Load order + initiate gateway session ─── */
  useEffect(() => {
    ordersAPI.get(orderId)
      .then(async r => {
        const ord = r.data;
        setOrder(ord);

        // Already paid (e.g. user refreshed after success)
        if (ord.payment_status === 'paid') {
          setStep('success');
          setTimeout(() => navigate(`/orders/${orderId}`), 2000);
          return;
        }

        // COD orders shouldn't land here
        if (ord.payment_method === 'cod') {
          navigate(`/orders/${orderId}`);
          return;
        }

        const sess = await ordersAPI.initiatePayment(orderId);
        setSession(sess.data);
        setStep('ready');
      })
      .catch(() => {
        toast.error('Failed to load payment details');
        navigate('/orders');
      });
  }, [orderId]);

  /* ─── Handle Pay button ─── */
  const handlePay = async () => {
    setStep('processing');
    try {
      // ── MOCK BLOCK ─────────────────────────────────────────────────────────
      // Replace everything between these two comments with the Razorpay block
      // described in the file header above. The verifyPayment call below stays.
      await new Promise(res => setTimeout(res, 1600)); // simulate network delay
      const mockTxnId = `TXN${Date.now()}`;
      // ───────────────────────────────────────────────────────────────────────

      // verifyPayment is the same for both mock and real gateway
      await ordersAPI.verifyPayment(orderId, {
        gateway_order_id: session.gateway_order_id,
        transaction_id:   mockTxnId,       // real: response.razorpay_payment_id
        // signature:     response.razorpay_signature,  // add for Razorpay
      });

      setTxnId(mockTxnId);
      setStep('success');
      toast.success('Payment successful!');
      setTimeout(() => navigate(`/orders/${orderId}`), 2500);
    } catch {
      setStep('failed');
      toast.error('Payment failed. Please try again.');
    }
  };

  /* ─── Demo: simulate failure ─── */
  const handleSimulateFailure = async () => {
    setStep('processing');
    await new Promise(res => setTimeout(res, 900));
    setStep('failed');
    toast.error('Payment declined (simulated).');
  };

  /* ─── Render helpers ─── */
  const { label: methodLabel, Icon: MethodIcon } =
    METHOD_META[order?.payment_method] || { label: 'Online Payment', Icon: CreditCard };

  if (step === 'loading') return <LoadingSpinner />;

  if (step === 'success') return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
      <p className="text-gray-500 mb-2">Your order has been confirmed.</p>
      {txnId && (
        <p className="text-xs text-gray-400 font-mono mt-1 mb-6 bg-gray-50 px-3 py-1 rounded inline-block">
          Txn ID: {txnId}
        </p>
      )}
      <p className="text-sm text-gray-400">Redirecting to your order…</p>
    </div>
  );

  if (step === 'failed') return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
      <p className="text-gray-500 mb-6">Your payment could not be processed. No amount was charged.</p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button onClick={() => setStep('ready')} className="btn-primary w-full">
          Try Again
        </button>
        <Link to={`/orders/${orderId}`} className="text-sm text-gray-500 hover:underline">
          View Order
        </Link>
      </div>
    </div>
  );

  /* ─── Main payment UI ─── */
  return (
    <div className="max-w-lg mx-auto px-4 py-10">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <MethodIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold">{methodLabel}</h1>
        <p className="text-sm text-gray-500 mt-1">Order #{order?.order_number}</p>
      </div>

      {/* Amount banner */}
      <div className="card p-6 mb-6 text-center bg-gradient-to-br from-primary-50 to-white border border-primary-100">
        <p className="text-sm text-gray-500 mb-1">Amount to Pay</p>
        <p className="text-5xl font-bold text-gray-900 tracking-tight">
          ₹{Number(order?.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>256-bit SSL encrypted &nbsp;•&nbsp; PCI-DSS compliant</span>
        </div>
      </div>

      {/* Order summary */}
      <div className="card p-5 mb-6 text-sm">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" /> Order Summary
        </h3>
        <div className="space-y-2">
          {order?.items?.map(item => (
            <div key={item.id} className="flex justify-between text-gray-600">
              <span className="line-clamp-1 mr-2">{item.product_name} × {item.quantity}</span>
              <span className="shrink-0 font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>₹{Number(order?.total).toLocaleString()}</span>
        </div>
      </div>

      {/* CTA */}
      {step === 'processing' ? (
        <button disabled className="btn-primary w-full py-3 flex items-center justify-center gap-2 opacity-80 text-base">
          <Loader2 className="w-5 h-5 animate-spin" /> Processing Payment…
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handlePay}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            <MethodIcon className="w-5 h-5" />
            Pay ₹{Number(order?.total).toLocaleString()}
          </button>

          {/* Demo-only: visible only when gateway = mock */}
          {session?.gateway === 'mock' && (
            <button
              onClick={handleSimulateFailure}
              className="w-full text-xs text-gray-400 hover:text-red-400 py-1 transition-colors"
            >
              [Demo] Simulate Payment Failure
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6">
        Having trouble?{' '}
        <Link to={`/orders/${orderId}`} className="text-primary-600 hover:underline">View order</Link>
        {' '}or{' '}
        <Link to="/contact" className="text-primary-600 hover:underline">contact support</Link>
      </p>
    </div>
  );
}
