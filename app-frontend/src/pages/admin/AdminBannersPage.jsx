import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { bannersAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link_url: '', sort_order: '0', is_active: true });

  const fetchBanners = () => {
    setLoading(true);
    bannersAPI.list()
      .then(r => setBanners(r.data || []))
      .catch(() => toast.error('Failed to load banners'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchBanners(); }, []);

  const openCreate = () => { setEditing(null); setForm({ title: '', subtitle: '', image_url: '', link_url: '', sort_order: '0', is_active: true }); setShowForm(true); };
  const openEdit = (b) => { setEditing(b); setForm({ title: b.title, subtitle: b.subtitle || '', image_url: b.image_url || '', link_url: b.link_url || '', sort_order: b.sort_order || 0, is_active: b.is_active }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, sort_order: parseInt(form.sort_order) };
      if (editing) { await bannersAPI.update(editing.id, data); toast.success('Updated'); }
      else { await bannersAPI.create(data); toast.success('Created'); }
      setShowForm(false); fetchBanners();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try { await bannersAPI.delete(id); toast.success('Deleted'); fetchBanners(); } catch { toast.error('Failed'); }
  };

  const handleImageUpload = async (file) => {
    try {
      const res = await uploadAPI.upload(file);
      setForm(prev => ({ ...prev, image_url: res.data.url }));
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Banners & Offers</h1>
        <PermissionGuard permission="banners:manage">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Banner</button>
        </PermissionGuard>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {b.image_url && <div className="h-40 bg-gray-100"><img src={b.image_url} alt={b.title} className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{b.title}</h3>
                    {b.subtitle && <p className="text-sm text-gray-500">{b.subtitle}</p>}
                    <p className="text-xs text-gray-400 mt-1">Order: {b.sort_order}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${b.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                      {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </span>
                    <PermissionGuard permission="banners:manage">
                      <>
                        <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-gray-400 col-span-2 text-center py-8">No banners yet</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Banner' : 'Add Banner'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title *</label><input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium mb-1">Subtitle</label><input className="input-field" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Image</label>
                <div className="flex gap-2">
                  <input className="input-field flex-1" placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                  <label className="btn-secondary cursor-pointer whitespace-nowrap">
                    Upload <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
                  </label>
                </div>
                {form.image_url && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Preview</p>
                    <img src={form.image_url} alt="Banner preview" className="w-full h-32 object-cover rounded border bg-gray-50" />
                  </div>
                )}
              </div>
              <div><label className="block text-sm font-medium mb-1">Link URL</label><input className="input-field" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Sort Order</label><input type="number" className="input-field" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></div>
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
