import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Users, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.dashboard()
      .then(res => setStats(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: 'Total Revenue', value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'bg-green-500', link: '/admin/reports' },
    { label: 'Total Orders', value: stats?.total_orders || 0, icon: ShoppingCart, color: 'bg-blue-500', link: '/admin/orders' },
    { label: 'Total Products', value: stats?.total_products || 0, icon: Package, color: 'bg-purple-500', link: '/admin/products' },
    { label: 'Total Customers', value: stats?.total_customers || 0, icon: Users, color: 'bg-primary-500', link: '/admin/customers' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your store today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map(c => (
          <Link key={c.label} to={c.link} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{c.label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{c.value}</p>
              </div>
              <div className={`${c.color} text-white p-4 rounded-xl shadow-lg`}>
                <c.icon className="w-7 h-7" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          {stats?.recent_orders?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">#{o.order_number}</p>
                    <p className="text-xs text-gray-500">{o.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{o.total?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                      }`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No orders yet</p>}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary-500" /> Low Stock Alerts</h2>
            <Link to="/admin/inventory" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          {stats?.low_stock_list?.length > 0 ? (
            <div className="space-y-3">
              {stats.low_stock_list.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category || 'Uncategorized'}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">{p.stock} left</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">All stock levels are healthy</p>}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Pending Orders', value: stats?.pending_orders || 0, color: 'text-yellow-600' },
          { label: 'Today\'s Orders', value: stats?.today_orders || 0, color: 'text-blue-600' },
          { label: 'Pending Reviews', value: stats?.pending_reviews || 0, color: 'text-purple-600' },
          { label: 'Active Coupons', value: stats?.active_coupons || 0, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
