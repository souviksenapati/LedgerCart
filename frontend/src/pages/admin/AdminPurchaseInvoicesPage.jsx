import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Printer, X, CreditCard } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import PrintDownloadMenu from '../../components/PrintDownloadMenu';
import { generatePurchaseInvoicePDF } from '../../utils/pdfGenerator';

export default function AdminPurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null); // { invoice } or null
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedInvoiceView, setSelectedInvoiceView] = useState(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: null,
    invoice_date: new Date().toISOString().split('T')[0],
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
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/purchases/invoices', { params });
      setInvoices(res.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load purchase invoices');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.invoice_number.trim()) {
      toast.error('Please enter invoice number');
      return;
    }
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const data = {
        ...formData,
        invoice_number: formData.invoice_number.toUpperCase()
      };
      await api.post('/purchases/invoices', data);
      toast.success('Purchase invoice created! Supplier balance updated.');
      setShowForm(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error(error.response?.data?.detail || 'Failed to create purchase invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid payment amount'); return; }
    const inv = paymentModal;
    const newPaidTotal = parseFloat(inv.paid_amount || 0) + amount;
    if (newPaidTotal > parseFloat(inv.total)) {
      toast.error(`Payment exceeds balance due (₹${parseFloat(inv.balance_due).toFixed(2)})`);
      return;
    }
    try {
      await api.put(`/purchases/invoices/${inv.id}`, { paid_amount: newPaidTotal });
      toast.success(newPaidTotal >= parseFloat(inv.total) ? 'Invoice marked as PAID! Supplier balance updated.' : 'Partial payment recorded.');
      setPaymentModal(null);
      setPaymentAmount('');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      supplier_id: null,
      invoice_date: new Date().toISOString().split('T')[0],
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

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;
    let taxableItemsTotal = 0;

    formData.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const itemDiscPct = parseFloat(item.discount_percentage) || 0;
      const itemTaxPct = parseFloat(item.tax_percentage) || 18;

      const lineGross = qty * price;
      const lineDiscount = lineGross * (itemDiscPct / 100);
      const taxable = lineGross - lineDiscount;
      const lineTax = taxable * (itemTaxPct / 100);

      subtotal += lineGross;
      totalLineDiscount += lineDiscount;
      taxableItemsTotal += taxable;
      totalTax += lineTax;
    });

    const globalDiscountAmount = taxableItemsTotal * (parseFloat(formData.discount_percentage) || 0) / 100;
    const taxableAmount = taxableItemsTotal - globalDiscountAmount + parseFloat(formData.freight_charges || 0) + parseFloat(formData.other_charges || 0);

    // In India, GST on freight often follows the principal supply. 
    // Here we'll distribute the cumulative tax based on the GST type.
    let cgst = 0, sgst = 0, igst = 0;

    // If different items have different rates, we should sum them up.
    // However, the summary UI shows CGST/SGST blocks. We'll use the aggregated totalTax.
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
      subtotal,
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

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchSuppliers = async (query) => {
    const res = await api.get('/suppliers/search', { params: { q: query } });
    return res.data.map(s => ({ value: s.id, label: `${s.name} (${s.supplier_code})` }));
  };

  const fetchProducts = async (query) => {
    const res = await api.get('/products', { params: { search: query, limit: 20 } });
    return res.data.products.map(p => ({
      value: p.id,
      label: `${p.name} - ${p.sku} (Stock: ${p.stock})`,
      price: p.cost_price || 0
    }));
  };

  const calculateDueDate = (invoiceDate, paymentTerms) => {
    const date = new Date(invoiceDate);
    const daysMap = { 'cash': 0, 'net_15': 15, 'net_30': 30, 'net_60': 60, 'net_90': 90 };
    date.setDate(date.getDate() + (daysMap[paymentTerms] || 0));
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Invoices</h1>
          <p className="text-sm text-gray-600">Manage supplier invoices and payments</p>
        </div>
        <PermissionGuard permission="purchase_invoices:manage">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Invoice
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
              placeholder="Search by invoice number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Payment</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Invoice #</th>
              <th className="text-left p-4 font-medium text-gray-700">Supplier</th>
              <th className="text-left p-4 font-medium text-gray-700">Date</th>
              <th className="text-left p-4 font-medium text-gray-700">Due Date</th>
              <th className="text-right p-4 font-medium text-gray-700">Total Amount</th>
              <th className="text-right p-4 font-medium text-gray-700">Balance Due</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              <th className="text-center p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-gray-500">No purchase invoices found</td></tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="p-4">{inv.supplier?.name || '-'}</td>
                  <td className="p-4">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td className="p-4 text-right font-semibold">₹{inv.total?.toFixed(2)}</td>
                  <td className={`p-4 text-right font-semibold ${inv.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{inv.balance_due?.toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                      {inv.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedInvoiceView(inv)} className="text-blue-600 hover:text-blue-800" title="View">
                        <Eye className="w-5 h-5" />
                      </button>
                      <PermissionGuard permission="purchase_invoices:manage">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => { setPaymentModal(inv); setPaymentAmount(''); }}
                            className="text-green-600 hover:text-green-800"
                            title="Record Payment"
                          >
                            <CreditCard className="w-5 h-5" />
                          </button>
                        )}
                      </PermissionGuard>
                      <PermissionGuard permission="purchase_invoices:export">
                        <PrintDownloadMenu
                          documentGenerator={() => generatePurchaseInvoicePDF(inv)}
                          fileName={`PI-${inv.invoice_number}.pdf`}
                        />
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">Create Purchase Invoice</h2>
              <button onClick={() => setShowForm(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <SearchableDropdown
                    fetchOptions={fetchSuppliers}
                    placeholder="Select supplier"
                    onSelect={(option) => setFormData({ ...formData, supplier_id: option.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="text"
                    value={calculateDueDate(formData.invoice_date, formData.payment_terms)}
                    className="input w-full bg-gray-50"
                    readOnly
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
                  <h3 className="font-semibold text-gray-800">Invoice Items</h3>
                  <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    + Add Item
                  </button>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '30%' }}>Product</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '10%' }}>Qty</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '15%' }}>Unit Price</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '10%' }}>Disc %</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '15%' }}>Taxable</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '8%' }}>Tax %</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700" style={{ width: '12%' }}>Total</th>
                        <th className="text-center p-3 text-sm font-medium text-gray-700" style={{ width: '5%' }}></th>
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
                                className="input w-full text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input w-full text-sm"
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
                                className="input w-full text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <div className="text-sm font-medium text-gray-700 py-2">₹{taxableAmount.toFixed(2)}</div>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.tax_percentage}
                                onChange={(e) => updateItem(index, 'tax_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input w-full text-sm"
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

                {/* Invoice Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Invoice Summary</h4>
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
                    placeholder="Payment terms, delivery conditions..."
                  ></textarea>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
              <button onClick={() => setPaymentModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-semibold">{paymentModal.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span className="font-semibold">{paymentModal.supplier?.name || '-'}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-500">Invoice Total</span>
                <span className="font-semibold">₹{parseFloat(paymentModal.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid</span>
                <span className="font-semibold text-green-600">₹{parseFloat(paymentModal.paid_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-700">Balance Due</span>
                <span className="text-red-600">₹{parseFloat(paymentModal.balance_due || 0).toFixed(2)}</span>
              </div>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(paymentModal.balance_due || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input w-full text-lg font-semibold"
                  placeholder={`Max ₹${parseFloat(paymentModal.balance_due || 0).toFixed(2)}`}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(parseFloat(paymentModal.balance_due || 0)))}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Pay full balance
                </button>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setPaymentModal(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Invoice Detail View Modal */}
      {selectedInvoiceView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Purchase Invoice — {selectedInvoiceView.invoice_number}</h2>
              <button onClick={() => setSelectedInvoiceView(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{selectedInvoiceView.supplier?.name || '-'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedInvoiceView.status === 'paid' ? 'bg-green-100 text-green-700' : selectedInvoiceView.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{selectedInvoiceView.status?.replace('_', ' ').toUpperCase()}</span></div>
              <div><span className="text-gray-500">Invoice Date:</span> <span className="font-medium">{new Date(selectedInvoiceView.invoice_date).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Due Date:</span> <span className="font-medium">{selectedInvoiceView.due_date ? new Date(selectedInvoiceView.due_date).toLocaleDateString() : '-'}</span></div>
              <div><span className="text-gray-500">Payment Terms:</span> <span className="font-medium">{selectedInvoiceView.payment_terms || '-'}</span></div>
              <div><span className="text-gray-500">GST Type:</span> <span className="font-medium">{selectedInvoiceView.gst_type?.toUpperCase() || '-'}</span></div>
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-2">Product</th><th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Unit Price</th><th className="text-right p-2">Total</th>
                </tr></thead>
                <tbody>{(selectedInvoiceView.items || []).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{item.product?.name || item.product_id}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold">₹{parseFloat(item.line_total || (item.unit_price * item.quantity) || 0).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-blue-700">₹{parseFloat(selectedInvoiceView.total || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-600 font-semibold">₹{parseFloat(selectedInvoiceView.paid_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-700 font-medium">Balance Due</span><span className="text-red-600 font-bold">₹{parseFloat(selectedInvoiceView.balance_due || 0).toFixed(2)}</span></div>
            </div>
            {selectedInvoiceView.notes && <p className="text-sm text-gray-500 mt-3"><span className="font-medium">Notes:</span> {selectedInvoiceView.notes}</p>}
            {selectedInvoiceView.terms_conditions && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Terms:</span> {selectedInvoiceView.terms_conditions}</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setSelectedInvoiceView(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
