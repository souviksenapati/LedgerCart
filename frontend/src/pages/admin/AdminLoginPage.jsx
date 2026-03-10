import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, User, Terminal } from 'lucide-react';

export default function AdminLoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(form.email, form.password, 'admin');

            // Accept any non-customer portal role
            if (user.role !== 'CUSTOMER') {
                toast.success(`Access Granted: ${user.first_name}`);
                navigate('/admin');
            } else {
                toast.error('Unauthorized: Staff access only.');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.reload();
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Portal access failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-primary-500/20">
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white text-center">
                    <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                        <Terminal className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold">Admin Portal</h1>
                    <p className="text-primary-100 text-sm mt-1">Inventory Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Internal Email</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="input-field pl-10 h-12 bg-gray-50 focus:bg-white"
                                    placeholder="name@ledgercart.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="input-field pl-10 h-12 bg-gray-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full h-12 text-lg shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5"
                    >
                        {loading ? 'Authenticating...' : 'Enter Portal'}
                    </button>

                    <div className="text-center">
                        <p className="text-xs text-gray-400 italic">Unauthorized access is monitored and logged.</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
