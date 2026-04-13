import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [tab, setTab] = useState('profile');

  const handleProfile = async (e) => {
    e.preventDefault();
    try {
      const r = await authAPI.updateMe(form);
      updateUser(r.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    try {
      await authAPI.changePassword(pwForm);
      toast.success('Password changed');
      setPwForm({ current_password: '', new_password: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="flex gap-4 mb-6 border-b">
        {['profile', 'password'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 text-sm font-medium capitalize border-b-2 ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleProfile} className="card p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Email</label><input disabled value={user?.email} className="input-field bg-gray-50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">First Name</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Last Name</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handlePassword} className="card p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Current Password</label><input type="password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} className="input-field" required /></div>
          <div><label className="block text-sm font-medium mb-1">New Password</label><input type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} className="input-field" required /></div>
          <button type="submit" className="btn-primary">Change Password</button>
        </form>
      )}
    </div>
  );
}
