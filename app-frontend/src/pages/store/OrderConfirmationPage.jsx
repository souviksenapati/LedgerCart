import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import { CheckCircle, Package } from 'lucide-react';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { ordersAPI.get(orderId).then(r => setOrder(r.data)).finally(() => setLoading(false)); }, [orderId]);

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-16"><p>Order not found</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-8">Thank you for your order. We'll send you updates on your order status.</p>

      <div className="card p-6 text-left">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="font-bold text-lg">{order.order_number}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="space-y-3 border-t pt-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.product_name} × {item.quantity}</span>
              <span className="font-medium">₹{item.total.toLocaleString()}</span>
            </div>
          ))}
          <hr />
          <div className="flex justify-between font-bold"><span>Total</span><span>₹{order.total.toLocaleString()}</span></div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Delivery to:</strong> {order.shipping_name}, {order.shipping_address1}, {order.shipping_city} - {order.shipping_pincode}</p>
          <p><strong>Payment:</strong> {order.payment_method.toUpperCase()}</p>
        </div>
      </div>

      <div className="flex gap-4 justify-center mt-8">
        <Link to="/orders" className="btn-primary flex items-center gap-2"><Package className="w-4 h-4" /> View Orders</Link>
        <Link to="/shop" className="btn-secondary">Continue Shopping</Link>
      </div>
    </div>
  );
}
