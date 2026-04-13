import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../../api';
import ProductCard from '../../components/ProductCard';
import { LoadingSpinner, PageHeader } from '../../components/UI';
import { SlidersHorizontal, X, Package } from 'lucide-react';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  useEffect(() => { categoriesAPI.list().then(r => setCategories(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, page_size: 12, sort };
    if (category) params.category = category;
    if (search) params.search = search;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    productsAPI.list(params).then(r => {
      setProducts(r.data.products);
      setTotal(r.data.total);
      setTotalPages(r.data.total_pages);
    }).finally(() => setLoading(false));
  }, [page, category, search, sort, minPrice, maxPrice]);

  const updateParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const clearFilters = () => setSearchParams({});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader title={search ? `Search: "${search}"` : category ? categories.find(c => c.slug === category)?.name || 'Products' : 'All Products'} subtitle={`${total} products found`}>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => updateParam('sort', e.target.value)} className="input-field !w-auto text-sm">
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="md:hidden btn-secondary text-sm flex items-center gap-1">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </PageHeader>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${filtersOpen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'hidden'} md:block md:relative md:w-64 md:shrink-0`}>
          <div className="flex justify-between items-center mb-4 md:hidden">
            <h3 className="font-bold text-lg">Filters</h3>
            <button onClick={() => setFiltersOpen(false)}><X className="w-6 h-6" /></button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Category</h4>
              <ul className="space-y-1">
                <li><button onClick={() => updateParam('category', '')} className={`text-sm ${!category ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>All Categories</button></li>
                {categories.map(c => (
                  <li key={c.id}><button onClick={() => updateParam('category', c.slug)} className={`text-sm ${category === c.slug ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>{c.name}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Price Range</h4>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" value={minPrice} onChange={e => updateParam('min_price', e.target.value)} className="input-field !text-sm !py-1.5 w-24" />
                <span className="text-gray-400">—</span>
                <input type="number" placeholder="Max" value={maxPrice} onChange={e => updateParam('max_price', e.target.value)} className="input-field !text-sm !py-1.5 w-24" />
              </div>
            </div>

            {(category || search || minPrice || maxPrice) && (
              <button onClick={clearFilters} className="text-sm text-red-600 hover:underline">Clear all filters</button>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? <LoadingSpinner /> : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-xl font-medium mb-2">No products found</p>
              <p className="text-gray-500 mb-6">Try adjusting your filters to find what you're looking for</p>
              <button onClick={clearFilters} className="btn-primary">Clear All Filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10 bg-white p-4 rounded-xl shadow-sm">
                  <button disabled={page <= 1} onClick={() => updateParam('page', page - 1)} 
                    className="btn-secondary text-sm !py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Page</span>
                    <span className="bg-primary-600 text-white px-3 py-1 rounded font-bold">{page}</span>
                    <span className="text-sm text-gray-500">of {totalPages}</span>
                  </div>
                  <button disabled={page >= totalPages} onClick={() => updateParam('page', page + 1)} 
                    className="btn-secondary text-sm !py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
