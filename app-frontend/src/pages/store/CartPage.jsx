import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '../../components/UI';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, subtotal } = useCart();
  const shipping = subtotal >= 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  if (loading) return <LoadingSpinner />;
  if (!cart.items?.length) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <EmptyState icon={ShoppingBag} title="Your cart is empty" message="Looks like you haven't added any items yet."
        action={<Link to="/shop" className="btn-primary">Start Shopping</Link>} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart ({cart.items.length} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="card p-4 flex gap-4">
              <Link to={`/product/${item.product.slug}`} className="shrink-0">
                <img src={item.product.images?.[0]?.image_url || 'https://placehold.co/100x100'} alt="" className="w-24 h-24 object-cover rounded-lg" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product.slug}`} className="font-medium text-gray-900 hover:text-primary-600 line-clamp-1">{item.product.name}</Link>
                <p className="text-sm text-gray-500">{item.product.brand}</p>
                <p className="font-bold text-lg mt-1">₹{item.product.price.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
                  <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    title={item.quantity >= item.product.stock ? `Max ${item.product.stock} in stock` : ''}
                    className="px-2 py-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  ><Plus className="w-4 h-4" /></button>
                </div>
                <p className="font-semibold">₹{(item.product.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-6 h-fit sticky top-24">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{shipping === 0 ? <span className="text-green-600">Free</span> : `₹${shipping}`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">GST (18%)</span><span>₹{tax.toLocaleString()}</span></div>
            <hr />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
          </div>
          {shipping > 0 && <p className="text-xs text-gray-500 mt-2">Add ₹{(500 - subtotal).toLocaleString()} more for free shipping</p>}
          <Link to="/checkout" className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/shop" className="block text-center text-sm text-primary-600 hover:underline mt-3">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
