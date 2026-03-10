import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Package } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminGRNPage() {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    grn_number: '',
    supplier_id: '',
    po_id: null,
    warehouse_id: '',
    grn_date: new Date().toISOString().split('T')[0],
    supplier_invoice_number: '',
    supplier_invoice_date: '',
    vehicle_number: '',
    received_by: '',
    notes: '',
    items: [{ product_id: '', ordered_quantity: 0, received_quantity: 0, unit_price: 0, batch_number: '', expiry_date: '', notes: '' }]
  });

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    description: '',
    brand: '',
    unit: 'piece',
    category_id: ''
  });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newSupplier, setNewSupplier] = useState({
    supplier_code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [newWarehouse, setNewWarehouse] = useState({
    code: '',
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    manager_name: '',
    phone: ''
  });

  useEffect(() => {
    fetchGRNs();
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchWarehouses();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchGRNs = async () => {
    try {
      const res = await api.get('/purchases/grn');
      setGrns(res.data);
    } catch (error) {
      toast.error('Failed to fetch GRNs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers/search?limit=100');
      setSuppliers(res.data.map(s => ({
        id: s.id,
        value: s.id,
        label: s.name,
        description: s.contact_person ? `Contact: ${s.contact_person}` : undefined
      })));
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get('/purchases/purchase-orders?limit=100');
      setPurchaseOrders(res.data.map(po => ({
        id: po.id,
        value: po.id,
        label: `${po.po_number} (${po.supplier?.name || 'Unknown'})`,
        raw: po
      })));
    } catch (error) {
      console.error('Failed to fetch purchase orders');
    }
  };

  const handlePOSelect = (poId) => {
    const selectedPO = purchaseOrders.find(po => po.id === poId)?.raw;
    if (selectedPO) {
      setFormData(prev => ({
        ...prev,
        po_id: poId,
        supplier_id: selectedPO.supplier_id,
        warehouse_id: selectedPO.warehouse_id,
        items: selectedPO.items.map(item => ({
          product_id: item.product_id,
          ordered_quantity: item.quantity,
          received_quantity: item.quantity, // Default to full receipt
          unit_price: item.unit_price,
          batch_number: '',
          expiry_date: '',
          notes: ''
        }))
      }));
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses/search?limit=100');
      setWarehouses(res.data.map(w => ({
        value: w.id,
        label: w.name,
        description: w.city ? `${w.city}, ${w.state}` : undefined
      })));
    } catch (error) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?page_size=100');
      setProducts((res.data.products || []).map(p => ({
        value: p.id,
        label: `${p.name} (${p.sku})`,
        description: `Stock: ${p.stock} | Price: ₹${parseFloat(p.price).toFixed(2)}`,
        price: parseFloat(p.price),
        stock: p.stock
      })));
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.map(c => ({
        value: c.id,
        label: c.name,
        description: c.description
      })));
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const slug = newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res = await api.post('/products', {
        ...newProduct,
        slug,
        short_description: newProduct.description,
        is_active: true,
        is_featured: false,
        tags: '',
        low_stock_threshold: 5
      });

      toast.success('Product created successfully!');

      // Refresh products list
      await fetchProducts();

      // Auto-select the new product in the current item
      if (currentItemIndex !== null) {
        handleItemChange(currentItemIndex, 'product_id', res.data.id);
        handleItemChange(currentItemIndex, 'unit_price', res.data.price);
      }

      // Reset form
      setNewProduct({ name: '', sku: '', price: 0, stock: 0, description: '', brand: '', unit: 'piece', category_id: '' });
      setShowProductForm(false);
      setCurrentItemIndex(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create product');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/categories', {
        ...newCategory,
        slug,
        is_active: true
      });

      toast.success('Category created successfully!');
      await fetchCategories();

      // Auto-select new category
      setNewProduct({ ...newProduct, category_id: res.data.id });
      setNewCategory({ name: '', description: '' });
      setShowCategoryForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', newSupplier);

      toast.success('Supplier created successfully!');
      await fetchSuppliers();

      // Auto-select new supplier
      setFormData({ ...formData, supplier_id: res.data.id });
      setNewSupplier({
        supplier_code: '',
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address_line1: '',
        city: '',
        state: '',
        pincode: ''
      });
      setShowSupplierForm(false);
    } catch (error) {
      console.error('Supplier creation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create supplier');
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/warehouses', {
        ...newWarehouse,
        is_active: true
      });

      toast.success('Warehouse created successfully!');
      await fetchWarehouses();

      // Auto-select new warehouse
      setFormData({ ...formData, warehouse_id: res.data.id });
      setNewWarehouse({
        code: '', name: '', address_line1: '', address_line2: '',
        city: '', state: '', pincode: '', manager_name: '', phone: ''
      });
      setShowWarehouseForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create warehouse');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', ordered_quantity: 0, received_quantity: 0, unit_price: 0, batch_number: '', expiry_date: '', notes: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];

    if (field === 'product_id') {
      // When product is selected, auto-fill the unit price
      newItems[index][field] = value;
      const selectedProduct = products.find(p => p.value === value);
      if (selectedProduct && selectedProduct.price) {
        newItems[index]['unit_price'] = selectedProduct.price;
      }
    } else {
      newItems[index][field] = value;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.grn_number || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      // Clean up data: remove empty strings for optional fields
      const cleanedData = {
        ...formData,
        grn_number: formData.grn_number.toUpperCase(),
        warehouse_id: formData.warehouse_id || null,
        supplier_invoice_number: (formData.supplier_invoice_number || '').toUpperCase(),
        supplier_invoice_date: formData.supplier_invoice_date || null,
        vehicle_number: (formData.vehicle_number || '').toUpperCase(),
        received_by: formData.received_by || '',
        items: formData.items.map(item => ({
          ...item,
          expiry_date: item.expiry_date || null,
          batch_number: item.batch_number || '',
          notes: item.notes || ''
        }))
      };

      console.log('Submitting GRN:', cleanedData);
      await api.post('/purchases/grn', cleanedData);
      toast.success('GRN created successfully! Inventory updated.');
      setShowForm(false);
      resetForm();
      fetchGRNs();
    } catch (error) {
      console.error('GRN creation error:', error);
      console.error('Error response:', error.response?.data);

      // Handle validation errors properly
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          const errorMsg = detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          toast.error(`Validation Error: ${errorMsg}`);
        } else if (typeof detail === 'string') {
          toast.error(detail);
        } else {
          toast.error('Invalid data submitted. Please check all fields.');
        }
      } else {
        toast.error(error.response?.data?.detail || 'Failed to create GRN');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      grn_number: '',
      supplier_id: '',
      po_id: null,
      warehouse_id: '',
      grn_date: new Date().toISOString().split('T')[0],
      supplier_invoice_number: '',
      supplier_invoice_date: '',
      vehicle_number: '',
      received_by: '',
      notes: '',
      items: [{ product_id: '', ordered_quantity: 0, received_quantity: 0, unit_price: 0, batch_number: '', expiry_date: '', notes: '' }]
    });
  };

  const filteredGRNs = grns.filter((grn) => {
    const query = searchTerm.toLowerCase();
    const grnNumber = (grn.grn_number || '').toLowerCase();
    const supplierName = (grn.supplier?.name || '').toLowerCase();
    return grnNumber.includes(query) || supplierName.includes(query);
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Goods Received Notes (GRN)</h1>
          <p className="text-gray-600 mt-1">Record material receipts and update inventory</p>
        </div>
        <PermissionGuard permission="grn:manage">
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create GRN</span>
          </button>
        </PermissionGuard>
      </div>

      {!showForm && (
        <>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by GRN number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">GRN Number</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">GRN Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Supplier Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGRNs.map((grn) => (
                  <tr key={grn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{grn.grn_number}</td>
                    <td className="px-6 py-4">{grn.supplier?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(grn.grn_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{grn.supplier_invoice_number || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${grn.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => setSelectedGRN(grn)} className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">Create Goods Received Note</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Import Data</p>
                      <p className="text-xs text-blue-700">Select an existing purchase order to auto-fill the GRN</p>
                    </div>
                  </div>
                  <div className="w-64">
                    <SearchableDropdown
                      options={purchaseOrders}
                      value={formData.po_id}
                      onChange={handlePOSelect}
                      placeholder="Select Purchase Order"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">GRN Number *</label>
                    <input
                      type="text"
                      value={formData.grn_number}
                      onChange={(e) => setFormData({ ...formData, grn_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                      <span>Supplier *</span>
                      <button
                        type="button"
                        onClick={() => setShowSupplierForm(true)}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        title="Add new supplier"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                    </label>
                    <SearchableDropdown
                      options={suppliers}
                      value={formData.supplier_id}
                      onChange={(value) => setFormData({ ...formData, supplier_id: value })}
                      placeholder="Select supplier"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                      <span>Warehouse</span>
                      <button
                        type="button"
                        onClick={() => setShowWarehouseForm(true)}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        title="Add new warehouse"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                    </label>
                    <SearchableDropdown
                      options={warehouses}
                      value={formData.warehouse_id}
                      onChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                      placeholder="Select warehouse"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">GRN Date *</label>
                    <input
                      type="date"
                      value={formData.grn_date}
                      onChange={(e) => setFormData({ ...formData, grn_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier Invoice No</label>
                    <input
                      type="text"
                      value={formData.supplier_invoice_number}
                      onChange={(e) => setFormData({ ...formData, supplier_invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.supplier_invoice_date}
                      onChange={(e) => setFormData({ ...formData, supplier_invoice_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Received By</label>
                    <input
                      type="text"
                      value={formData.received_by}
                      onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Received Items</h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded bg-gray-50">
                        <div className="col-span-3">
                          <label className="text-xs text-gray-600 flex items-center justify-between">
                            <span>Product</span>
                            <button
                              type="button"
                              onClick={() => { setShowProductForm(true); setCurrentItemIndex(index); }}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                              title="Add new product"
                            >
                              <Plus className="w-3 h-3" /> New
                            </button>
                          </label>
                          <SearchableDropdown
                            options={products}
                            value={item.product_id}
                            onChange={(value) => handleItemChange(index, 'product_id', value)}
                            placeholder="Select product"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs text-gray-600">Ordered</label>
                          <input
                            type="number"
                            value={item.ordered_quantity}
                            onChange={(e) => handleItemChange(index, 'ordered_quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs text-gray-600">Received *</label>
                          <input
                            type="number"
                            value={item.received_quantity}
                            onChange={(e) => handleItemChange(index, 'received_quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full px-2 py-1 border rounded"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600">Unit Price</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border rounded"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600">Batch Number</label>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600">Expiry Date</label>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 px-2 py-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                  />
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
                    <Package className="w-4 h-4" />
                    <span>Create GRN & Update Inventory</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Quick Add Product Modal */}
      {
        showProductForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Quick Add Product</h2>
                  <button
                    type="button"
                    onClick={() => { setShowProductForm(false); setCurrentItemIndex(null); }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Product Name *</label>
                      <input
                        type="text"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">SKU *</label>
                      <input
                        type="text"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Brand</label>
                      <input
                        type="text"
                        value={newProduct.brand}
                        onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                        <span>Category</span>
                        <button
                          type="button"
                          onClick={() => setShowCategoryForm(true)}
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                          title="Add new category"
                        >
                          <Plus className="w-3 h-3" /> New
                        </button>
                      </label>
                      <SearchableDropdown
                        options={categories}
                        value={newProduct.category_id}
                        onChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                        placeholder="Select category"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Unit</label>
                      <select
                        value={newProduct.unit}
                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="piece">Piece</option>
                        <option value="kg">Kilogram</option>
                        <option value="liter">Liter</option>
                        <option value="meter">Meter</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                        <option value="bag">Bag</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Cost Price *</label>
                      <input
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Initial Stock</label>
                      <input
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => { setShowProductForm(false); setCurrentItemIndex(null); }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create & Select Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedGRN && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">GRN Details</h3>
                <button type="button" onClick={() => setSelectedGRN(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <p><span className="font-medium">GRN #:</span> {selectedGRN.grn_number}</p>
                <p><span className="font-medium">Supplier:</span> {selectedGRN.supplier?.name || '-'}</p>
                <p><span className="font-medium">Date:</span> {new Date(selectedGRN.grn_date).toLocaleDateString()}</p>
                <p><span className="font-medium">Status:</span> {selectedGRN.status}</p>
                <p><span className="font-medium">Supplier Invoice:</span> {selectedGRN.supplier_invoice_number || '-'}</p>

                <div className="border rounded overflow-hidden mt-3">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedGRN.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.product?.name || item.product_id}</td>
                          <td className="px-3 py-2">{item.ordered_quantity}</td>
                          <td className="px-3 py-2">{item.received_quantity}</td>
                          <td className="px-3 py-2">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">{item.batch_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Quick Add Category Modal */}
      {
        showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Quick Add Category</h2>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category Name *</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create & Select Category
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Quick Add Supplier Modal */}
      {
        showSupplierForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Quick Add Supplier</h2>
                  <button
                    type="button"
                    onClick={() => setShowSupplierForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSupplier} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Supplier Code *</label>
                      <input
                        type="text"
                        value={newSupplier.supplier_code}
                        onChange={(e) => setNewSupplier({ ...newSupplier, supplier_code: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., SUP001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={newSupplier.contact_person}
                        onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Phone *</label>
                      <input
                        type="tel"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <input
                        type="text"
                        value={newSupplier.address_line1}
                        onChange={(e) => setNewSupplier({ ...newSupplier, address_line1: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <input
                        type="text"
                        value={newSupplier.city}
                        onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">State</label>
                      <input
                        type="text"
                        value={newSupplier.state}
                        onChange={(e) => setNewSupplier({ ...newSupplier, state: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Pincode</label>
                      <input
                        type="text"
                        value={newSupplier.pincode}
                        onChange={(e) => setNewSupplier({ ...newSupplier, pincode: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowSupplierForm(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create & Select Supplier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Quick Add Warehouse Modal */}
      {
        showWarehouseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Quick Add Warehouse</h2>
                  <button
                    type="button"
                    onClick={() => setShowWarehouseForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateWarehouse} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Warehouse Code *</label>
                      <input
                        type="text"
                        value={newWarehouse.code}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., WH001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Warehouse Name *</label>
                      <input
                        type="text"
                        value={newWarehouse.name}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={newWarehouse.address_line1}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, address_line1: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={newWarehouse.address_line2}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, address_line2: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <input
                        type="text"
                        value={newWarehouse.city}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, city: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">State</label>
                      <input
                        type="text"
                        value={newWarehouse.state}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, state: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Pincode</label>
                      <input
                        type="text"
                        value={newWarehouse.pincode}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, pincode: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Manager Name</label>
                      <input
                        type="text"
                        value={newWarehouse.manager_name}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, manager_name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newWarehouse.phone}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowWarehouseForm(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create & Select Warehouse
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
