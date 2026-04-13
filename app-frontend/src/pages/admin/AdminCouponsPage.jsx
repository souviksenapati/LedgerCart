import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { couponsAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '0',
    max_discount_amount: '', usage_limit: '', valid_from: '', valid_until: '', is_active: true
  });

  const fetchCoupons = () => {
    setLoading(true);
    couponsAPI.list()
      .then(r => setCoupons(r.data || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '0', max_discount_amount: '', usage_limit: '', valid_from: '', valid_until: '', is_active: true });
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
      min_order_amount: c.min_order_amount || 0, max_discount_amount: c.max_discount_amount || '',
      usage_limit: c.usage_limit || '', valid_from: c.valid_from?.slice(0, 10) || '', valid_until: c.valid_until?.slice(0, 10) || '', is_active: c.is_active
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form, discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      };
      if (editing) { await couponsAPI.update(editing.id, data); toast.success('Updated'); }
      else { await couponsAPI.create(data); toast.success('Created'); }
      setShowForm(false); fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { await couponsAPI.delete(id); toast.success('Deleted'); fetchCoupons(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <PermissionGuard permission="coupons:manage">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Coupon</button>
        </PermissionGuard>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-primary">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /><span className="font-bold text-lg">{c.code}</span></div>
                <PermissionGuard permission="coupons:manage">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </PermissionGuard>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                {c.min_order_amount > 0 && ` on orders above ₹${c.min_order_amount}`}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>Used: {c.times_used || 0}{c.usage_limit ? `/${c.usage_limit}` : ''}</span>
                <span className={`px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {c.valid_until && <p className="text-xs text-gray-400 mt-1">Expires: {new Date(c.valid_until).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Coupon' : 'Add Coupon'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Code *</label><input className="input-field uppercase" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label>
                  <select className="input-field" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                    <option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Value *</label><input type="number" className="input-field" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Min Order (₹)</label><input type="number" className="input-field" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">Max Discount (₹)</label><input type="number" className="input-field" value={form.max_discount_amount} onChange={e => setForm({ ...form, max_discount_amount: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Valid From</label><input type="date" className="input-field" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">Valid Until</label><input type="date" className="input-field" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Usage Limit</label><input type="number" className="input-field" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} /></div>
                <div className="flex items-end"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label></div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
