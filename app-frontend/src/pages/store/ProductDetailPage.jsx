import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productsAPI, reviewsAPI } from '../../api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import { ShoppingCart, Heart, Minus, Plus, Star, Check, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    setLoading(true);
    productsAPI.get(slug).then(r => {
      setProduct(r.data);
      return reviewsAPI.getForProduct(r.data.id);
    }).then(r => setReviews(r.data)).finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    setQuantity(1);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await reviewsAPI.add(product.id, reviewForm);
      toast.success('Review submitted! It will appear after approval.');
      setReviewForm({ rating: 5, title: '', comment: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return <div className="text-center py-16"><p className="text-gray-500">Product not found</p></div>;

  const images = product.images?.length > 0 ? product.images : [{ image_url: 'https://placehold.co/600x600/EEE/999?text=No+Image' }];
  const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link> / <Link to="/shop" className="hover:text-primary-600">Shop</Link>
        {product.category && <> / <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary-600">{product.category.name}</Link></>}
        <span className="text-gray-400"> / {product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Images */}
        <div>
          <div className="card mb-3">
            <img src={images[activeImage]?.image_url} alt={product.name} className="w-full h-96 object-contain p-4" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`w-20 h-20 rounded-lg border-2 overflow-hidden shrink-0 ${i === activeImage ? 'border-primary-500' : 'border-gray-200'}`}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-primary-600 font-medium mb-1">{product.brand}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-yellow-400">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-current' : ''}`} />)}</div>
              <span className="text-sm text-gray-600">{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}

          <p className="text-gray-600 mb-4">{product.short_description}</p>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
            {product.compare_price && (
              <>
                <span className="text-lg text-gray-400 line-through">₹{product.compare_price.toLocaleString()}</span>
                <span className="badge bg-green-100 text-green-800">{discount}% off</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            {product.stock > 0 ? (
              <span className="flex items-center gap-1 text-green-600 text-sm"><Check className="w-4 h-4" /> In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-600 text-sm font-medium">Out of Stock</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Truck className="w-4 h-4" /> Free delivery on orders above ₹500
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-3 py-2 hover:bg-gray-100"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleAddToCart} disabled={product.stock <= 0} className="btn-primary flex items-center gap-2 flex-1">
              <ShoppingCart className="w-5 h-5" /> Add to Cart
            </button>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p><strong>SKU:</strong> {product.sku}</p>
            <p><strong>Category:</strong> {product.category?.name || 'N/A'}</p>
            {product.tags && <p><strong>Tags:</strong> {product.tags}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-8">
          {['description', 'reviews'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t} {t === 'reviews' ? `(${reviews.length})` : ''}</button>
          ))}
        </div>
      </div>

      {tab === 'description' && (
        <div className="prose max-w-none text-gray-600">
          <p>{product.description || 'No description available.'}</p>
        </div>
      )}

      {tab === 'reviews' && (
        <div>
          {reviews.map(r => (
            <div key={r.id} className="border-b py-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex text-yellow-400">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : ''}`} />)}</div>
                <span className="font-medium text-sm">{r.user?.first_name || 'User'}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.title && <p className="font-medium">{r.title}</p>}
              <p className="text-gray-600 text-sm">{r.comment}</p>
            </div>
          ))}

          {user && (
            <form onSubmit={handleReview} className="mt-8 card p-6">
              <h3 className="font-semibold mb-4">Write a Review</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Rating</label>
                <div className="flex gap-1">{[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setReviewForm({...reviewForm, rating: n})}>
                    <Star className={`w-6 h-6 ${n <= reviewForm.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  </button>
                ))}</div>
              </div>
              <input value={reviewForm.title} onChange={e => setReviewForm({...reviewForm, title: e.target.value})} placeholder="Review title" className="input-field mb-3" />
              <textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} placeholder="Your review..." rows={3} className="input-field mb-3" />
              <button type="submit" className="btn-primary">Submit Review</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
