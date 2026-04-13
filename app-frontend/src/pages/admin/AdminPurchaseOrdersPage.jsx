import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Trash2, Search, FileText, Printer } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import PrintDownloadMenu from '../../components/PrintDownloadMenu';
import { generatePurchaseOrderPDF } from '../../utils/pdfGenerator';

export default function AdminPurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    po_number: '',
    supplier_id: '',
    warehouse_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    gst_type: 'cgst_sgst',
    notes: '',
    terms_conditions: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
  });

  const [suppliers, setSuppliers] = useState([]);
  const [rawSuppliers, setRawSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', stock: '', category_id: '', unit: 'piece' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchPOs = async () => {
    try {
      const res = await api.get('/purchases/purchase-orders');
      setPos(res.data);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers/search?limit=100');
      setRawSuppliers(res.data);
      setSuppliers(res.data.map(s => ({
        id: s.id,
        value: s.id,
        label: s.name
      })));
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = rawSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier_id: supplierId,
        terms_conditions: supplier.payment_terms || prev.terms_conditions,
        notes: supplier.address ? `Shipping to: ${supplier.address}` : prev.notes
      }));
    } else {
      setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses/search?limit=100');
      setWarehouses(res.data.map(w => ({
        id: w.id,
        value: w.id,
        label: w.name
      })));
    } catch (error) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?page_size=100');

      console.log('[PO Page] Products API Response:', res.data);

      const productsData = res.data.products || [];
      console.log('[PO Page] Products count:', productsData.length);

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
      setCategories(res.data || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...formData.items];
    newItems[index].product_id = product.value;
    newItems[index].unit_price = product.price;
    setFormData({ ...formData, items: newItems });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error('Product name and price are required');
      return;
    }
    try {
      const slug = newProduct.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const productData = {
        ...newProduct,
        slug,
        sku: newProduct.sku.toUpperCase() || `SKU-${Date.now()}`,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        discount_percentage: 0,
        is_active: true,
        is_featured: false
      };
      const res = await api.post('/products', productData);
      toast.success('Product created');
      fetchProducts();
      setShowProductModal(false);
      setNewProduct({ name: '', sku: '', price: '', stock: '', category_id: '', unit: 'piece' });
      // Auto-select the new product in the last item
      if (formData.items.length > 0) {
        const lastIndex = formData.items.length - 1;
        const newItems = [...formData.items];
        newItems[lastIndex].product_id = res.data.id;
        newItems[lastIndex].unit_price = res.data.price;
        setFormData({ ...formData, items: newItems });
      }
    } catch (err) {
      console.error('Product creation error:', err);
      toast.error(err.response?.data?.detail || 'Failed to create product');
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let lineTaxableTotal = 0;

    formData.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const itemDiscPct = parseFloat(item.discount_percentage) || 0;
      const itemTaxPct = parseFloat(item.tax_percentage) || 18;

      if (item.product_id && qty > 0) {
        const lineGross = qty * price;
        const lineDiscount = lineGross * (itemDiscPct / 100);
        const lineTaxable = lineGross - lineDiscount;
        const lineTax = lineTaxable * (itemTaxPct / 100);

        subtotal += lineGross;
        totalDiscount += lineDiscount;
        lineTaxableTotal += lineTaxable;
        totalTax += lineTax;
      }
    });

    const globalDiscountAmount = lineTaxableTotal * (parseFloat(formData.discount_percentage) / 100);
    const freight = parseFloat(formData.freight_charges) || 0;
    const other = parseFloat(formData.other_charges) || 0;

    // Total Taxable Amount for the whole order
    const taxableAmount = lineTaxableTotal - globalDiscountAmount + freight + other;

    // Split tax based on GST type
    let cgst = 0, sgst = 0, igst = 0;

    if (formData.gst_type === 'cgst_sgst') {
      // Intrastate: Split tax into CGST and SGST (half each)
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    } else {
      // Interstate: All tax goes to IGST
      igst = totalTax;
    }

    const total = taxableAmount + totalTax;

    return {
      subtotal,
      discountAmount: totalDiscount + globalDiscountAmount,
      taxAmount: totalTax,
      cgst,
      sgst,
      igst,
      total
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.po_number || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      // Clean up data
      const data = {
        ...formData,
        po_number: formData.po_number.toUpperCase(),
        warehouse_id: formData.warehouse_id || null, // Convert empty string to null
        expected_delivery_date: formData.expected_delivery_date || null, // Convert empty string to null
        items: formData.items.map(item => ({
          ...item,
          product_id: item.product_id || null // Protective null
        }))
      };

      if (editingPO) {
        await api.put(`/purchases/purchase-orders/${editingPO.id}`, data);
        toast.success('Purchase order updated successfully');
      } else {
        await api.post('/purchases/purchase-orders', data);
        toast.success('Purchase order created successfully');
      }

      setShowForm(false);
      setEditingPO(null);
      resetForm();
      fetchPOs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      supplier_id: '',
      warehouse_id: '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      discount_percentage: 0,
      freight_charges: 0,
      other_charges: 0,
      gst_type: 'cgst_sgst',
      notes: '',
      terms_conditions: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
    });
  };

  const filteredPOs = pos.filter(po => {
    const poNum = (po.po_number || '').toLowerCase();
    const supplierName = (po.supplier?.name || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = poNum.includes(query) || supplierName.includes(query);
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discountAmount, taxAmount, cgst, sgst, igst, total } = calculateTotals();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders</p>
        </div>
        <PermissionGuard permission="purchase_orders:manage">
          <button
            onClick={() => { setShowForm(true); setEditingPO(null); resetForm(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create PO</span>
          </button>
        </PermissionGuard>
      </div>

      {!showForm && (
        <>
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{po.po_number}</td>
                    <td className="px-6 py-4">{po.supplier?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(po.po_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">₹{parseFloat(po.total).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${po.status === 'approved' ? 'bg-green-100 text-green-800' :
                        po.status === 'received' ? 'bg-blue-100 text-blue-800' :
                          po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setSelectedPO(po)} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <PermissionGuard permission="purchase_orders:export">
                          <PrintDownloadMenu
                            documentGenerator={() => generatePurchaseOrderPDF(po)}
                            fileName={`PO-${po.po_number}.pdf`}
                          />
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">{editingPO ? 'Edit' : 'Create'} Purchase Order</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">PO Number *</label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier *</label>
                <SearchableDropdown
                  options={suppliers}
                  value={formData.supplier_id}
                  onChange={handleSupplierSelect}
                  placeholder="Select supplier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Warehouse</label>
                <SearchableDropdown
                  options={warehouses}
                  value={formData.warehouse_id}
                  onChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                  placeholder="Select warehouse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PO Date *</label>
                <input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GST Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gst_type"
                      value="cgst_sgst"
                      checked={formData.gst_type === 'cgst_sgst'}
                      onChange={(e) => setFormData({ ...formData, gst_type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Intrastate (CGST + SGST)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gst_type"
                      value="igst"
                      checked={formData.gst_type === 'igst'}
                      onChange={(e) => setFormData({ ...formData, gst_type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Interstate (IGST)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-3 py-1 bg-gray-50 rounded text-xs font-bold text-gray-600 uppercase">
                <div className="col-span-3">Product</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-1">Price</div>
                <div className="col-span-1.5" style={{ gridColumn: 'span 2' }}>Disc %</div>
                <div className="col-span-1.5" style={{ gridColumn: 'span 1' }}>Taxable</div>
                <div className="col-span-1">Tax %</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.unit_price) || 0;
                  const itemDiscPct = parseFloat(item.discount_percentage) || 0;
                  const itemTaxPct = parseFloat(item.tax_percentage) || 18;

                  const lineGross = qty * price;
                  const lineDiscount = lineGross * (itemDiscPct / 100);
                  const taxable = lineGross - lineDiscount;
                  const lineTax = taxable * (itemTaxPct / 100);
                  const lineTotal = taxable + lineTax;

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded bg-gray-50">
                      <div className="col-span-3">
                        <label className="text-xs text-gray-600 flex items-center justify-between mb-1">
                          <span>Product</span>
                          <button
                            type="button"
                            onClick={() => setShowProductModal(true)}
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                            title="Add new product"
                          >
                            <Plus className="w-3 h-3" /> New
                          </button>
                        </label>
                        <SearchableDropdown
                          options={products}
                          value={item.product_id}
                          onChange={(value) => {
                            const product = products.find(p => p.value === value);
                            if (product) handleProductSelect(index, product);
                          }}
                          placeholder="Select product"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600 block mb-1">Qty</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full px-2 py-1 border rounded"
                          min="1"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600 block mb-1">Price</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border rounded"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 block mb-1">Disc %</label>
                        <input
                          type="number"
                          placeholder="Disc %"
                          value={item.discount_percentage}
                          onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border rounded"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600 block mb-1">Taxable</label>
                        <div className="text-xs font-medium py-2">₹{taxable.toFixed(2)}</div>
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600 block mb-1">Tax %</label>
                        <input
                          type="number"
                          value={item.tax_percentage}
                          onChange={(e) => handleItemChange(index, 'tax_percentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border rounded"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 block mb-1">Total</label>
                        <div className="text-xs font-bold py-2">₹{lineTotal.toFixed(2)}</div>
                      </div>
                      <div className="col-span-1 flex items-center pt-6">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Freight Charges</label>
                  <input
                    type="number"
                    value={formData.freight_charges}
                    onChange={(e) => setFormData({ ...formData, freight_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Charges</label>
                  <input
                    type="number"
                    value={formData.other_charges}
                    onChange={(e) => setFormData({ ...formData, other_charges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-semibold text-red-600">-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight:</span>
                  <span className="font-semibold">₹{parseFloat(formData.freight_charges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Charges:</span>
                  <span className="font-semibold">₹{parseFloat(formData.other_charges || 0).toFixed(2)}</span>
                </div>
                {formData.gst_type === 'cgst_sgst' ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span className="font-semibold">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span className="font-semibold">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span className="font-semibold">₹{igst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingPO(null); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingPO ? 'Update' : 'Create'} Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Creation Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Quick Add Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g., Cement Bag"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.sku}
                    onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.category_id}
                    onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newProduct.unit}
                    onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kg</option>
                    <option value="meter">Meter</option>
                    <option value="liter">Liter</option>
                    <option value="box">Box</option>
                    <option value="set">Set</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setNewProduct({ name: '', sku: '', price: '', stock: '', category_id: '', unit: 'piece' });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PO Detail Modal */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Purchase Order — {selectedPO.po_number}</h2>
              <button onClick={() => setSelectedPO(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{selectedPO.supplier?.name || '-'}</span></div>
              <div><span className="text-gray-500">Warehouse:</span> <span className="font-medium">{selectedPO.warehouse?.name || '-'}</span></div>
              <div><span className="text-gray-500">PO Date:</span> <span className="font-medium">{new Date(selectedPO.po_date).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">Expected Delivery:</span> <span className="font-medium">{selectedPO.expected_delivery_date ? new Date(selectedPO.expected_delivery_date).toLocaleDateString() : '-'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedPO.status === 'approved' ? 'bg-green-100 text-green-700' : selectedPO.status === 'received' ? 'bg-blue-100 text-blue-700' : selectedPO.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{selectedPO.status?.toUpperCase()}</span></div>
              <div><span className="text-gray-500">GST Type:</span> <span className="font-medium">{selectedPO.gst_type?.toUpperCase() || '-'}</span></div>
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Unit Price</th>
                  <th className="text-right p-2">Total</th>
                </tr></thead>
                <tbody>{(selectedPO.items || []).map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{item.product?.name || item.product_id}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold">₹{parseFloat(item.line_total || (item.unit_price * item.quantity) || 0).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex justify-between text-lg font-bold text-blue-700 border-t pt-3">
              <span>Total</span><span>₹{parseFloat(selectedPO.total || 0).toLocaleString()}</span>
            </div>
            {selectedPO.notes && <p className="text-sm text-gray-500 mt-3"><span className="font-medium">Notes:</span> {selectedPO.notes}</p>}
            {selectedPO.terms_conditions && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Terms:</span> {selectedPO.terms_conditions}</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setSelectedPO(null)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
