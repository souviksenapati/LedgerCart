import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => { ordersAPI.myOrders({ page_size: 50 }).then(r => setOrders(r.data.orders)).finally(() => setLoading(false)); };
  useEffect(() => { fetchOrders(); }, []);

  const cancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return;
    try { await ordersAPI.cancel(id); toast.success('Order cancelled'); fetchOrders(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to cancel'); }
  };

  if (loading) return <LoadingSpinner />;
  if (!orders.length) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <EmptyState icon={Package} title="No orders yet" message="Start shopping to see your orders here." action={<Link to="/shop" className="btn-primary">Shop Now</Link>} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="card p-4">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div>
                <p className="font-bold">{order.order_number}</p>
                <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Order:</span>
                  <StatusBadge status={order.status} />
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Payment:</span>
                  <StatusBadge status={order.payment_status} />
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              {order.items?.slice(0, 3).map(i => <span key={i.id} className="mr-2">{i.product_name} × {i.quantity}</span>)}
              {order.items?.length > 3 && <span className="text-gray-400">+{order.items.length - 3} more</span>}
            </div>
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">₹{order.total.toLocaleString()}</p>
              <div className="flex gap-2">
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button onClick={() => cancelOrder(order.id)} className="text-sm text-red-600 hover:underline">Cancel</button>
                )}
                <Link to={`/orders/${order.id}`} className="text-sm text-primary-600 hover:underline">View Details →</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
