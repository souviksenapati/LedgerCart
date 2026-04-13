import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wishlistAPI } from '../../api';
import { useCart } from '../../context/CartContext';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '../../components/UI';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  const fetch = () => { wishlistAPI.list().then(r => setItems(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const remove = async (productId) => {
    await wishlistAPI.remove(productId);
    toast.success('Removed from wishlist');
    fetch();
  };

  if (loading) return <LoadingSpinner />;
  if (!items.length) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <EmptyState icon={Heart} title="Wishlist is empty" message="Save products you like for later." action={<Link to="/shop" className="btn-primary">Browse Products</Link>} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="card group">
            <Link to={`/product/${item.product.slug}`} className="block">
              <img src={item.product.images?.[0]?.image_url || 'https://placehold.co/300x300'} alt="" className="w-full h-48 object-cover" />
            </Link>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
              <p className="font-bold mt-1">₹{item.product.price.toLocaleString()}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => addToCart(item.product.id)} className="btn-primary text-xs !py-1.5 flex-1 flex items-center justify-center gap-1"><ShoppingCart className="w-3 h-3" /> Add</button>
                <button onClick={() => remove(item.product_id)} className="btn-secondary text-xs !py-1.5 !px-2"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
