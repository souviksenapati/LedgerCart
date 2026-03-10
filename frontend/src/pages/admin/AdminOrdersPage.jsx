import { useState, useEffect } from 'react';
import { Eye, Search, Truck, X, ChevronRight } from 'lucide-react';
import { ordersAPI } from '../../api';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

const STATUSES = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// Which status can move to which next status (linear flow)
const NEXT_STATUSES = {
  pending:    [{ value: 'confirmed',  label: 'Confirm Order' }],
  confirmed:  [{ value: 'processing', label: 'Mark Processing' }],
  processing: [{ value: 'shipped',    label: 'Mark Shipped' }],
  shipped:    [{ value: 'delivered',  label: 'Mark Delivered' }],
};

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [selected, setSelected] = useState(null);
  // Ship-modal state (tracking number prompt)
  const [shipModal, setShipModal]         = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [updating, setUpdating]           = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    const params = { page, page_size: 15 };
    if (status !== 'all') params.status = status;
    if (search.trim()) params.search = search.trim();
    ordersAPI.allOrders(params)
      .then(r => {
        setOrders(r.data.orders || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, status]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchOrders(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const updateStatus = async (orderId, newStatus, trackingNumber = '') => {
    setUpdating(true);
    try {
      const payload = { status: newStatus };
      if (trackingNumber) payload.tracking_number = trackingNumber;
      const res = await ordersAPI.updateStatus(orderId, payload);
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
      // Use functional updater: 'current' is the LIVE state at the time this runs.
      // If the modal was closed (setSelected(null) ran), current=null → keep null (don't reopen).
      // If the modal is still showing this order → replace with full fresh API data.
      setSelected(current => {
        if (!current || current.id !== orderId) return current;
        return res.data;  // full updated order from API response
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setUpdating(false);
      setShipModal(null);
      setTrackingInput('');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Cancel this order? Stock will be restored.')) return;
    try {
      // Use admin updateStatus endpoint (not customer /cancel) so admin can cancel at any stage
      const res = await ordersAPI.updateStatus(orderId, { status: 'cancelled' });
      toast.success('Order cancelled and stock restored');
      fetchOrders();
      // Same safe pattern: if modal is still open for this order, refresh with full data
      setSelected(current => {
        if (!current || current.id !== orderId) return current;
        return res.data;
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel this order');
    }
  };

  const handleStatusAction = (order, nextStatus) => {
    if (nextStatus === 'shipped') {
      // Prompt for tracking number before confirming ship
      setShipModal({ orderId: order.id, orderNumber: order.order_number, nextStatus });
      setTrackingInput('');
    } else {
      updateStatus(order.id, nextStatus);
    }
  };

  const customerName = (o) => {
    if (o.user?.first_name) return `${o.user.first_name} ${o.user.last_name || ''}`.trim();
    return o.shipping_name || '—';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">E-Commerce Orders</h1>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${
              status === s ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search by order#, name, phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Order #</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Items</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Payment</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const nextActions = NEXT_STATUSES[o.status] || [];
                return (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">#{o.order_number}</td>
                    <td className="p-3">
                      <div className="font-medium">{customerName(o)}</div>
                      <div className="text-xs text-gray-400">{o.user?.email || o.shipping_phone || ''}</div>
                    </td>
                    <td className="p-3">{o.items?.length || 0} {o.items?.length === 1 ? 'item' : 'items'}</td>
                    <td className="p-3 font-medium">₹{Number(o.total).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="text-xs capitalize">{o.payment_method}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{o.payment_status}</span>
                    </td>
                    <td className="p-3"><StatusBadge status={o.status} /></td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setSelected(o)} title="View Details"
                          className="p-1 text-gray-400 hover:text-blue-500 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <PermissionGuard permission="ecom_orders:manage">
                          {nextActions.map(a => (
                            <button key={a.value}
                              onClick={() => handleStatusAction(o, a.value)}
                              disabled={updating}
                              className="flex items-center gap-0.5 text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded">
                              {a.value === 'shipped' ? <Truck className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {a.label}
                            </button>
                          ))}
                          {o.status !== 'delivered' && o.status !== 'cancelled' && (
                            <button onClick={() => cancelOrder(o.id)} disabled={updating}
                              className="p-1 text-gray-400 hover:text-red-500 rounded" title="Cancel Order">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && <p className="p-6 text-center text-gray-400">No orders found</p>}
          {total > 15 && (
            <div className="flex justify-between items-center p-4 border-t text-sm">
              <span className="text-gray-500">{total} total orders</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                <span className="px-3 py-1">Page {page} / {Math.ceil(total / 15)}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}
                  className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ship Modal — prompts for tracking number */}
      {shipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" /> Mark Shipped
            </h2>
            <p className="text-sm text-gray-600">Order #{shipModal.orderNumber}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number <span className="text-gray-400">(optional)</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. EZ123456789IN"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && updateStatus(shipModal.orderId, shipModal.nextStatus, trackingInput)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShipModal(null); setTrackingInput(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => updateStatus(shipModal.orderId, shipModal.nextStatus, trackingInput)}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {updating ? 'Saving…' : 'Confirm Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order #{selected.order_number}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-1">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{customerName(selected)}</span>
                {selected.user?.email && (
                  <><span className="text-gray-500">Email</span><span>{selected.user.email}</span></>
                )}
                <span className="text-gray-500">Phone</span>
                <span>{selected.shipping_phone || selected.user?.phone || '—'}</span>
              </div>

              <hr />

              {/* Order Meta */}
              <div className="grid grid-cols-2 gap-1">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={selected.status} />
                <span className="text-gray-500">Payment Method</span>
                <span className="capitalize">{selected.payment_method}</span>
                <span className="text-gray-500">Payment Status</span>
                <span className={`font-medium ${selected.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {selected.payment_status}
                </span>
                <span className="text-gray-500">Date</span>
                <span>{new Date(selected.created_at).toLocaleString()}</span>
                {selected.tracking_number && (
                  <><span className="text-gray-500">Tracking #</span><span className="font-mono">{selected.tracking_number}</span></>
                )}
              </div>

              <hr />

              {/* Shipping Address */}
              <h3 className="font-semibold">Shipping Address</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {selected.shipping_name}<br />
                {selected.shipping_address1}
                {selected.shipping_address2 && <>, {selected.shipping_address2}</>}<br />
                {selected.shipping_city}, {selected.shipping_state} – {selected.shipping_pincode}
              </p>

              <hr />

              {/* Items */}
              <h3 className="font-semibold">Items</h3>
              <div className="space-y-2">
                {selected.items?.map((item, i) => {
                  const img = item.product?.images?.find(im => im.is_primary)?.image_url
                           || item.product?.images?.[0]?.image_url;
                  return (
                    <div key={i} className="flex items-center gap-3 py-1">
                      {img ? (
                        <img src={img} alt={item.product_name} className="w-10 h-10 object-cover rounded border" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-300 text-xs">N/A</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product_name}</div>
                        <div className="text-xs text-gray-400">SKU: {item.product_sku} × {item.quantity}</div>
                      </div>
                      <span className="font-medium whitespace-nowrap">₹{Number(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <hr />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{Number(selected.subtotal).toLocaleString()}</span>
                </div>
                {Number(selected.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{Number(selected.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax (GST 18%)</span>
                  <span>₹{Number(selected.tax_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{Number(selected.shipping_charge) === 0 ? 'Free' : `₹${Number(selected.shipping_charge).toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Total</span>
                  <span>₹{Number(selected.total).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <PermissionGuard permission="ecom_orders:manage">
                {(() => {
                  const nextActions = NEXT_STATUSES[selected.status] || [];
                  const canCancel = selected.status !== 'delivered' && selected.status !== 'cancelled';
                  return (nextActions.length > 0 || canCancel) ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {nextActions.map(a => (
                        <button key={a.value}
                          onClick={() => { handleStatusAction(selected, a.value); setSelected(null); }}
                          disabled={updating}
                          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                          {a.value === 'shipped' ? <Truck className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {a.label}
                        </button>
                      ))}
                      {canCancel && (
                        <button onClick={() => { cancelOrder(selected.id); setSelected(null); }}
                          disabled={updating}
                          className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50">
                          <X className="w-4 h-4" /> Cancel Order
                        </button>
                      )}
                    </div>
                  ) : null;
                })()}
              </PermissionGuard>
            </div>
            <button onClick={() => setSelected(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
