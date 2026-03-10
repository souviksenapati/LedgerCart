import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { productsAPI, categoriesAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', discount_percentage: '0', stock: '',
    category_id: '', brand: '', sku: '', unit: 'piece', is_featured: false, is_active: true
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });
  const [newUnit, setNewUnit] = useState('');
  const [availableUnits, setAvailableUnits] = useState(['piece', 'kg', 'meter', 'liter', 'box', 'set']);

  const fetchProducts = () => {
    setLoading(true);
    productsAPI.list({ page, page_size: 10, search })
      .then(res => {
        setProducts(res.data.products || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, search]);
  useEffect(() => {
    categoriesAPI.list()
      .then(r => setCategories(r.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', discount_percentage: '0', stock: '', category_id: '', brand: '', sku: '', unit: 'piece', is_featured: false, is_active: true });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    const primaryImage = p.images?.find(i => i.is_primary)?.image_url || p.images?.[0]?.image_url || '';
    setForm({
      name: p.name, description: p.description || '', price: p.price, discount_percentage: p.discount_percentage || 0,
      stock: p.stock, category_id: p.category_id, brand: p.brand || '', sku: p.sku || '', unit: p.unit || 'piece',
      is_featured: p.is_featured, is_active: p.is_active, image_url: primaryImage
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const price = parseFloat(form.price) || 0;
      const stock = parseInt(form.stock) || 0;
      const discount = parseFloat(form.discount_percentage) || 0;

      const slug = form.name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { image_url, ...formFields } = form;
      const data = {
        ...formFields,
        sku: form.sku.toUpperCase(),
        price,
        stock,
        discount_percentage: discount,
        slug: editing ? undefined : slug // Only send slug on create
      };

      let savedProduct;
      if (editing) {
        const res = await productsAPI.update(editing.id, data);
        savedProduct = res.data;
        toast.success('Product updated');
      } else {
        const res = await productsAPI.create(data);
        savedProduct = res.data;
        toast.success('Product created');
      }

      // Persist image to product images table if URL was set / changed
      const existingPrimaryUrl = editing?.images?.find(i => i.is_primary)?.image_url || editing?.images?.[0]?.image_url;
      if (image_url && image_url !== existingPrimaryUrl) {
        if (editing?.images?.length) {
          await Promise.all(editing.images.map(img => productsAPI.removeImage(savedProduct.id, img.id).catch(() => {})));
        }
        await productsAPI.addImage(savedProduct.id, image_url, true);
      }

      setShowForm(false);
      fetchProducts();
    } catch (err) {
      console.error('Product Save Error:', err);
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const msg = errorDetail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ');
        toast.error(`Validation Error: ${msg}`);
      } else {
        toast.error(errorDetail || 'Error saving product');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await productsAPI.delete(id); toast.success('Deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) {
      toast.error('Category name is required');
      return;
    }
    try {
      const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const res = await categoriesAPI.create({ ...newCategory, slug, is_active: true });
      toast.success('Category created');
      setCategories([...categories, res.data]);
      setForm({ ...form, category_id: res.data.id });
      setShowCategoryModal(false);
      setNewCategory({ name: '', slug: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleCreateUnit = (e) => {
    e.preventDefault();
    if (!newUnit.trim()) {
      toast.error('Unit name is required');
      return;
    }
    const unitValue = newUnit.trim().toLowerCase();
    // Add to available units if not already present
    if (!availableUnits.includes(unitValue)) {
      setAvailableUnits([...availableUnits, unitValue]);
    }
    setForm({ ...form, unit: unitValue });
    setShowUnitModal(false);
    setNewUnit('');
    toast.success(`Unit "${unitValue}" added`);
  };

  const handleImageUpload = async (productId, file) => {
    try {
      const res = await uploadAPI.upload(file);
      const imageUrl = res.data.url;
      // Remove existing images then add new one as primary
      const product = products.find(p => p.id === productId);
      if (product?.images?.length) {
        await Promise.all(product.images.map(img => productsAPI.removeImage(productId, img.id).catch(() => {})));
      }
      await productsAPI.addImage(productId, imageUrl, true);
      toast.success('Image uploaded');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Products ({total})</h1>
        <PermissionGuard permission="catalog:manage">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Product</button>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Product</th><th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price</th><th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Status</th>
              <PermissionGuard permission="catalog:manage">
                <th className="text-left p-3">Actions</th>
              </PermissionGuard>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        {p.images?.[0] ? <img src={p.images[0].image_url} className="w-10 h-10 object-cover rounded" alt={p.name} /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku || 'No SKU'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category?.name || '-'}</td>
                  <td className="p-3">
                    <span>₹{p.price?.toLocaleString()}</span>
                    {p.discount_percentage > 0 && <span className="text-xs text-green-600 ml-1">-{p.discount_percentage}%</span>}
                  </td>
                  <td className="p-3"><span className={p.stock < 10 ? 'text-red-600 font-bold' : ''}>{p.stock}</span></td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <PermissionGuard permission="catalog:manage">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer text-gray-400 hover:text-blue-500">
                          <ImageIcon className="w-4 h-4" />
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(p.id, e.target.files[0])} />
                        </label>
                        <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </PermissionGuard>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="p-6 text-center text-gray-400">No products found</p>}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / 10) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${page === i + 1 ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Name *</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium mb-1">SKU</label><input className="input-field" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <div className="flex gap-2">
                    <select className="input-field flex-1" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                      <option value="">Select</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowCategoryModal(true)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap flex items-center gap-1">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </div>
                </div>
                <div><label className="block text-sm font-medium mb-1">Brand</label><input className="input-field" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">Price (₹) *</label><input type="number" step="0.01" className="input-field" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium mb-1">Discount %</label><input type="number" min="0" max="90" className="input-field" value={form.discount_percentage} onChange={e => setForm({ ...form, discount_percentage: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">Stock *</label><input type="number" className="input-field" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <div className="flex gap-2">
                    <select className="input-field flex-1" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      {availableUnits.map(unit => (
                        <option key={unit} value={unit}>
                          {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowUnitModal(true)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap flex items-center gap-1">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </div>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea rows={3} className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                  <input type="text" className="input-field flex-1" placeholder="Or enter image URL..." value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                  <label className="btn-secondary cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if (e.target.files[0]) {
                        try {
                          const res = await uploadAPI.upload(e.target.files[0]);
                          setForm(prev => ({ ...prev, image_url: res.data.url }));
                          toast.success('Image uploaded');
                        } catch { toast.error('Upload failed'); }
                      }
                    }} />
                  </label>
                </div>
                {form.image_url && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Preview</p>
                    <img src={form.image_url} className="w-40 h-40 object-contain rounded border bg-gray-50 p-1" alt="Preview" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  className="input-field"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g., Building Materials"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (optional)</label>
                <input
                  className="input-field"
                  value={newCategory.slug}
                  onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })}
                  placeholder="Auto-generated from name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={newCategory.description}
                  onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', slug: '', description: '' }); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Creation Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add New Unit</h3>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unit Name *</label>
                <input
                  className="input-field"
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  placeholder="e.g., dozen, bundle, packet"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Hint: Use lowercase, singular form (e.g., "bag", "roll", "strip")</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowUnitModal(false); setNewUnit(''); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
