import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';
import type { Category, Product } from '../types/store.ts';

interface ShopPageProps {
  initialCategory?: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function ShopPage({
  initialCategory = 'all',
  pageTitle = 'All Collections',
  pageSubtitle = 'Explore precision watches, eyewear, leathercraft, footwear, and menswear.',
}: ShopPageProps) {
  const { route, categories: contextCategories } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(contextCategories);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(route.split('?')[1] || '');
  const initialQuery = urlParams.get('q') || '';

  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState('newest');
  const [maxPrice, setMaxPrice] = useState<number>(50000);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const q = new URLSearchParams(route.split('?')[1] || '').get('q') || '';
    setSearch(q);
  }, [route]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (selectedCategory && selectedCategory !== 'all') {
          params.set('category', selectedCategory);
        }
        params.set('sort', sort);
        params.set('maxPrice', String(maxPrice));
        const res = await apiFetch<{ products: Product[]; categories: Category[] }>(
          `/api/products?${params.toString()}`
        );
        if (!active) return;
        setProducts(res.products);
        if (res.categories?.length) setCategories(res.categories);
      } catch (err) {
        console.error('Shop load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [search, selectedCategory, sort, maxPrice]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === selectedCategory),
    [categories, selectedCategory]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          PRINCE STAR Atelier
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">
          {activeCategoryObj ? activeCategoryObj.name : pageTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] mt-2 max-w-2xl">
          {activeCategoryObj?.description || pageSubtitle}
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                : 'bg-[#F2EFE8] dark:bg-[#1C1B18] text-[#44403C] dark:text-[#D6D3D1] hover:opacity-80'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                  : 'bg-[#F2EFE8] dark:bg-[#1C1B18] text-[#44403C] dark:text-[#D6D3D1] hover:opacity-80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-56 min-w-0">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or SKU..."
              className="w-full pl-9 pr-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs focus:outline-none focus:border-[#A67C2E] dark:focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#78716C]" />
            <label htmlFor="price-cap" className="text-[#78716C] whitespace-nowrap">
              Max: PKR {maxPrice.toLocaleString()}
            </label>
            <input
              id="price-cap"
              type="range"
              min={2000}
              max={50000}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-24 accent-[#A67C2E] dark:accent-[#D4AF37]"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-medium focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-80 rounded-lg bg-[#EFECE5] dark:bg-[#181715] animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E8E3D9] dark:border-[#2C2A25] rounded-lg space-y-3">
          <p className="font-display text-2xl font-semibold">No matching pieces found</p>
          <p className="text-sm text-[#78716C]">
            Try clearing your filters or searching for another item.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setMaxPrice(50000);
            }}
            className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
