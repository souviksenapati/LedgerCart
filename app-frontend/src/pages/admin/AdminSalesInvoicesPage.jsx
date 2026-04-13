import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileText, Printer } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import PrintDownloadMenu from '../../components/PrintDownloadMenu';
import { generateSalesInvoicePDF } from '../../utils/pdfGenerator';

export default function AdminSalesInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_id: '',
    sales_order_id: null,
    delivery_note_id: null,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'cash',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    gst_type: 'cgst_sgst',
    notes: '',
    terms_conditions: '',
    eway_bill_no: '',
    delivery_note_no: '',
    buyer_order_no: '',
    consignee_name: '',
    consignee_address: '',
    consignee_state: '',
    consignee_gstin: '',
    irn: '',
    ack_no: '',
    ack_date: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
  });

  const [shipToSameAsBill, setShipToSameAsBill] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
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

  const [rawCustomers, setRawCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchSalesOrders();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/sales/invoices');
      setInvoices(res.data);
    } catch (error) {
      toast.error('Failed to fetch sales invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/b2b-customers/search?limit=100');
      setRawCustomers(res.data);
      setCustomers(res.data.map(c => ({
        value: c.id,
        label: c.name,
        description: c.contact_person ? `Contact: ${c.contact_person}` : undefined
      })));
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await api.get('/sales/orders?limit=100&status=confirmed');
      setSalesOrders(res.data.map(so => ({
        value: so.id,
        label: `${so.order_number} (${so.customer?.name || 'Unknown'})`,
        raw: so
      })));
    } catch (error) {
      console.error('Failed to fetch sales orders');
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = rawCustomers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        consignee_name: shipToSameAsBill ? customer.name : prev.consignee_name,
        consignee_address: shipToSameAsBill ? `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''}, ${customer.city}, ${customer.state} - ${customer.pincode}` : prev.consignee_address,
        consignee_state: shipToSameAsBill ? customer.state : prev.consignee_state,
        consignee_gstin: shipToSameAsBill ? customer.gst_number : prev.consignee_gstin
      }));
    } else {
      setFormData(prev => ({ ...prev, customer_id: customerId }));
    }
  };

  const handleSalesOrderSelect = (orderId) => {
    const selectedOrder = salesOrders.find(so => so.value === orderId)?.raw;
    if (selectedOrder) {
      setFormData(prev => ({
        ...prev,
        sales_order_id: orderId,
        customer_id: selectedOrder.customer_id,
        gst_type: selectedOrder.gst_type,
        items: selectedOrder.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_percentage: item.tax_percentage
        })),
        buyer_order_no: selectedOrder.order_number
      }));
      // Also trigger customer address population
      handleCustomerSelect(selectedOrder.customer_id);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?page_size=100');
      setProducts((res.data.products || []).map(p => ({
        value: p.id,
        label: `${p.name} (${p.sku}) - Stock: ${p.stock} - ₹${p.price}`,
        name: p.name,
        sku: p.sku,
        hsn_code: p.hsn_code || '',
        unit: p.unit || 'piece',
        price: parseFloat(p.price),
        stock: p.stock
      })));
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b-customers', newCustomer);

      toast.success('Customer created successfully!');
      await fetchCustomers();

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

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...formData.items];
    newItems[index].product_id = product.value;
    newItems[index].unit_price = product.price;
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotals = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmt = subtotal * (item.discount_percentage / 100);
    const taxable = subtotal - discountAmt;
    const taxAmt = taxable * (item.tax_percentage / 100);
    const lineTotal = taxable + taxAmt;
    return { subtotal, discountAmt, taxable, taxAmt, lineTotal };
  };

  const calculateTotals = () => {
    let subtotalGrossTotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;
    let lineTaxableTotal = 0;

    formData.items.forEach(item => {
      if (item.product_id && item.quantity > 0 && item.unit_price > 0) {
        const { subtotal, discountAmt, taxable, taxAmt } = calculateItemTotals(item);
        subtotalGrossTotal += subtotal;
        totalLineDiscount += discountAmt;
        lineTaxableTotal += taxable;
        totalTax += taxAmt;
      }
    });

    const globalDiscountAmount = lineTaxableTotal * (parseFloat(formData.discount_percentage) || 0) / 100;
    const taxableAmount = lineTaxableTotal - globalDiscountAmount + parseFloat(formData.freight_charges || 0) +
      parseFloat(formData.other_charges || 0);

    const totalBeforeRound = taxableAmount + totalTax;
    const total = Math.round(totalBeforeRound);
    const roundOff = total - totalBeforeRound;

    const cgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const sgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const igst = formData.gst_type === 'igst' ? totalTax : 0;
    const effectiveTaxRate = lineTaxableTotal > 0 ? (totalTax / lineTaxableTotal) * 100 : 0;

    return {
      subtotal: subtotalGrossTotal,
      discountAmount: totalLineDiscount + globalDiscountAmount,
      totalTax,
      cgst,
      sgst,
      igst,
      roundOff,
      total,
      effectiveTaxRate
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form submitted with data:', formData);

    if (!formData.invoice_number || !formData.customer_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      // Clean up data: convert empty strings to null for optional date fields
      const cleanedData = {
        ...formData,
        invoice_number: formData.invoice_number.toUpperCase(),
        due_date: formData.due_date || null,
        ack_date: formData.ack_date || null
      };

      console.log('Sending invoice data to API...', cleanedData);
      const response = await api.post('/sales/invoices', cleanedData);
      console.log('Invoice created successfully:', response.data);
      toast.success('Sales invoice created successfully! Inventory updated.');
      setShowForm(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error('Invoice creation error:', error);
      console.error('Error response:', error.response?.data);

      // Show detailed validation errors if available
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          const errorMsg = detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          toast.error(`Validation Error: ${errorMsg}`);
        } else {
          toast.error(detail);
        }
      } else {
        toast.error(error.response?.data?.detail || 'Failed to create sales invoice');
      }
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId, status) => {
    try {
      await api.put(`/sales/invoices/${invoiceId}`, { status });
      toast.success('Invoice status updated');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update invoice status');
    }
  };

  const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = ('0000000' + num).substr(-7).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Lakh ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Thousand ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Hundred ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'and ' : '';
    str += (n[5] != 0) ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str + 'Only';
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      customer_id: '',
      sales_order_id: null,
      delivery_note_id: null,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_terms: 'cash',
      discount_percentage: 0,
      freight_charges: 0,
      other_charges: 0,
      gst_type: 'cgst_sgst',
      notes: '',
      terms_conditions: '',
      eway_bill_no: '',
      delivery_note_no: '',
      buyer_order_no: '',
      consignee_name: '',
      consignee_address: '',
      consignee_state: '',
      consignee_gstin: '',
      irn: '',
      ack_no: '',
      ack_date: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
    });
    setShipToSameAsBill(true);
  };

  const filteredInvoices = invoices.filter(inv => {
    const query = searchTerm.toLowerCase();
    const invoiceNumber = (inv.invoice_number || '').toLowerCase();
    const customerName = (inv.customer?.name || '').toLowerCase();
    const matchesSearch = invoiceNumber.includes(query) || customerName.includes(query);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discountAmount, totalTax, cgst, sgst, igst, roundOff, total, effectiveTaxRate } = calculateTotals();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sales Invoices</h1>
          <p className="text-gray-600 mt-1">Manage B2B sales invoices with GST</p>
        </div>
        <PermissionGuard permission="sales_invoices:manage">
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Invoice</span>
          </button>
        </PermissionGuard>
      </div>

      {!showForm && (
        <>
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by invoice number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{inv.invoice_number}</td>
                    <td className="px-6 py-4">{inv.customer?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">₹{parseFloat(inv.total).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={parseFloat(inv.balance_due) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        ₹{parseFloat(inv.balance_due).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PermissionGuard permission="sales_invoices:manage" fallback={<span className="text-xs px-2 py-1 bg-gray-100 rounded">{inv.status?.toUpperCase()}</span>}>
                        <select
                          value={inv.status || 'draft'}
                          onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value)}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="draft">DRAFT</option>
                          <option value="sent">SENT</option>
                          <option value="partially_paid">PARTIALLY PAID</option>
                          <option value="paid">PAID</option>
                          <option value="overdue">OVERDUE</option>
                        </select>
                      </PermissionGuard>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button type="button" onClick={() => setSelectedInvoice(inv)} className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                        <PermissionGuard permission="sales_invoices:export">
                          <PrintDownloadMenu
                            documentGenerator={() => generateSalesInvoicePDF(inv)}
                            fileName={`Invoice-${inv.invoice_number}.pdf`}
                          />
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Create Sales Invoice</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Import Data</p>
                  <p className="text-xs text-blue-700">Select an existing sales order to auto-fill the invoice</p>
                </div>
              </div>
              <div className="w-64">
                <SearchableDropdown
                  options={salesOrders}
                  value={formData.sales_order_id}
                  onChange={handleSalesOrderSelect}
                  placeholder="Select Sales Order"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
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
                  options={customers}
                  value={formData.customer_id}
                  onChange={handleCustomerSelect}
                  placeholder="Select customer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_15">15 Days Credit</option>
                  <option value="credit_30">30 Days Credit</option>
                  <option value="credit_60">60 Days Credit</option>
                  <option value="credit_90">90 Days Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GST Type</label>
                <select
                  value={formData.gst_type}
                  onChange={(e) => setFormData({ ...formData, gst_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                  <option value="igst">IGST (Inter-state)</option>
                </select>
              </div>
            </div>

            {/* Meta Details Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-3 border-b pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Invoice Meta Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">E-Way Bill No.</label>
                  <input
                    type="text"
                    value={formData.eway_bill_no}
                    onChange={(e) => setFormData({ ...formData, eway_bill_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Note No.</label>
                  <input
                    type="text"
                    value={formData.delivery_note_no}
                    onChange={(e) => setFormData({ ...formData, delivery_note_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Buyer Order No.</label>
                  <input
                    type="text"
                    value={formData.buyer_order_no}
                    onChange={(e) => setFormData({ ...formData, buyer_order_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">IRN (E-Invoice)</label>
                  <input
                    type="text"
                    value={formData.irn}
                    onChange={(e) => setFormData({ ...formData, irn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ack No.</label>
                  <input
                    type="text"
                    value={formData.ack_no}
                    onChange={(e) => setFormData({ ...formData, ack_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ack Date</label>
                  <input
                    type="date"
                    value={formData.ack_date}
                    onChange={(e) => setFormData({ ...formData, ack_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Details Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-4 h-4 text-green-600">🚚</div> Shipping Details (Consignee)
                </h3>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shipToSameAsBill}
                    onChange={(e) => setShipToSameAsBill(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  Same as Billing
                </label>
              </div>

              {!shipToSameAsBill && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Consignee Name</label>
                    <input
                      type="text"
                      value={formData.consignee_name}
                      onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={formData.consignee_address}
                      onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State & State Code</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra (27)"
                      value={formData.consignee_state}
                      onChange={(e) => setFormData({ ...formData, consignee_state: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={formData.consignee_gstin}
                      onChange={(e) => setFormData({ ...formData, consignee_gstin: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium">Product</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">HSN</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Qty/Unit</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Price</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Disc %</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Taxable</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">GST %</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">GST Amt</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Total</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const { taxable, taxAmt, lineTotal } = calculateItemTotals(item);
                      return (
                        <tr key={index} className="border-b">
                          <td className="px-2 py-2">
                            <SearchableDropdown
                              options={products}
                              value={item.product_id}
                              onChange={(value) => {
                                const product = products.find(p => p.value === value);
                                if (product) handleProductSelect(index, product);
                              }}
                              placeholder="Select"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <span className="text-xs text-gray-500">{products.find(p => p.value === item.product_id)?.hsn_code || '-'}</span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border rounded"
                                min="1"
                              />
                              <span className="text-[10px] text-gray-400 text-center">{products.find(p => p.value === item.product_id)?.unit || ''}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.discount_percentage}
                              onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-16 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm">₹{taxable.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.tax_percentage}
                              onChange={(e) => handleItemChange(index, 'tax_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-16 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm">₹{taxAmt.toFixed(2)}</td>
                          <td className="px-2 py-2 text-sm font-semibold">₹{lineTotal.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                ✕
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Freight Charges</label>
                  <input
                    type="number"
                    value={formData.freight_charges}
                    onChange={(e) => setFormData({ ...formData, freight_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Charges</label>
                  <input
                    type="number"
                    value={formData.other_charges}
                    onChange={(e) => setFormData({ ...formData, other_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-semibold text-red-600">-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight:</span>
                  <span className="font-semibold">₹{parseFloat(formData.freight_charges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Charges:</span>
                  <span className="font-semibold">₹{parseFloat(formData.other_charges || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  {formData.gst_type === 'cgst_sgst' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>CGST ({(effectiveTaxRate / 2).toFixed(2)}%):</span>
                        <span className="font-semibold">₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SGST ({(effectiveTaxRate / 2).toFixed(2)}%):</span>
                        <span className="font-semibold">₹{sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span>IGST ({effectiveTaxRate.toFixed(2)}%):</span>
                      <span className="font-semibold">₹{igst.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Round Off:</span>
                  <span className="font-semibold">{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2 text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Create Invoice & Update Stock</span>
              </button>
            </div>
          </form>
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

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Invoice Details</h3>
              <button type="button" onClick={() => setSelectedInvoice(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p><span className="font-medium">Invoice #:</span> {selectedInvoice.invoice_number}</p>
              <p><span className="font-medium">Customer:</span> {selectedInvoice.customer?.name || '-'}</p>
              <p><span className="font-medium">Date:</span> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
              <p><span className="font-medium">Status:</span> {selectedInvoice.status}</p>
              <p><span className="font-medium">Total:</span> ₹{parseFloat(selectedInvoice.total || 0).toFixed(2)}</p>
              <p><span className="font-medium">Balance Due:</span> ₹{parseFloat(selectedInvoice.balance_due || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
