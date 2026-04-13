import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Warehouse as WarehouseIcon, MapPin, Phone, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import PermissionGuard from '../../components/PermissionGuard';
export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    manager_name: '',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/warehouses/');
      setWarehouses(response.data);
    } catch (error) {
      toast.error('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.id}`, formData);
        toast.success('Warehouse updated successfully');
      } else {
        await api.post('/warehouses/', formData);
        toast.success('Warehouse created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save warehouse');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await api.delete(`/warehouses/${id}`);
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      toast.error('Failed to delete warehouse');
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address_line1: warehouse.address_line1 || '',
      address_line2: warehouse.address_line2 || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      pincode: warehouse.pincode || '',
      manager_name: warehouse.manager_name || '',
      phone: warehouse.phone || '',
      is_active: warehouse.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      manager_name: '',
      phone: '',
      is_active: true
    });
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Warehouse Management</h1>
          <p className="text-gray-600 mt-1">Manage warehouse locations and inventory points</p>
        </div>
        <PermissionGuard permission="warehouses:manage">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition"
          >
            <Plus size={20} />
            <span>Add Warehouse</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading warehouses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWarehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <WarehouseIcon size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{warehouse.name}</h3>
                    <p className="text-sm text-gray-500">Code: {warehouse.code}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {warehouse.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {warehouse.manager_name && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <User size={16} />
                    <span>{warehouse.manager_name}</span>
                  </div>
                )}
                {warehouse.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone size={16} />
                    <span>{warehouse.phone}</span>
                  </div>
                )}
                {warehouse.city && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    <span>{warehouse.city}, {warehouse.state}</span>
                  </div>
                )}
              </div>

              <PermissionGuard permission="warehouses:manage">
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(warehouse)}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center space-x-2"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(warehouse.id)}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center space-x-2"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </PermissionGuard>
            </div>
          ))}

          {filteredWarehouses.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <WarehouseIcon size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No warehouses found</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Warehouse Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  {editingWarehouse ? 'Update' : 'Create'} Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
