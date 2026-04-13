import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { adminAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.settings()
      .then(r => {
        const s = {};
        (r.data || []).forEach(item => { s[item.key] = item.value; });
        setSettings(s);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await adminAPI.updateSetting(entries);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  const fields = [
    { key: 'store_name', label: 'Store Name', type: 'text' },
    { key: 'store_email', label: 'Store Email', type: 'email' },
    { key: 'store_phone', label: 'Store Phone', type: 'text' },
    { key: 'store_address', label: 'Store Address', type: 'textarea' },
    { key: 'company_gstin', label: 'Company GSTIN', type: 'text' },
    { key: 'company_pan', label: 'Company PAN No.', type: 'text' },
    { key: 'bank_name', label: 'Bank Name', type: 'text' },
    { key: 'bank_account_no', label: 'Bank Account No.', type: 'text' },
    { key: 'bank_ifsc', label: 'Bank IFSC Code', type: 'text' },
    { key: 'bank_branch', label: 'Bank Branch', type: 'text' },
    { key: 'store_logo_url', label: 'Store Logo URL', type: 'text' },
    { key: 'signature_stamp_url', label: 'Signature Stamp URL', type: 'text' },
    { key: 'currency', label: 'Currency Symbol', type: 'text' },
    { key: 'tax_percentage', label: 'Tax Percentage (%)', type: 'number' },
    { key: 'shipping_charge', label: 'Default Shipping Charge (₹)', type: 'number' },
    { key: 'free_shipping_above', label: 'Free Shipping Above (₹)', type: 'number' },
    { key: 'low_stock_threshold', label: 'Low Stock Threshold', type: 'number' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <PermissionGuard permission="settings:manage">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </PermissionGuard>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-2xl">
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea rows={3} className="input-field" value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
              ) : f.key.endsWith('_url') ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input type="text" className="input-field flex-1" value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} placeholder="https://..." />
                    <input
                      type="file"
                      id={`file-${f.key}`}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          const res = await uploadAPI.upload(file);
                          update(f.key, res.data.url);
                          toast.success('Image uploaded');
                        } catch {
                          toast.error('Upload failed');
                        }
                      }}
                    />
                    <label htmlFor={`file-${f.key}`} className="btn-secondary whitespace-nowrap cursor-pointer">Upload</label>
                  </div>
                  {settings[f.key] && (
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border w-fit">
                      <img src={settings[f.key]} alt="Preview" className="h-16 w-auto max-w-[160px] object-contain" />
                      <p className="text-xs text-gray-400">Preview</p>
                    </div>
                  )}
                </div>
              ) : (
                <input type={f.type} className="input-field" value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
