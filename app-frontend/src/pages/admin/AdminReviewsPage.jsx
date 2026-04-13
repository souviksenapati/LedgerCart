import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Clock } from 'lucide-react';
import { reviewsAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';
import PermissionGuard from '../../components/PermissionGuard';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const fetchReviews = () => {
    setLoading(true);
    reviewsAPI.pending()
      .then(r => setReviews(r.data || []))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); }, [tab]);

  const approve = async (id) => {
    try { await reviewsAPI.approve(id); toast.success('Approved'); fetchReviews(); } catch { toast.error('Failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this review?')) return;
    try { await reviewsAPI.delete(id); toast.success('Deleted'); fetchReviews(); } catch { toast.error('Failed'); }
  };

  const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('pending')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
          <Clock className="w-3 h-3 inline mr-1" /> Pending
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'all' ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
          All Reviews
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{r.user?.name || 'Customer'}</p>
                    <span className="text-yellow-500 text-sm">{renderStars(r.rating)}</span>
                    {!r.is_approved && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Product: {r.product?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600 mt-2">{r.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <PermissionGuard permission="reviews:manage">
                  <div className="flex items-center gap-2">
                    {!r.is_approved && (
                      <button onClick={() => approve(r.id)} className="text-green-500 hover:text-green-700" title="Approve">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </PermissionGuard>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-gray-400 text-center py-8">{tab === 'pending' ? 'No pending reviews' : 'No reviews yet'}</p>}
        </div>
      )}
    </div>
  );
}
