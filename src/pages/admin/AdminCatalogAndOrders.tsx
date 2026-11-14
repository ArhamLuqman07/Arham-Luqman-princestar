import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Package,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import { SafeImage } from '../../components/SafeImage.tsx';
import { apiFetch, formatPKR } from '../../lib/api.ts';
import { BUILTIN_GALLERY_OPTIONS } from '../../lib/media.ts';
import { downloadOrderInvoicePDF } from '../../lib/reports.ts';
import type { Category, Order, Product, ProductVariant } from '../../types/store.ts';

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Ready for Dispatch',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

export function AdminProductsPanel({
  products,
  categories,
  onRefresh,
  notify,
}: {
  products: Product[];
  categories: Category[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing({
      name: '',
      sku: `PS-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      categoryId: categories[0]?.id || null,
      subcategory: '',
      regularPrice: 10000,
      salePrice: null,
      costPrice: 5000,
      images: [BUILTIN_GALLERY_OPTIONS[3]?.key || ''],
      colors: ['Obsidian Black'],
      sizes: ['Standard'],
      variants: [],
      stockQuantity: 10,
      lowStockThreshold: 5,
      isAvailable: true,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isSpecialOffer: false,
      specifications: [{ label: 'Material', value: 'Premium Grade' }],
      warrantyInfo: '1-Year Official Brand Warranty',
      shippingInfo: 'Nationwide delivery across Pakistan within 2-4 business days.',
      seoTitle: '',
      seoDescription: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      if (editing.id) {
        await apiFetch(`/api/admin/products/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(editing),
        });
        notify('Product updated.', 'success');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(editing),
        });
        notify('Product created.', 'success');
      }
      setEditing(null);
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      notify('Product deleted.', 'info');
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Product Catalog</h2>
          <p className="text-xs text-[#78716C]">{products.length} products in database</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3 text-right">Regular</th>
              <th className="p-3 text-right">Sale</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#181715]">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-9 rounded overflow-hidden bg-[#EFECE5] shrink-0">
                      <SafeImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-[11px] text-[#78716C]">
                        {categories.find((c) => c.id === p.categoryId)?.name || 'Uncategorized'}
                        {p.isDemo ? ' · Demo' : ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-mono">{p.sku}</td>
                <td className="p-3 text-right font-mono tabular-nums">{formatPKR(p.regularPrice)}</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {p.salePrice ? formatPKR(p.salePrice) : '—'}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">{formatPKR(p.costPrice)}</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  <span
                    className={
                      p.stockQuantity <= p.lowStockThreshold ? 'text-amber-600 font-semibold' : ''
                    }
                  >
                    {p.stockQuantity}
                  </span>
                </td>
                <td className="p-3">{p.isAvailable ? 'Active' : 'Hidden'}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] hover:border-[#A67C2E]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E8E3D9] dark:border-[#262420] pb-3">
              <h3 className="font-display text-2xl font-semibold">
                {editing.id ? 'Edit Product' : 'New Product'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={editing.sku || ''}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={editing.categoryId || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      categoryId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((c) => !c.isSpecialCollection)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Subcategory</label>
                <input
                  type="text"
                  value={editing.subcategory || ''}
                  onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">Regular Price (PKR) *</label>
                <input
                  type="number"
                  required
                  value={editing.regularPrice || 0}
                  onChange={(e) => setEditing({ ...editing, regularPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Sale Price (PKR)</label>
                <input
                  type="number"
                  value={editing.salePrice || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      salePrice: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Purchase Cost (COGS)</label>
                <input
                  type="number"
                  value={editing.costPrice || 0}
                  onChange={(e) => setEditing({ ...editing, costPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Stock Qty</label>
                <input
                  type="number"
                  value={editing.stockQuantity || 0}
                  onChange={(e) => setEditing({ ...editing, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description *</label>
              <textarea
                rows={3}
                required
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>

            {/* Image Gallery Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium">
                Product Image URL(s) (comma-separated or select studio image)
              </label>
              <input
                type="text"
                value={(editing.images || []).join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    images: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-mono"
              />
              <div className="flex flex-wrap gap-2">
                {BUILTIN_GALLERY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        images: Array.from(new Set([...(editing.images || []), opt.key])),
                      })
                    }
                    className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-[11px] hover:border-[#A67C2E]"
                  >
                    + {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Variant quick builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Variants (Color / Size / Stock)</label>
                <button
                  type="button"
                  onClick={() => {
                    const next: ProductVariant[] = [
                      ...(editing.variants || []),
                      {
                        id: `v-${Date.now()}`,
                        name: 'Standard Variant',
                        skuSuffix: 'STD',
                        stock: 5,
                        priceAdjust: 0,
                      },
                    ];
                    setEditing({ ...editing, variants: next });
                  }}
                  className="text-xs font-semibold text-[#A67C2E] dark:text-[#D4AF37]"
                >
                  + Add Variant
                </button>
              </div>
              {(editing.variants || []).map((v, idx) => (
                <div key={v.id} className="grid grid-cols-4 gap-2 text-xs">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => {
                      const next = [...(editing.variants || [])];
                      next[idx] = { ...v, name: e.target.value };
                      setEditing({ ...editing, variants: next });
                    }}
                    placeholder="Variant Name"
                    className="col-span-2 px-2 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <input
                    type="number"
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...(editing.variants || [])];
                      next[idx] = { ...v, stock: Number(e.target.value) };
                      setEditing({ ...editing, variants: next });
                    }}
                    placeholder="Stock"
                    className="px-2 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        variants: (editing.variants || []).filter((_, i) => i !== idx),
                      })
                    }
                    className="text-red-600 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4 text-xs pt-2">
              {[
                { key: 'isAvailable', label: 'Available' },
                { key: 'isFeatured', label: 'Featured' },
                { key: 'isBestSeller', label: 'Best Seller' },
                { key: 'isNewArrival', label: 'New Arrival' },
                { key: 'isSpecialOffer', label: 'Special Offer' },
              ].map((flag) => (
                <label key={flag.key} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(editing[flag.key as keyof Product])}
                    onChange={(e) =>
                      setEditing({ ...editing, [flag.key]: e.target.checked })
                    }
                    className="accent-[#A67C2E]"
                  />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={editing.warrantyInfo || ''}
                onChange={(e) => setEditing({ ...editing, warrantyInfo: e.target.value })}
                placeholder="Warranty Info"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
              <input
                type="text"
                value={editing.seoTitle || ''}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                placeholder="SEO Title"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E8E3D9] dark:border-[#262420]">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminCategoriesPanel({
  categories,
  onRefresh,
  notify,
}: {
  categories: Category[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [form, setForm] = useState<Partial<Category> | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      if (form.id) {
        await apiFetch(`/api/admin/categories/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setForm(null);
      notify('Category saved.', 'success');
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to save category.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    notify('Category deleted.', 'info');
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Categories</h2>
        <button
          type="button"
          onClick={() =>
            setForm({
              name: '',
              slug: '',
              description: '',
              imageUrl: BUILTIN_GALLERY_OPTIONS[3]?.key || '',
              sortOrder: categories.length + 1,
              isVisible: true,
              isSpecialCollection: false,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Visibility</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono">{c.sortOrder}</td>
                <td className="p-3 font-semibold text-sm">{c.name}</td>
                <td className="p-3 font-mono text-[#78716C]">{c.slug}</td>
                <td className="p-3">{c.isVisible ? 'Visible' : 'Hidden'}</td>
                <td className="p-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => setForm(c)}
                    className="p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-display text-2xl font-semibold">
              {form.id ? 'Edit Category' : 'Add Category'}
            </h3>
            <input
              type="text"
              required
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Category Name"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
            <input
              type="text"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.sortOrder || 0}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                placeholder="Sort Order"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.isVisible !== false}
                  onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                />
                Visible on storefront
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminInventoryPanel({
  products,
  onRefresh,
  notify,
}: {
  products: Product[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, { stock: number; threshold: number }>>({});

  const totalUnits = products.reduce((s, p) => s + p.stockQuantity, 0);
  const totalCostValue = products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0);

  const handleSaveStock = async (p: Product) => {
    const d = drafts[p.id] || { stock: p.stockQuantity, threshold: p.lowStockThreshold };
    await apiFetch(`/api/admin/inventory/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stockQuantity: d.stock,
        lowStockThreshold: d.threshold,
        isAvailable: d.stock > 0 ? p.isAvailable : false,
      }),
    });
    notify(`Stock updated for ${p.sku}`, 'success');
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Inventory Control</h2>
          <p className="text-xs text-[#78716C]">
            {totalUnits} units in stock · Asset Cost Valuation: {formatPKR(totalCostValue)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Product</th>
              <th className="p-3">Stock Qty</th>
              <th className="p-3">Low-Stock Alert At</th>
              <th className="p-3 text-right">Stock Cost Value</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {products.map((p) => {
              const d = drafts[p.id] || { stock: p.stockQuantity, threshold: p.lowStockThreshold };
              const isLow = d.stock <= d.threshold;
              return (
                <tr key={p.id}>
                  <td className="p-3 font-mono">{p.sku}</td>
                  <td className="p-3 font-semibold text-sm">
                    {p.name}
                    {isLow && (
                      <span className="ml-2 text-[11px] text-amber-600 font-semibold">
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={d.stock}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [p.id]: { ...d, stock: Number(e.target.value) },
                        })
                      }
                      className="w-20 px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={d.threshold}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [p.id]: { ...d, threshold: Number(e.target.value) },
                        })
                      }
                      className="w-20 px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                    />
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatPKR(p.stockQuantity * p.costPrice)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSaveStock(p)}
                      className="px-3 py-1 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminOrdersPanel({
  orders,
  paymentOnly = false,
  onRefresh,
  notify,
}: {
  orders: Order[];
  paymentOnly?: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const filtered = orders.filter((o) => {
    if (paymentOnly) return o.paymentMethod !== 'cod' || o.paymentStatus !== 'paid';
    if (statusFilter === 'ALL') return true;
    return o.orderStatus === statusFilter;
  });

  const openOrder = (o: Order) => {
    setSelectedOrder(o);
    setNextStatus(o.orderStatus);
    setTrackingNumber(o.trackingNumber || '');
    setCourierName(o.courierName || '');
    setInternalNotes(o.internalNotes || '');
    setStatusNote('');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await apiFetch(`/api/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          orderStatus: nextStatus,
          trackingNumber,
          courierName,
          internalNotes,
          note: statusNote || undefined,
        }),
      });
      notify(`Order ${selectedOrder.orderNumber} updated to ${nextStatus}.`, 'success');
      setSelectedOrder(null);
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error');
    }
  };

  const handlePaymentUpdate = async (orderId: number, paymentStatus: string) => {
    await apiFetch(`/api/admin/orders/${orderId}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus }),
    });
    notify(`Payment marked as ${paymentStatus}.`, 'success');
    await onRefresh();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus } : null));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {paymentOnly ? 'Payment Verification & Receipts' : 'Orders Management'}
          </h2>
          <p className="text-xs text-[#78716C]">{filtered.length} matching orders</p>
        </div>

        {!paymentOnly && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-white dark:bg-[#131316] text-xs font-medium"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#181715]">
                <td className="p-3 font-mono font-semibold">
                  {o.orderNumber}
                  {o.isDemo && <span className="ml-1 text-[#78716C]">(Demo)</span>}
                </td>
                <td className="p-3">
                  <p className="font-semibold text-sm">{o.customerName}</p>
                  <p className="text-[#78716C] font-mono">{o.customerPhone}</p>
                </td>
                <td className="p-3">
                  <p className="uppercase font-semibold">{o.paymentMethod}</p>
                  <p className="text-[#78716C] capitalize">
                    {o.paymentStatus.replace(/_/g, ' ')}
                    {o.paymentReference ? ` · ${o.paymentReference}` : ''}
                  </p>
                </td>
                <td className="p-3 font-semibold">{o.orderStatus}</td>
                <td className="p-3 text-right font-mono tabular-nums font-semibold">
                  {formatPKR(o.totalAmount)}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {paymentOnly && o.paymentStatus !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => handlePaymentUpdate(o.id, 'paid')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Confirm Paid
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openOrder(o)}
                    className="px-2.5 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] font-semibold"
                  >
                    Manage
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadOrderInvoicePDF(o)}
                    className="p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25]"
                    title="Download Invoice PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail & Workflow Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E3D9] dark:border-[#262420] pb-3">
              <div>
                <p className="text-xs font-mono text-[#78716C]">{selectedOrder.orderNumber}</p>
                <h3 className="font-display text-2xl font-semibold">
                  {selectedOrder.customerName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadOrderInvoicePDF(selectedOrder)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button type="button" onClick={() => setSelectedOrder(null)} className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#FAF9F6] dark:bg-[#0A0A0B] p-4 rounded border border-[#E8E3D9] dark:border-[#262420]">
              <div className="space-y-1">
                <p className="font-semibold uppercase text-[#78716C]">Customer & Delivery</p>
                <p>{selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && <p>{selectedOrder.customerEmail}</p>}
                <p>
                  {selectedOrder.deliveryAddress}, {selectedOrder.city}, {selectedOrder.province}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold uppercase text-[#78716C]">Payment Verification</p>
                <p>
                  Method: <strong className="uppercase">{selectedOrder.paymentMethod}</strong> ·
                  Status: <strong className="capitalize">{selectedOrder.paymentStatus}</strong>
                </p>
                {selectedOrder.paymentReference && (
                  <p className="font-mono">Ref: {selectedOrder.paymentReference}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['paid', 'awaiting_verification', 'failed', 'refunded'].map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => handlePaymentUpdate(selectedOrder.id, ps)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                        selectedOrder.paymentStatus === ps
                          ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                          : 'border-[#E8E3D9] dark:border-[#2C2A25]'
                      }`}
                    >
                      Mark {ps.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-semibold uppercase text-[#78716C]">Ordered Items</p>
              {(selectedOrder.items || []).map((it) => (
                <div key={it.id} className="flex justify-between py-1 border-b border-[#F0ECE2] dark:border-[#22201D]">
                  <span>
                    <Package className="w-3 h-3 inline mr-1" />
                    {it.productName} ({it.sku}) {it.variantLabel ? `· ${it.variantLabel}` : ''} ×{' '}
                    {it.quantity}
                  </span>
                  <span className="font-mono tabular-nums">{formatPKR(it.lineTotal)}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 border-t border-[#E8E3D9] dark:border-[#262420] pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Order Status</label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  >
                    {ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Courier Name</label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="TCS / Leopards / PostEx"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking ID"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Timeline update note for customer"
                  className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                />
                <input
                  type="text"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal staff notes"
                  className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
                >
                  Save Order Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
