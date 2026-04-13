import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Printer, X, CheckCircle } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import PrintDownloadMenu from '../../components/PrintDownloadMenu';
import { generateSalesQuotationPDF } from '../../utils/pdfGenerator';

export default function AdminSalesQuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    customer_code: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: ''
  });
  const [formData, setFormData] = useState({
    quotation_number: '',
    customer_id: null,
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    gst_type: 'cgst_sgst',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    notes: '',
    terms_conditions: '',
    items: [{ product_id: null, quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
  });

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/sales/quotations', { params });
      setQuotations(res.data);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
      toast.error('Failed to load sales quotations');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.quotation_number.trim()) {
      toast.error('Please enter quotation number');
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
      // Clean up data: convert empty/null values to proper nulls for optional date fields
      const cleanedData = {
        ...formData,
        quotation_number: formData.quotation_number.toUpperCase(),
        valid_until: formData.valid_until || null,
        customer_id: formData.customer_id || null
      };

      await api.post('/sales/quotations', cleanedData);
      toast.success('Sales quotation created successfully!');
      setShowForm(false);
      resetForm();
      fetchQuotations();
    } catch (error) {
      console.error('Failed to create quotation:', error);
      console.error('Error response:', error.response?.data);

      // Handle validation errors properly
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          const errorMsg = detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          toast.error(`Validation Error: ${errorMsg}`);
        } else {
          toast.error(detail);
        }
      } else {
        toast.error(error.response?.data?.detail || 'Failed to create sales quotation');
      }
    }
  };

  const convertToOrder = async (quotationId) => {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;

    if (!confirm('Convert this quotation to a sales order?')) return;

    try {
      await api.put(`/sales/quotations/${quotationId}`, { status: 'accepted' });
      toast.success('Quotation accepted!');

      // Navigate to Sales Order page with quotation data
      navigate('/admin/sales-orders', {
        state: {
          fromQuotation: {
            quotation_id: quotation.id,
            customer_id: quotation.customer_id,
            items: quotation.items,
            gst_type: quotation.gst_type,
            notes: `Converted from Quotation: ${quotation.quotation_number}`
          }
        }
      });
    } catch (error) {
      console.error('Failed to convert quotation:', error);
      toast.error('Failed to convert quotation');
    }
  };

  const resetForm = () => {
    setFormData({
      quotation_number: '',
      customer_id: null,
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    const charges = parseFloat(formData.freight_charges || 0) + parseFloat(formData.other_charges || 0);
    const taxableAmount = lineTaxableTotal - globalDiscountAmount + charges;

    const cgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const sgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const igst = formData.gst_type === 'igst' ? totalTax : 0;

    const totalBeforeRound = taxableAmount + totalTax;
    const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
    const total = Math.round(totalBeforeRound);
    const effectiveTaxRate = lineTaxableTotal > 0 ? (totalTax / lineTaxableTotal) * 100 : 0;

    return {
      subtotal: subtotalGross,
      discountAmount: totalLineDiscount + globalDiscountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      roundOff,
      total,
      effectiveTaxRate
    };
  };

  const totals = calculateTotals();

  const filteredQuotations = quotations.filter((quot) => {
    const query = searchTerm.toLowerCase();
    const quotationNumber = (quot.quotation_number || '').toLowerCase();
    const customerName = (quot.customer?.name || '').toLowerCase();
    return quotationNumber.includes(query) || customerName.includes(query);
  });

  const fetchCustomers = async (query) => {
    const res = await api.get('/b2b-customers/search', { params: { q: query } });
    return res.data.map((customer) => ({
      value: customer.id,
      label: customer.label || `${customer.name} (${customer.customer_code})`
    }));
  };

  const fetchProducts = async (query) => {
    const res = await api.get('/products', { params: { search: query, page_size: 20 } });
    return res.data.products.map(p => ({
      value: p.id,
      label: `${p.name} - ${p.sku} (Stock: ${p.stock})`,
      price: p.price || 0
    }));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b-customers', newCustomer);

      toast.success('Customer created successfully!');

      // Auto-select new customer
      setFormData({ ...formData, customer_id: res.data.id });
      setNewCustomer({
        name: '', customer_code: '', contact_person: '', email: '', phone: '',
        address_line1: '', city: '', state: '', pincode: '', gst_number: ''
      });
      setShowCustomerForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    }
  };

  const handleUpdateQuotationStatus = async (quotationId, status) => {
    try {
      await api.put(`/sales/quotations/${quotationId}`, { status });
      toast.success('Quotation status updated');
      fetchQuotations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Quotations</h1>
          <p className="text-sm text-gray-600">Create and manage customer quotations</p>
        </div>
        <PermissionGuard permission="sales_quotations:manage">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Quotation
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
              placeholder="Search by quotation number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Quotation #</th>
              <th className="text-left p-4 font-medium text-gray-700">Customer</th>
              <th className="text-left p-4 font-medium text-gray-700">Date</th>
              <th className="text-left p-4 font-medium text-gray-700">Valid Until</th>
              <th className="text-right p-4 font-medium text-gray-700">Total Amount</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              <th className="text-center p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredQuotations.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No sales quotations found</td></tr>
            ) : (
              filteredQuotations.map(quot => (
                <tr key={quot.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{quot.quotation_number}</td>
                  <td className="p-4">{quot.customer?.name || '-'}</td>
                  <td className="p-4">{new Date(quot.quotation_date).toLocaleDateString()}</td>
                  <td className="p-4">{quot.valid_until ? new Date(quot.valid_until).toLocaleDateString() : '-'}</td>
                  <td className="p-4 text-right font-semibold">₹{parseFloat(quot.total || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <PermissionGuard
                      permission="sales_quotations:manage"
                      fallback={
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${quot.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          quot.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            quot.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              quot.status === 'expired' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                          }`}>
                          {(quot.status || 'draft').toUpperCase()}
                        </span>
                      }
                    >
                      <select
                        value={quot.status || 'draft'}
                        onChange={(e) => handleUpdateQuotationStatus(quot.id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="draft">DRAFT</option>
                        <option value="sent">SENT</option>
                        <option value="accepted">ACCEPTED</option>
                        <option value="rejected">REJECTED</option>
                        <option value="expired">EXPIRED</option>
                      </select>
                    </PermissionGuard>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button type="button" onClick={() => setSelectedQuotation(quot)} className="text-blue-600 hover:text-blue-800" title="View">
                        <Eye className="w-5 h-5" />
                      </button>
                      <PermissionGuard permission="sales_quotations:export">
                        <PrintDownloadMenu
                          documentGenerator={() => generateSalesQuotationPDF(quot)}
                          fileName={`Quotation-${quot.quotation_number}.pdf`}
                        />
                      </PermissionGuard>
                      {quot.status === 'sent' && (
                        <PermissionGuard permission="sales_quotations:manage">
                          <button
                            onClick={() => convertToOrder(quot.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Convert to Order"
                          >
                            <CheckCircle className="w-5 h-5" />
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

      {/* Create Quotation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">Create Sales Quotation</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number *</label>
                  <input
                    type="text"
                    value={formData.quotation_number}
                    onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                    <span>Customer *</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerForm(true)}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                      title="Add new customer"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </label>
                  <SearchableDropdown
                    fetchOptions={fetchCustomers}
                    placeholder="Select customer"
                    onSelect={(option) => setFormData({ ...formData, customer_id: option.value })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date *</label>
                  <input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800">Quotation Items</h3>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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

                {/* Quotation Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Quotation Summary</h4>
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
                            <span className="text-gray-600">CGST ({(totals.effectiveTaxRate / 2).toFixed(2)}%):</span>
                            <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">SGST ({(totals.effectiveTaxRate / 2).toFixed(2)}%):</span>
                            <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600">IGST ({totals.effectiveTaxRate.toFixed(2)}%):</span>
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
                    <div className="flex justify-between text-lg font-bold text-blue-700 border-t-2 pt-2">
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
                    placeholder="Quotation terms, validity, conditions..."
                  ></textarea>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Quick Add Customer</h2>
                <button
                  type="button"
                  onClick={() => setShowCustomerForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Code *</label>
                    <input
                      type="text"
                      value={newCustomer.customer_code}
                      onChange={(e) => setNewCustomer({ ...newCustomer, customer_code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newCustomer.contact_person}
                      onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={newCustomer.gst_number}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 27AAAAA0000A1Z5"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={newCustomer.address_line1}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address_line1: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Pincode</label>
                    <input
                      type="text"
                      value={newCustomer.pincode}
                      onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create & Select Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Quotation Details</h3>
              <button type="button" onClick={() => setSelectedQuotation(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p><span className="font-medium">Quotation #:</span> {selectedQuotation.quotation_number}</p>
              <p><span className="font-medium">Customer:</span> {selectedQuotation.customer?.name || '-'}</p>
              <p><span className="font-medium">Date:</span> {new Date(selectedQuotation.quotation_date).toLocaleDateString()}</p>
              <p><span className="font-medium">Valid Until:</span> {selectedQuotation.valid_until ? new Date(selectedQuotation.valid_until).toLocaleDateString() : '-'}</p>
              <p><span className="font-medium">Status:</span> {selectedQuotation.status}</p>
              <p><span className="font-medium">Total:</span> ₹{parseFloat(selectedQuotation.total || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
