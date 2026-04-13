import { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = () => {
    setLoading(true);
    adminAPI.customers({ search })
      .then(r => setCustomers(r.data || []))
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const toggleStatus = async (id) => {
    try {
      await adminAPI.toggleCustomer(id);
      toast.success('Customer status updated');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th><th className="text-left p-3">Orders</th>
              <th className="text-left p-3">Joined</th><th className="text-left p-3">Status</th>
              <PermissionGuard permission="ecom_customers:manage">
                <th className="text-left p-3">Actions</th>
              </PermissionGuard>
            </tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.phone || '-'}</td>
                  <td className="p-3">{c.order_count || 0}</td>
                  <td className="p-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <PermissionGuard permission="ecom_customers:manage">
                    <td className="p-3">
                      <button onClick={() => toggleStatus(c.id)} className={`text-sm ${c.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`} title={c.is_active ? 'Deactivate' : 'Activate'}>
                        {c.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </td>
                  </PermissionGuard>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <p className="p-6 text-center text-gray-400">No customers found</p>}
        </div>
      )}
    </div>
  );
}
