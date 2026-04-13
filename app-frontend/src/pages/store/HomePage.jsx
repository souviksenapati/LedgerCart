import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, categoriesAPI, bannersAPI } from '../../api';
import ProductCard from '../../components/ProductCard';
import { Truck, Shield, Clock, CreditCard, ChevronRight, Wrench, Zap, Droplets, Lightbulb } from 'lucide-react';
import { LoadingSpinner } from '../../components/UI';

const categoryIcons = { 'hand-tools': Wrench, 'power-tools': Zap, 'plumbing': Droplets, 'electrical': Lightbulb };

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsAPI.list({ featured: true, page_size: 8 }),
      categoriesAPI.list(),
      bannersAPI.list()
    ]).then(([prod, cat, ban]) => {
      setFeatured(prod.data.products);
      setCategories(cat.data);
      setBanners(ban.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setActiveBanner(p => (p + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-gray-50">
      {/* Hero Banner */}
      {banners.length > 0 && (
        <section className="relative bg-gray-900 overflow-hidden" style={{ height: '500px' }}>
          {banners.map((b, i) => (
            <Link key={b.id} to={b.link_url || '/shop'} className={`absolute inset-0 transition-opacity duration-1000 ${i === activeBanner ? 'opacity-100' : 'opacity-0'}`}>
              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center">
                <div className="max-w-7xl mx-auto px-6 text-white">
                  <h2 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">{b.title}</h2>
                  <p className="text-xl md:text-2xl mb-8 opacity-95 max-w-2xl">{b.subtitle}</p>
                  <span className="btn-accent inline-flex items-center gap-2 text-lg px-8 py-4 shadow-2xl hover:shadow-accent-400/50">Shop Now <ChevronRight className="w-5 h-5" /></span>
                </div>
              </div>
            </Link>
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setActiveBanner(i)} className={`w-3 h-3 rounded-full transition-all ${i === activeBanner ? 'bg-white w-8' : 'bg-white/60'}`} />
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-10 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹500' },
            { icon: Shield, title: 'Genuine Products', desc: '100% authentic brands' },
            { icon: Clock, title: 'Fast Dispatch', desc: 'Orders shipped in 24hrs' },
            { icon: CreditCard, title: 'Secure Payment', desc: 'COD & online options' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <f.icon className="w-12 h-12 text-primary-600 shrink-0 group-hover:scale-110 transition-transform" />
              <div><p className="font-bold text-gray-900">{f.title}</p><p className="text-sm text-gray-600">{f.desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-600 mt-1">Browse our wide range of hardware products</p>
          </div>
          <Link to="/shop" className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {categories.slice(0, 10).map(cat => {
            const Icon = categoryIcons[cat.slug] || Wrench;
            return (
              <Link key={cat.id} to={`/shop?category=${cat.slug}`} className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group bg-white border border-gray-200">
                <Icon className="w-14 h-14 text-primary-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-gray-800">{cat.name}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-600 mt-1">Hand-picked popular items just for you</p>
          </div>
          <Link to="/shop?featured=true" className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Need Help Choosing the Right Tool?</h2>
          <p className="text-xl opacity-95 mb-10 max-w-2xl mx-auto">Our experts are here to help you find the perfect hardware for your project. Call us or visit our store.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact" className="btn-accent px-8 py-4 text-lg shadow-2xl hover:shadow-accent-400/50">Contact Us</Link>
            <Link to="/shop" className="bg-white text-primary-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all hover:shadow-xl text-lg">Browse Products</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
