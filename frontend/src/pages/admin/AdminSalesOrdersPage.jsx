import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Eye, Printer, X, Truck } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import PrintDownloadMenu from '../../components/PrintDownloadMenu';
import { generateSalesOrderPDF } from '../../utils/pdfGenerator';

export default function AdminSalesOrdersPage() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    order_number: '',
    customer_id: null,
    quotation_id: null,
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: 'cash',
    gst_type: 'cgst_sgst',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    notes: '',
    terms_conditions: '',
    items: [{ product_id: null, quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
  });

  useEffect(() => {
    fetchOrders();

    // Check for incoming quotation data
    if (location.state?.fromQuotation) {
      const q = location.state.fromQuotation;
      setFormData(prev => ({
        ...prev,
        quotation_id: q.quotation_id,
        customer_id: q.customer_id,
        gst_type: q.gst_type,
        notes: q.notes,
        items: q.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_percentage: item.tax_percentage
        }))
      }));
      setShowForm(true);
      // Clear state to prevent re-triggering on reload
      window.history.replaceState({}, document.title);
    }
  }, [statusFilter, location.state]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/sales/orders', { params });
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load sales orders');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.order_number.trim()) {
      toast.error('Please enter order number');
      return;
    }
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const data = {
        ...formData,
        order_number: formData.order_number.toUpperCase()
      };
      await api.post('/sales/orders', data);
      toast.success('Sales order created successfully! Stock has been reserved.');
      setShowForm(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create sales order');
    }
  };

  const generateInvoice = async (orderId) => {
    try {
      // Here you would call an API to convert order to invoice
      // For now, just update status
      await api.put(`/sales/orders/${orderId}`, { status: 'processing' });
      toast.success('Order confirmed! You can now generate invoice.');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order status');
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      customer_id: null,
      quotation_id: null,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_terms: 'cash',
      gst_type: 'cgst_sgst',
      discount_percentage: 0,
      freight_charges: 0,
      other_charges: 0,
      notes: '',
      terms_conditions: '',
      items: [{ product_id: null, quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: null, quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    setFormData({ ...formData, items });
  };

  const calculateTotals = () => {
    let subtotalGross = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;
    let lineTaxableTotal = 0;

    formData.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const itemDiscPct = parseFloat(item.discount_percentage) || 0;
      const itemTaxPct = parseFloat(item.tax_percentage) || 18;

      if (item.product_id && qty > 0) {
        const lineGross = qty * price;
        const lineDiscount = lineGross * (itemDiscPct / 100);
        const lineTaxable = lineGross - lineDiscount;
        const lineTax = lineTaxable * (itemTaxPct / 100);

        subtotalGross += lineGross;
        totalLineDiscount += lineDiscount;
        lineTaxableTotal += lineTaxable;
        totalTax += lineTax;
      }
    });

    const globalDiscountAmount = lineTaxableTotal * (parseFloat(formData.discount_percentage) || 0) / 100;
    const taxableAmount = lineTaxableTotal - globalDiscountAmount + parseFloat(formData.freight_charges || 0) + parseFloat(formData.other_charges || 0);

    let cgst = 0, sgst = 0, igst = 0;

    if (formData.gst_type === 'cgst_sgst') {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    } else {
      igst = totalTax;
    }

    const totalBeforeRound = taxableAmount + totalTax;
    const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
    const total = Math.round(totalBeforeRound);

    return {
      subtotal: subtotalGross,
      discountAmount: totalLineDiscount + globalDiscountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      roundOff,
      total
    };
  };

  const totals = calculateTotals();

  const filteredOrders = orders.filter(ord =>
    ord.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ord.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchCustomers = async (query) => {
    const res = await api.get('/b2b-customers/search', { params: { q: query } });
    return res.data.map(c => ({ value: c.id, label: c.label || `${c.name} (${c.customer_code})` }));
  };

  const fetchProducts = async (query) => {
    const res = await api.get('/products', { params: { search: query, limit: 20 } });
    return res.data.products.map(p => ({
      value: p.id,
      label: `${p.name} - ${p.sku} (Stock: ${p.stock})`,
      price: p.price || 0
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Orders</h1>
          <p className="text-sm text-gray-600">Manage confirmed customer orders</p>
        </div>
        <PermissionGuard permission="sales_orders:manage">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Order
          </button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Order #</th>
              <th className="text-left p-4 font-medium text-gray-700">Customer</th>
              <th className="text-left p-4 font-medium text-gray-700">Order Date</th>
              <th className="text-left p-4 font-medium text-gray-700">Expected Delivery</th>
              <th className="text-right p-4 font-medium text-gray-700">Total Amount</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              <th className="text-center p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No sales orders found</td></tr>
            ) : (
              filteredOrders.map(ord => (
                <tr key={ord.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{ord.order_number}</td>
                  <td className="p-4">{ord.customer?.name || '-'}</td>
                  <td className="p-4">{new Date(ord.order_date).toLocaleDateString()}</td>
                  <td className="p-4">{ord.expected_delivery_date ? new Date(ord.expected_delivery_date).toLocaleDateString() : '-'}</td>
                  <td className="p-4 text-right font-semibold">₹{parseFloat(ord.total || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ord.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      ord.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        ord.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                          ord.status === 'confirmed' ? 'bg-primary-100 text-primary-700' :
                            ord.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                      }`}>
                      {ord.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedOrder(ord)} className="text-blue-600 hover:text-blue-800" title="View">
                        <Eye className="w-5 h-5" />
                      </button>
                      <PermissionGuard permission="sales_orders:export">
                        <PrintDownloadMenu
                          documentGenerator={() => generateSalesOrderPDF(ord)}
                          fileName={`SO-${ord.order_number}.pdf`}
                        />
                      </PermissionGuard>
                      {ord.status === 'confirmed' && (
                        <PermissionGuard permission="sales_invoices:manage">
                          <button
                            onClick={() => generateInvoice(ord.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Generate Invoice"
                          >
                            <Truck className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">Create Sales Order</h2>
              <button onClick={() => setShowForm(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Number *</label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <SearchableDropdown
                    fetchOptions={fetchCustomers}
                    placeholder="Select customer"
                    onSelect={(option) => setFormData({ ...formData, customer_id: option.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="input w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days</option>
                    <option value="net_60">Net 60 Days</option>
                    <option value="net_90">Net 90 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label>
                  <select
                    value={formData.gst_type}
                    onChange={(e) => setFormData({ ...formData, gst_type: e.target.value })}
                    className="input w-full"
                  >
                    <option value="cgst_sgst">CGST + SGST (Intra-State)</option>
                    <option value="igst">IGST (Inter-State)</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800">Order Items</h3>
                  <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    + Add Item
                  </button>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Product</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Qty</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Price</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Disc %</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Tax %</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Total</th>
                        <th className="text-center p-3 text-sm font-medium text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => {
                        const lineSubtotal = item.quantity * item.unit_price;
                        const lineDiscount = lineSubtotal * (item.discount_percentage / 100);
                        const taxableAmount = lineSubtotal - lineDiscount;
                        const taxAmount = taxableAmount * (item.tax_percentage / 100);
                        const lineTotal = taxableAmount + taxAmount;

                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              <SearchableDropdown
                                fetchOptions={fetchProducts}
                                placeholder="Select product"
                                onSelect={(option) => {
                                  updateItem(index, 'product_id', option.value);
                                  updateItem(index, 'unit_price', option.price || 0);
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                                className="input w-20 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input w-28 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.discount_percentage}
                                onChange={(e) => updateItem(index, 'discount_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input w-20 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.tax_percentage}
                                onChange={(e) => updateItem(index, 'tax_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input w-20 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <div className="text-sm font-semibold text-gray-900 py-2">₹{lineTotal.toFixed(2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              {formData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Charges & Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Freight Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.freight_charges}
                      onChange={(e) => setFormData({ ...formData, freight_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.other_charges}
                      onChange={(e) => setFormData({ ...formData, other_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount ({formData.discount_percentage}%):</span>
                        <span className="font-medium">-₹{totals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {formData.freight_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Freight:</span>
                        <span className="font-medium">₹{parseFloat(formData.freight_charges).toFixed(2)}</span>
                      </div>
                    )}
                    {formData.other_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Other Charges:</span>
                        <span className="font-medium">₹{parseFloat(formData.other_charges).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      {formData.gst_type === 'cgst_sgst' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CGST (9%):</span>
                            <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">SGST (9%):</span>
                            <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600">IGST (18%):</span>
                          <span className="font-medium">₹{totals.igst.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Round Off:</span>
                        <span className={`font-medium ${totals.roundOff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-primary-700 border-t-2 pt-2">
                      <span>Total Amount:</span>
                      <span>₹{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input w-full"
                    rows="3"
                    placeholder="Internal notes..."
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    className="input w-full"
                    rows="3"
                    placeholder="Order terms, delivery conditions..."
                  ></textarea>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Sales Order — {selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedOrder.customer?.name || '-'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-700' : selectedOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{selectedOrder.status?.toUpperCase()}</span></div>
              <div><span className="text-gray-500">Order Date:</span> <span className="font-medium">{new Date(selectedOrder.order_date).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Expected Delivery:</span> <span className="font-medium">{selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString() : '-'}</span></div>
              <div><span className="text-gray-500">Payment Terms:</span> <span className="font-medium">{selectedOrder.payment_terms || '-'}</span></div>
              <div><span className="text-gray-500">GST Type:</span> <span className="font-medium">{selectedOrder.gst_type?.toUpperCase() || '-'}</span></div>
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-2">Product</th><th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Unit Price</th><th className="text-right p-2">Total</th>
                </tr></thead>
                <tbody>{(selectedOrder.items || []).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{item.product?.name || item.product_id}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold">₹{parseFloat(item.line_total || item.unit_price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex justify-between text-lg font-bold text-blue-700 border-t pt-3">
              <span>Total</span><span>₹{parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
            </div>
            {selectedOrder.notes && <p className="text-sm text-gray-500 mt-3"><span className="font-medium">Notes:</span> {selectedOrder.notes}</p>}
            {selectedOrder.terms_conditions && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Terms:</span> {selectedOrder.terms_conditions}</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
