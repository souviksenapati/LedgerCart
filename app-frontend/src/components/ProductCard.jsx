import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI } from '../api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const image = product.images?.find(i => i.is_primary)?.image_url || product.images?.[0]?.image_url || 'https://placehold.co/400x400/EEE/999?text=No+Image';
  const discount = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

  const handleAddToCart = async () => {
    setAdding(true);
    await addToCart(product.id);
    setTimeout(() => setAdding(false), 600);
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      if (inWishlist) {
        await wishlistAPI.remove(product.id);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(product.id);
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="card group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200">
      <Link to={`/product/${product.slug}`} className="block relative overflow-hidden rounded-t-xl">
        <img src={image} alt={product.name} className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">{discount}% OFF</span>
        )}
        {product.stock <= 0 && (
          <span className="absolute top-3 right-3 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">Out of Stock</span>
        )}
        {product.is_featured && product.stock > 0 && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Featured</span>
        )}
        <button 
          onClick={toggleWishlist}
          className={`absolute bottom-3 right-3 p-2 rounded-full shadow-lg transition-all ${
            inWishlist ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </Link>

      <div className="p-5">
        <p className="text-xs text-gray-500 mb-1 uppercase font-medium tracking-wide">{product.brand || product.category?.name}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors h-12">{product.name}</h3>
        </Link>

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
          {product.compare_price && (
            <span className="text-sm text-gray-400 line-through">₹{product.compare_price.toLocaleString()}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={handleAddToCart} disabled={product.stock <= 0 || adding}
            className={`flex-1 btn-primary text-sm !py-2.5 flex items-center justify-center gap-2 font-medium transition-all ${adding ? 'bg-green-500 hover:bg-green-600' : ''}`}>
            <ShoppingCart className={`w-4 h-4 ${adding ? 'animate-bounce' : ''}`} /> 
            {adding ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
