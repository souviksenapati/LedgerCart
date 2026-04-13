import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { categoriesAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', image_url: '' });

  const fetchCategories = () => {
    setLoading(true);
    categoriesAPI.list()
      .then(r => setCategories(r.data || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', image_url: '' }); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || '', image_url: c.image_url || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, slug: form.name.toLowerCase().replace(/ /g, '-') };
      if (editing) { await categoriesAPI.update(editing.id, payload); toast.success('Updated'); }
      else { await categoriesAPI.create(payload); toast.success('Created'); }
      setShowForm(false); fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products in this category will be affected.')) return;
    try { await categoriesAPI.delete(id); toast.success('Deleted'); fetchCategories(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories ({categories.length})</h1>
        <PermissionGuard permission="catalog:manage">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Category</button>
        </PermissionGuard>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{c.description || 'No description'}</p>
                  <p className="text-xs text-gray-400 mt-2">{c.product_count || 0} products</p>
                </div>
                <div className="flex gap-2">
                  <PermissionGuard permission="catalog:manage">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </PermissionGuard>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea rows={3} className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Category Image</label>
                <div className="flex items-center gap-3">
                  <input type="text" className="input-field flex-1" placeholder="Or enter image URL..." value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                  <label className="btn-secondary cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if (e.target.files[0]) {
                        try {
                          const formData = new FormData();
                          formData.append('file', e.target.files[0]);
                          const res = await uploadAPI.upload(formData);
                          setForm({ ...form, image_url: res.data.url });
                          toast.success('Image uploaded');
                        } catch { toast.error('Upload failed'); }
                      }
                    }} />
                  </label>
                </div>
                {form.image_url && <img src={form.image_url} className="w-32 h-32 object-cover rounded mt-2 border" alt="Preview" />}
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
