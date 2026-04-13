import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Star, Phone, Mail, MapPin, Building, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import PermissionGuard from '../../components/PermissionGuard';
export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    supplier_code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    alternate_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    payment_terms: 'cash',
    credit_limit: 0,
    opening_balance: 0,
    rating: 5,
    notes: '',
    is_active: true
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers/');
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        supplier_code: formData.supplier_code.toUpperCase(),
        gst_number: (formData.gst_number || '').toUpperCase(),
        pan_number: (formData.pan_number || '').toUpperCase(),
        bank_ifsc: (formData.bank_ifsc || '').toUpperCase()
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, data);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers/', data);
        toast.success('Supplier created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_code: supplier.supplier_code,
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      alternate_phone: supplier.alternate_phone || '',
      address_line1: supplier.address_line1 || '',
      address_line2: supplier.address_line2 || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gst_number: supplier.gst_number || '',
      pan_number: supplier.pan_number || '',
      bank_name: supplier.bank_name || '',
      bank_account_number: supplier.bank_account_number || '',
      bank_ifsc: supplier.bank_ifsc || '',
      payment_terms: supplier.payment_terms || 'cash',
      credit_limit: supplier.credit_limit || 0,
      opening_balance: supplier.opening_balance || 0,
      rating: supplier.rating || 5,
      notes: supplier.notes || '',
      is_active: supplier.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      supplier_code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      alternate_phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      payment_terms: 'cash',
      credit_limit: 0,
      opening_balance: 0,
      rating: 5,
      notes: '',
      is_active: true
    });
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.supplier_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.includes(searchQuery)
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Supplier Management</h1>
          <p className="text-gray-600 mt-1">Manage your suppliers and vendor details</p>
        </div>
        <PermissionGuard permission="suppliers:manage">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition"
          >
            <Plus size={20} />
            <span>Add Supplier</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search suppliers by name, code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading suppliers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <PermissionGuard permission="suppliers:manage">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </PermissionGuard>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.supplier_code}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      {supplier.contact_person && (
                        <div className="text-sm text-gray-500">{supplier.contact_person}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center space-x-1">
                      <Phone size={14} />
                      <span>{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                        <Mail size={14} />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{supplier.gst_number || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${supplier.payment_terms === 'cash' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {supplier.payment_terms.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-medium ${supplier.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{supplier.current_balance?.toLocaleString('en-IN') || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < supplier.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </td>
                  <PermissionGuard permission="suppliers:manage">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </PermissionGuard>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Building size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No suppliers found</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier Code * <span className="text-xs text-gray-500 font-normal">(Max 10 chars)</span></label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={formData.supplier_code}
                      onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. SUP-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">GST Number</label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Terms</label>
                    <select
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_15">Credit 15 Days</option>
                      <option value="credit_30">Credit 30 Days</option>
                      <option value="credit_60">Credit 60 Days</option>
                      <option value="credit_90">Credit 90 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Credit Limit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Opening Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSupplier ? 'Update' : 'Create'} Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
