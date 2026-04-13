import { useState, useEffect } from 'react';
import { Search, AlertTriangle, ArrowUpDown, Plus } from 'lucide-react';
import { adminAPI, productsAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showUpdate, setShowUpdate] = useState(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [actionType, setActionType] = useState('add');

  const fetchProducts = () => {
    setLoading(true);
    productsAPI.list({ page_size: 100, search })
      .then(r => setProducts(r.data.products || r.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const filtered = filter === 'all' ? products :
    filter === 'low' ? products.filter(p => p.stock > 0 && p.stock <= 10) :
      filter === 'out' ? products.filter(p => p.stock === 0) : products;

  const updateStock = async () => {
    if (!qty) return;
    const changeAmount = parseInt(qty, 10);
    if (isNaN(changeAmount) || changeAmount <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }
    const finalChange = actionType === 'add' ? changeAmount : -changeAmount;

    try {
      await adminAPI.updateInventory(showUpdate.id, { stock_change: finalChange, reason: note });
      toast.success(`Stock ${actionType === 'add' ? 'increased' : 'decreased'} successfully`);
      setShowUpdate(null); setQty(''); setNote(''); setActionType('add');
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error updating stock'); }
  };

  const lowStock = products.filter(p => p.stock <= 10).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold">{products.length}</p><p className="text-sm text-gray-500">Total Products</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-yellow-600">{lowStock}</p><p className="text-sm text-gray-500">Low Stock (≤10)</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-red-600">{outOfStock}</p><p className="text-sm text-gray-500">Out of Stock</p></div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'low', 'out'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Product</th><th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Category</th><th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Status</th>
              <PermissionGuard permission="stock:manage">
                <th className="text-left p-3">Action</th>
              </PermissionGuard>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.stock === 0 ? 'bg-red-50' : p.stock <= 10 ? 'bg-yellow-50' : ''}`}>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-gray-500">{p.sku || '-'}</td>
                  <td className="p-3">{p.category?.name || '-'}</td>
                  <td className="p-3 font-bold">{p.stock}</td>
                  <td className="p-3">
                    {p.stock === 0 ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Out of Stock</span> :
                      p.stock <= 10 ? <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Low Stock</span> :
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">In Stock</span>}
                  </td>
                  <td className="p-3">
                    <PermissionGuard permission="stock:manage">
                      <button onClick={() => { setShowUpdate(p); setQty(''); setNote(''); setActionType('add'); }} className="text-primary hover:underline text-sm flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3" /> Update
                      </button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-center text-gray-400">No products found</p>}
        </div>
      )}

      {/* Update Stock Modal */}
      {showUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1">Update Stock</h2>
            <p className="text-sm text-gray-500 mb-4">{showUpdate.name} (Current: {showUpdate.stock})</p>
            <div className="space-y-4">
              <div className="mb-2">
                <label className="block text-sm font-medium mb-2">Action</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="stockAction"
                      value="add"
                      checked={actionType === 'add'}
                      onChange={() => setActionType('add')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Increase Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="stockAction"
                      value="remove"
                      checked={actionType === 'remove'}
                      onChange={() => setActionType('remove')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Decrease Stock</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity to {actionType === 'add' ? 'Increase' : 'Decrease'}</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder={actionType === 'add' ? "e.g., 50" : "e.g., 5"}
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === '+' || e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">Enter the exact amount to {actionType === 'add' ? 'add to' : 'remove from'} stock</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <input className="input-field" placeholder="Reason for change" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowUpdate(null); setQty(''); setNote(''); setActionType('add'); }} className="btn-secondary">Cancel</button>
                <button onClick={updateStock} className="btn-primary">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
