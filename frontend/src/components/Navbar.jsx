import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingCart, User, Search, Menu, X, Heart, Package, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

export default function Navbar() {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const settings = useSettings();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) { navigate(`/shop?search=${search}`); setSearch(''); }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white text-sm py-2">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <span className="font-medium">📞 +91 98765 43210 | Free delivery on orders above ₹500</span>
          <div className="hidden md:flex gap-6">
            <Link to="/about" className="hover:text-accent-300 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-accent-300 transition-colors">Contact</Link>
            <Link to="/faq" className="hover:text-accent-300 transition-colors">FAQ</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            {settings.store_logo_url
              ? <img src={settings.store_logo_url} alt={settings.store_name || 'LedgerCart'} className="h-10 w-auto" />
              : <img src="/logo.svg" alt={settings.store_name || 'LedgerCart'} className="h-10 w-auto" />
            }
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, brands..." className="input-field pr-12 !py-3 shadow-sm focus:shadow-md transition-shadow" />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-5">
            {user && (
              <Link to="/wishlist" className="hidden md:flex items-center gap-1 text-gray-600 hover:text-primary-600">
                <Heart className="w-5 h-5" />
              </Link>
            )}

            <Link to="/cart" className="relative text-gray-600 hover:text-primary-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span key={itemCount} className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-lg">{itemCount}</span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-1 text-gray-600 hover:text-primary-600">
                  <User className="w-6 h-6" />
                  <span className="hidden md:inline text-sm">{user.first_name}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50" onMouseLeave={() => setProfileOpen(false)}>
                    <Link to="/account" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"><User className="w-4 h-4" /> My Account</Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"><Package className="w-4 h-4" /> My Orders</Link>
                    <Link to="/wishlist" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"><Heart className="w-4 h-4" /> Wishlist</Link>
                    {(isAdmin || isStaff) && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-primary-600"><Shield className="w-4 h-4" /> Admin Panel</Link>
                    )}
                    <hr className="my-1" />
                    <button onClick={() => { logout(); setProfileOpen(false); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-red-600 w-full">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm !py-2 !px-4">Login</Link>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-600">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-3">
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input-field pr-12" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2"><Search className="w-5 h-5 text-gray-400" /></button>
          </div>
        </form>
      </div>

      {/* Category nav */}
      <nav className="border-t hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex gap-6 py-2 text-sm overflow-x-auto">
          <Link to="/shop" className="text-gray-700 hover:text-primary-600 font-medium whitespace-nowrap">All Products</Link>
          <Link to="/shop?category=hand-tools" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Hand Tools</Link>
          <Link to="/shop?category=power-tools" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Power Tools</Link>
          <Link to="/shop?category=plumbing" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Plumbing</Link>
          <Link to="/shop?category=electrical" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Electrical</Link>
          <Link to="/shop?category=paint-supplies" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Paint</Link>
          <Link to="/shop?category=fasteners" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Fasteners</Link>
          <Link to="/shop?category=safety-ppe" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Safety</Link>
          <Link to="/shop?category=building-materials" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Building</Link>
          <Link to="/shop?category=garden-outdoor" className="text-gray-600 hover:text-primary-600 whitespace-nowrap">Garden</Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-2">
          <Link to="/shop" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700">All Products</Link>
          <Link to="/shop?category=hand-tools" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">Hand Tools</Link>
          <Link to="/shop?category=power-tools" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">Power Tools</Link>
          <Link to="/shop?category=electrical" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">Electrical</Link>
          <Link to="/shop?category=plumbing" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">Plumbing</Link>
          <hr />
          <Link to="/about" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">About Us</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-600">Contact</Link>
        </div>
      )}
    </header>
  );
}
