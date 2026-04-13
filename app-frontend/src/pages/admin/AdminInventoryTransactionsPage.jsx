import { useState, useEffect } from 'react';
import { Plus, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { adminAPI, productsAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminInventoryTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    transaction_type: 'inward',
    invoice_number: '',
    supplier_name: '',
    invoice_date: '',
    notes: ''
  });

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

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        transaction_type: form.transaction_type,
        products: [{
          product_id: form.product_id,
          quantity: parseInt(form.quantity)
        }],
        invoice_number: form.invoice_number,
        supplier_name: form.transaction_type === 'inward' ? form.supplier_name : '',
        customer_name: form.transaction_type === 'outward' ? form.supplier_name : '',
        invoice_date: form.invoice_date || null,
        invoice_image_url: '',
        notes: form.notes
      };
      await adminAPI.createInventoryTransaction(data);
      toast.success(`${form.transaction_type === 'inward' ? 'Inward' : 'Outward'} transaction recorded`);
      setShowForm(false);
      setForm({
        product_id: '',
        quantity: '',
        transaction_type: 'inward',
        invoice_number: '',
        supplier_name: '',
        invoice_date: '',
        notes: ''
      });
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating transaction');
    }
  };

  const inwardCount = transactions.filter(t => t.transaction_type === 'inward').length;
  const outwardCount = transactions.filter(t => t.transaction_type === 'outward').length;
  const totalInward = transactions.filter(t => t.transaction_type === 'inward').reduce((sum, t) => sum + t.change, 0);
  const totalOutward = transactions.filter(t => t.transaction_type === 'outward').reduce((sum, t) => Math.abs(t.change), 0);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Inventory Transactions</h1>
        <PermissionGuard permission="stock:manage">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Inward</p>
              <p className="text-2xl font-bold text-green-600">{totalInward}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Outward</p>
              <p className="text-2xl font-bold text-red-600">{totalOutward}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{inwardCount}</p>
          <p className="text-sm text-gray-500">Inward Transactions</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-primary-600">{outwardCount}</p>
          <p className="text-sm text-gray-500">Outward Transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'inward', 'outward'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            {f === 'all' ? 'All Transactions' : f === 'inward' ? 'Inward Only' : 'Outward Only'}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Quantity</th>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Supplier/Buyer</th>
                <th className="text-left p-3">Invoice Date</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3 font-medium">{t.product_name || t.product?.name || 'N/A'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${t.transaction_type === 'inward'
                      ? 'bg-green-100 text-green-700'
                      : t.transaction_type === 'outward'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                      {t.transaction_type === 'inward' && <TrendingUp className="w-3 h-3" />}
                      {t.transaction_type === 'outward' && <TrendingDown className="w-3 h-3" />}
                      {t.transaction_type === 'inward' ? 'Inward' : t.transaction_type === 'outward' ? 'Outward' : 'Manual'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`font-bold ${t.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.change > 0 ? '+' : ''}{t.change}
                    </span>
                  </td>
                  <td className="p-3">{t.invoice_number || '-'}</td>
                  <td className="p-3">{t.supplier_name || t.customer_name || '-'}</td>
                  <td className="p-3 text-gray-500">
                    {t.invoice_date ? new Date(t.invoice_date).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td className="p-3 text-gray-500 max-w-xs truncate">{t.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="p-6 text-center text-gray-400">No transactions found</p>
          )}
        </div>
      )}

      {/* Add Transaction Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Add Inventory Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction Type *</label>
                  <select
                    className="input-field"
                    value={form.transaction_type}
                    onChange={e => setForm({ ...form, transaction_type: e.target.value })}
                    required
                  >
                    <option value="inward">Inward (Stock In)</option>
                    <option value="outward">Outward (Stock Out)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select
                    className="input-field"
                    value={form.product_id}
                    onChange={e => setForm({ ...form, product_id: e.target.value })}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {form.transaction_type === 'inward' ? 'Supplier Name' : 'Customer/Buyer Name'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.supplier_name}
                    onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                    placeholder={form.transaction_type === 'inward' ? 'Supplier name' : 'Customer name'}
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes about this transaction..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
