import { Loader } from 'lucide-react';

export function LoadingSpinner({ className = '' }) {
  return (
    <div className={`flex justify-center items-center py-12 ${className}`}>
      <Loader className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-primary-100 text-primary-800',
  };
  return (
    <span className={`badge ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}
