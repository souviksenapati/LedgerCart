import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Shield, Search, RotateCcw, ChevronDown, ChevronRight, X, Check, UserCog } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Role metadata ─────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'STORE_MANAGER', label: 'Store Manager', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'SALESPERSON', label: 'Salesperson', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'PURCHASE_MANAGER', label: 'Purchase Manager', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'STOCK_KEEPER', label: 'Stock Keeper', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'ACCOUNTANT', label: 'Accountant', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'STAFF', label: 'Staff', color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

const getRoleDisplay = (role) => ROLE_OPTIONS.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-600 border-gray-200' };

// ─── Permission Hierarchy (mirrors backend) ────────
const PERMISSION_HIERARCHY = {
  manage: ['view', 'export'],
  approve: ['view'],
  void: ['view'],
  audit: ['view'],
  export: ['view']
};


export default function AdminStaffPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('staff:manage');

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role: 'STAFF', department: '', salary: '', is_active: true,
    permissions: [],
  });

  // Permission templates fetched from backend
  const [allPermissions, setAllPermissions] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState({});
  const [expandedModules, setExpandedModules] = useState({});

  // ─── Data Fetching ───────────────────────────────
  const fetchStaff = () => {
    setLoading(true);
    adminAPI.staff()
      .then(r => setStaff(r.data || []))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  };

  const fetchTemplates = () => {
    adminAPI.permissionTemplates()
      .then(r => {
        setAllPermissions(r.data.all_permissions || []);
        setRoleTemplates(r.data.role_templates || {});
      })
      .catch(() => { /* Silently fail — page still works, just no templates */ });
  };

  useEffect(() => { fetchStaff(); fetchTemplates(); }, []);

  // ─── Grouped permissions by module ───────────────
  const permissionsByModule = useMemo(() => {
    const groups = {};
    allPermissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [allPermissions]);

  // ─── Filtered staff ──────────────────────────────
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
      const email = (s.user?.email || '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || s.user?.role === roleFilter || s.staff_role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staff, search, roleFilter]);

  // ─── Permission toggle logic ─────────────────────
  const togglePermission = (permKey) => {
    const current = [...form.permissions];
    const parts = permKey.split(':');
    if (parts.length !== 2) return;
    const [mod, action] = parts;

    if (current.includes(permKey)) {
      // Removing a permission
      const next = current.filter(p => p !== permKey);
      // If removing a "manage" perm, also remove any actions it implies
      const implied = PERMISSION_HIERARCHY[action] || [];
      // DON'T auto-remove view — user might need view-only
      setForm({ ...form, permissions: next });
    } else {
      // Adding a permission
      let next = [...current, permKey];
      // If adding "manage", also auto-add implied "view"
      const implied = PERMISSION_HIERARCHY[action] || [];
      implied.forEach(imp => {
        const impliedKey = `${mod}:${imp}`;
        if (!next.includes(impliedKey)) next.push(impliedKey);
      });
      setForm({ ...form, permissions: next });
    }
  };

  const applyTemplate = (role) => {
    const template = roleTemplates[role] || [];
    setForm({ ...form, permissions: [...template] });
    toast.success(`Applied ${getRoleDisplay(role).label} template`);
  };

  // ─── Modal open/close ────────────────────────────
  const openCreate = () => {
    setEditing(null);
    const defaultPerms = roleTemplates['STAFF'] || [];
    setForm({
      first_name: '', last_name: '', email: '', phone: '', password: '',
      role: 'STAFF', department: '', salary: '', is_active: true,
      permissions: [...defaultPerms],
    });
    setExpandedModules({});
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      first_name: s.user?.first_name || '',
      last_name: s.user?.last_name || '',
      email: s.user?.email || '',
      phone: s.user?.phone || '',
      password: '',
      role: s.user?.role || s.staff_role || 'STAFF',
      department: s.department || '',
      salary: s.salary || '',
      is_active: s.is_active,
      permissions: s.permissions || [],
    });
    setExpandedModules({});
    setShowForm(true);
  };

  // ─── Form Submission ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const data = {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role: form.role,
          department: form.department,
          salary: form.salary ? parseFloat(form.salary) : null,
          is_active: form.is_active,
          permissions: form.permissions,
        };
        await adminAPI.updateStaff(editing.id, data);
        toast.success('Staff updated');
      } else {
        const data = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          department: form.department,
          salary: form.salary ? parseFloat(form.salary) : null,
          permissions: form.permissions,
        };
        await adminAPI.createStaff(data);
        toast.success('Staff created');
      }
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await adminAPI.removeStaff(id);
      toast.success('Removed');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const toggleModule = (mod) => {
    setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  // Count active permissions per module for a staff member
  const getPermCount = (perms) => {
    if (!perms || perms.includes('*')) return allPermissions.length || '∞';
    return perms.length;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-primary-500" /> Staff Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">{staff.length} staff members • Role-based access control</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="input-field w-full sm:w-48"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Staff Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-600">Name</th>
                <th className="text-left p-3 font-semibold text-gray-600">Email</th>
                <th className="text-left p-3 font-semibold text-gray-600">Role</th>
                <th className="text-left p-3 font-semibold text-gray-600">Permissions</th>
                <th className="text-left p-3 font-semibold text-gray-600">Department</th>
                <th className="text-left p-3 font-semibold text-gray-600">Status</th>
                {canManage && <th className="text-left p-3 font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map(s => {
                const role = getRoleDisplay(s.user?.role || s.staff_role);
                const permCount = getPermCount(s.permissions);
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{s.user?.first_name} {s.user?.last_name}</div>
                      <div className="text-xs text-gray-400">{s.user?.phone || ''}</div>
                    </td>
                    <td className="p-3 text-gray-600">{s.user?.email}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${role.color}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">{permCount} permissions</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{s.department || '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="p-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <p className="p-8 text-center text-gray-400">
              {search || roleFilter !== 'all' ? 'No staff match your filters' : 'No staff members yet'}
            </p>
          )}
        </div>
      )}

      {/* ─── Create/Edit Modal ─────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">{editing ? 'Edit Staff Member' : 'Add New Staff'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body — Scrollable */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-6">

                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">First Name *</label>
                      <input className="input-field w-full" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                      <input className="input-field w-full" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                    {!editing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Email *</label>
                        <input type="email" className="input-field w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <input className="input-field w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    {!editing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Password *</label>
                        <input type="password" className="input-field w-full" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Department</label>
                      <input className="input-field w-full" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Salary (₹)</label>
                      <input type="number" className="input-field w-full" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                    </div>
                    {editing && (
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                        Active
                      </label>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Role & Permissions</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ROLE_OPTIONS.filter(r => r.value !== 'ADMIN').map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, role: r.value });
                          applyTemplate(r.value);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${form.role === r.value
                          ? `${r.color} ring-2 ring-offset-1 ring-primary-300`
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Apply Template button */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => applyTemplate(form.role)}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset to {getRoleDisplay(form.role).label} template
                    </button>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{form.permissions.length} permissions selected</span>
                  </div>

                  {/* Permission Matrix */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {Object.entries(permissionsByModule).map(([module, perms]) => {
                      const isExpanded = expandedModules[module] !== false; // default open
                      const activeCount = perms.filter(p => form.permissions.includes(p.key)).length;

                      return (
                        <div key={module} className="border-b border-gray-100 last:border-b-0">
                          {/* Module Header */}
                          <button
                            type="button"
                            onClick={() => toggleModule(module)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                              <span className="font-medium text-gray-700 text-sm">{module}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeCount === perms.length ? 'bg-emerald-100 text-emerald-700' : activeCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                              {activeCount}/{perms.length}
                            </span>
                          </button>

                          {/* Module Permissions */}
                          {isExpanded && (
                            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {perms.map(p => {
                                const isActive = form.permissions.includes(p.key);
                                const parts = p.key.split(':');
                                const isManage = parts[1] === 'manage';

                                return (
                                  <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => togglePermission(p.key)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all border ${isActive
                                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                                      : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                                      }`}
                                  >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary-500 text-white' : 'border-2 border-gray-300'}`}>
                                      {isActive && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{p.label}</div>
                                      <div className="text-xs text-gray-400 font-mono">{p.key}</div>
                                    </div>
                                    {PERMISSION_HIERARCHY[parts[1]] && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium flex-shrink-0">
                                        {PERMISSION_HIERARCHY[parts[1]].map(i => `+${i}`).join(' ')}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50/50">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Create Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
