import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Package, Calendar, FileText, Upload as UploadIcon, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { adminAPI, productsAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminInwardsOutwardsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    transaction_type: 'inward',
    invoice_number: '',
    supplier_name: '',
    customer_name: '',
    invoice_date: '',
    invoice_image_url: '',
    notes: '',
    products: []
  });
  const [currentProduct, setCurrentProduct] = useState({ product_id: '', quantity: '' });

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [filter]);

  const fetchTransactions = () => {
    setLoading(true);
    const params = filter !== 'all' ? { transaction_type: filter } : {};
    adminAPI.inventoryTransactions(params)
      .then(r => setTransactions(r.data || []))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  };

  const fetchProducts = () => {
    productsAPI.list({ page_size: 100 })
      .then(r => setProducts(r.data.products || []))
      .catch(() => { });
  };

  const addProductToInvoice = () => {
    if (!currentProduct.product_id || !currentProduct.quantity || currentProduct.quantity <= 0) {
      toast.error('Please select product and enter quantity');
      return;
    }

    const product = products.find(p => p.id === currentProduct.product_id);
    if (!product) return;

    // Check if product already added
    const existing = form.products.find(p => p.product_id === currentProduct.product_id);
    if (existing) {
      toast.error('Product already added to this invoice');
      return;
    }

    setForm({
      ...form,
      products: [...form.products, {
        product_id: currentProduct.product_id,
        quantity: parseInt(currentProduct.quantity),
        product_name: product.name,
        product_sku: product.sku
      }]
    });
    setCurrentProduct({ product_id: '', quantity: '' });
  };

  const removeProductFromInvoice = (product_id) => {
    setForm({
      ...form,
      products: form.products.filter(p => p.product_id !== product_id)
    });
  };

  const handleImageUpload = async (file) => {
    try {
      const res = await uploadAPI.upload(file);
      setForm({ ...form, invoice_image_url: res.data.url });
      toast.success('Invoice image uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    try {
      const data = {
        ...form,
        products: form.products.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity
        }))
      };

      await adminAPI.createInventoryTransaction(data);
      toast.success(`${form.transaction_type === 'inward' ? 'Inward' : 'Outward'} invoice recorded successfully`);
      setShowForm(false);
      resetForm();
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create transaction');
    }
  };

  const resetForm = () => {
    setForm({
      transaction_type: 'inward',
      invoice_number: '',
      supplier_name: '',
      customer_name: '',
      invoice_date: '',
      invoice_image_url: '',
      notes: '',
      products: []
    });
    setCurrentProduct({ product_id: '', quantity: '' });
  };

  const openForm = (type) => {
    resetForm();
    setForm(prev => ({ ...prev, transaction_type: type }));
    setShowForm(true);
  };

  // Group transactions by invoice_id for display
  const groupedTransactions = transactions.reduce((acc, t) => {
    const key = t.invoice_id || t.id;
    if (!acc[key]) {
      acc[key] = {
        invoice_id: key,
        invoice_number: t.invoice_number,
        reference: t.reason,   // fallback reference from first product reason
        transaction_type: t.transaction_type,
        supplier_name: t.supplier_name,
        customer_name: t.customer_name,
        invoice_date: t.invoice_date,
        invoice_image_url: t.invoice_image_url,
        notes: t.notes,
        created_at: t.created_at,
        products: []
      };
    }
    acc[key].products.push({
      product_id: t.product_id,
      change: t.change,
      reason: t.reason
    });
    return acc;
  }, {});

  const invoices = Object.values(groupedTransactions).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  const stats = {
    total: transactions.length,
    inward: transactions.filter(t => t.transaction_type === 'inward').length,
    outward: transactions.filter(t => t.transaction_type === 'outward').length,
    totalInwardQty: transactions.filter(t => t.transaction_type === 'inward').reduce((sum, t) => sum + Math.abs(t.change), 0),
    totalOutwardQty: transactions.filter(t => t.transaction_type === 'outward').reduce((sum, t) => sum + Math.abs(t.change), 0)
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Inwards/Outwards Invoicing</h1>
        <div className="flex gap-2">
          <button onClick={() => openForm('inward')} className="btn-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Inward Invoice
          </button>
          <button onClick={() => openForm('outward')} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
            <TrendingDown className="w-4 h-4" /> Outward Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <FileText className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{Object.keys(groupedTransactions).length}</p>
          <p className="text-sm text-gray-500">Total Invoices</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm">
          <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-green-600">{stats.inward}</p>
          <p className="text-sm text-gray-600">Inward Items</p>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 shadow-sm">
          <TrendingDown className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-primary-600">{stats.outward}</p>
          <p className="text-sm text-gray-600">Outward Items</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm">
          <Package className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-green-600">{stats.totalInwardQty}</p>
          <p className="text-sm text-gray-600">Total Inward Qty</p>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 shadow-sm">
          <Package className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-primary-600">{stats.totalOutwardQty}</p>
          <p className="text-sm text-gray-600">Total Outward Qty</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {['all', 'inward', 'outward'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Supplier/Customer</th>
                <th className="text-left p-3">Products</th>
                <th className="text-left p-3">Total Qty</th>
                <th className="text-left p-3">Document</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.invoice_id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.transaction_type === 'inward'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-primary-100 text-primary-700'
                      }`}>
                      {inv.transaction_type === 'inward' ? '↓ Inward' : '↑ Outward'}
                    </span>
                  </td>
                  <td className="p-3">
                    {inv.invoice_number
                      ? <span className="font-mono text-xs">{inv.invoice_number}</span>
                      : inv.reference
                        ? <span className="text-xs text-gray-500 italic">{inv.reference}</span>
                        : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3">
                    {inv.supplier_name || inv.customer_name
                      ? <span>{inv.supplier_name || inv.customer_name}</span>
                      : <span className="text-xs text-gray-400 italic">System / E-commerce</span>}
                  </td>
                  <td className="p-3">
                    <span className="text-xs bg-blue-50 px-2 py-1 rounded">{inv.products.length} items</span>
                  </td>
                  <td className="p-3 font-bold">
                    {inv.products.reduce((sum, p) => sum + Math.abs(p.change), 0)}
                  </td>
                  <td className="p-3">
                    {inv.invoice_image_url ? (
                      <a href={inv.invoice_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" /> View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="p-6 text-center text-gray-400">No invoices found</p>}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl my-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {form.transaction_type === 'inward' ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-primary-600" />}
                {form.transaction_type === 'inward' ? 'Inward Invoice' : 'Outward Invoice'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <input
                    className="input-field"
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                  />
                </div>
                {form.transaction_type === 'inward' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier Name</label>
                    <input
                      className="input-field"
                      value={form.supplier_name}
                      onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                      placeholder="ABC Suppliers Pvt Ltd"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name</label>
                    <input
                      className="input-field"
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="Customer/Project Name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Document</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      value={form.invoice_image_url}
                      onChange={e => setForm({ ...form, invoice_image_url: e.target.value })}
                      placeholder="Or paste URL"
                    />
                    <label className="btn-secondary cursor-pointer flex items-center gap-2 whitespace-nowrap">
                      <UploadIcon className="w-4 h-4" /> Upload
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                  {form.invoice_image_url && (
                    <div className="mt-2">
                      {form.invoice_image_url.endsWith('.pdf') ? (
                        <a href={form.invoice_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                          <FileText className="w-4 h-4" /> View PDF
                        </a>
                      ) : (
                        <img src={form.invoice_image_url} className="w-32 h-32 object-cover rounded border" alt="Invoice" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Products Section */}
              <div className="border-t pt-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Products in Invoice
                </h3>

                {/* Add Product Form */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="md:col-span-7">
                    <label className="block text-xs font-medium mb-1">Select Product</label>
                    <select
                      className="input-field text-sm"
                      value={currentProduct.product_id}
                      onChange={e => setCurrentProduct({ ...currentProduct, product_id: e.target.value })}
                    >
                      <option value="">Choose product...</option>
                      {products.filter(p => !form.products.find(fp => fp.product_id === p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''} - Stock: {p.stock}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-sm"
                      value={currentProduct.quantity}
                      onChange={e => setCurrentProduct({ ...currentProduct, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={addProductToInvoice}
                      className="btn-primary w-full text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Products List */}
                {form.products.length > 0 ? (
                  <div className="space-y-2">
                    {form.products.map((p, idx) => (
                      <div key={p.product_id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{p.product_name}</p>
                          {p.product_sku && <p className="text-xs text-gray-500">SKU: {p.product_sku}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold">Qty: {p.quantity}</span>
                          <button
                            type="button"
                            onClick={() => removeProductFromInvoice(p.product_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-bold">Total: {form.products.length} products, {form.products.reduce((sum, p) => sum + p.quantity, 0)} units</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8 text-sm">No products added yet. Add products above.</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes about this invoice..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className={`btn-primary ${form.products.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={form.products.length === 0}>
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
