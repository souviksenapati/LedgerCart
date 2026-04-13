import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) { setCart({ items: [] }); return; }
    try {
      setLoading(true);
      const res = await cartAPI.get();
      setCart(res.data);
    } catch { setCart({ items: [] }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    if (!user) { toast.error('Please login to add items to cart'); return; }
    try {
      await cartAPI.addItem({ product_id: productId, quantity });
      toast.success('Added to cart!');
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart');
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await cartAPI.updateItem(itemId, quantity);
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await cartAPI.removeItem(itemId);
      toast.success('Item removed');
      await fetchCart();
    } catch { toast.error('Failed to remove'); }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart({ items: [] });
    } catch {}
  };

  const itemCount = cart.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const subtotal = cart.items?.reduce((sum, i) => sum + i.product.price * i.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeItem, clearCart, fetchCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
