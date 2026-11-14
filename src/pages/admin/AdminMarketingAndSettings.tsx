import React, { useState } from 'react';
import { Check, Download, Eye, Plus, Trash2, X } from 'lucide-react';
import { SafeImage } from '../../components/SafeImage.tsx';
import { apiFetch, formatPKR } from '../../lib/api.ts';
import { BUILTIN_GALLERY_OPTIONS } from '../../lib/media.ts';
import { downloadBrandedReportPDF, exportToCSV } from '../../lib/reports.ts';
import type { Banner, Category, Order, Product, Review, StorefrontSettings } from '../../types/store.ts';

export interface SocialVerificationRow {
  id: number;
  platform: string;
  username: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  proofUrl: string;
  proofNote: string;
  status: string;
  generatedCode: string;
  adminNote: string;
  createdAt: string;
}

export interface CouponAdminRow {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  source: string;
  assignedEmail: string;
}

export function AdminCustomersPanel({
  customers,
  guestCustomers,
  onRefresh,
  notify,
}: {
  customers: Array<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    totalSpent: number;
    ordersCount: number;
    createdAt: string;
  }>;
  guestCustomers: Array<{
    name: string;
    email: string;
    phone: string;
    ordersCount: number;
    totalSpent: number;
  }>;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const handleStatus = async (id: number, status: string) => {
    await apiFetch(`/api/admin/customers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    notify('Customer status updated.', 'success');
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Registered Customers ({customers.length})</h2>
      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">Total Spent</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  <p className="font-semibold text-sm">{c.fullName}</p>
                  <p className="text-[#78716C]">{c.email}</p>
                </td>
                <td className="p-3 font-mono">{c.phone || '—'}</td>
                <td className="p-3 text-right font-mono">{c.ordersCount}</td>
                <td className="p-3 text-right font-mono tabular-nums">{formatPKR(c.totalSpent)}</td>
                <td className="p-3">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatus(c.id, e.target.value)}
                    className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  >
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="font-display text-xl font-semibold pt-2">
        Guest Checkout Customers ({guestCustomers.length})
      </h3>
      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {guestCustomers.map((g, idx) => (
              <tr key={idx}>
                <td className="p-3 font-semibold">{g.name}</td>
                <td className="p-3 font-mono">{g.phone}</td>
                <td className="p-3">{g.email || '—'}</td>
                <td className="p-3 text-right font-mono">{g.ordersCount}</td>
                <td className="p-3 text-right font-mono tabular-nums">{formatPKR(g.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminCouponsPanel({
  coupons,
  onRefresh,
  notify,
}: {
  coupons: CouponAdminRow[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderValue, setMinOrderValue] = useState(3000);
  const [maxUses, setMaxUses] = useState(50);
  const [expiresAt, setExpiresAt] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code,
          discountType,
          discountValue,
          minOrderValue,
          maxUses,
          expiresAt: expiresAt || null,
        }),
      });
      setCode('');
      notify('Coupon created.', 'success');
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to create coupon.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    notify('Coupon deleted.', 'info');
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Discount Coupons</h2>

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs"
      >
        <div>
          <label className="block font-medium mb-1">Code *</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EID20"
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono uppercase"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Type</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (PKR)</option>
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1">Value</label>
          <input
            type="number"
            required
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Min Order (PKR)</label>
          <input
            type="number"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Max Uses</label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
          />
        </div>
        <button
          type="submit"
          className="py-2 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
        >
          Create Coupon
        </button>
      </form>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Min Order</th>
              <th className="p-3">Usage</th>
              <th className="p-3">Source</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono font-bold text-[#A67C2E] dark:text-[#D4AF37]">{c.code}</td>
                <td className="p-3">
                  {c.discountType === 'percentage' ? `${c.discountValue}%` : formatPKR(c.discountValue)}
                </td>
                <td className="p-3 font-mono">{formatPKR(c.minOrderValue)}</td>
                <td className="p-3 font-mono">
                  {c.usedCount} / {c.maxUses}
                </td>
                <td className="p-3 capitalize">{c.source.replace(/_/g, ' ')}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSocialVerificationPanel({
  verifications,
  onRefresh,
  notify,
}: {
  verifications: SocialVerificationRow[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await apiFetch<{ verification: SocialVerificationRow }>(
        `/api/admin/social-verifications/${id}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ action }),
        }
      );
      notify(
        action === 'approve'
          ? `Approved! Generated code: ${res.verification.generatedCode}`
          : 'Request rejected.',
        action === 'approve' ? 'success' : 'info'
      );
      await onRefresh();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Review failed.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Social Verification Requests</h2>
        <p className="text-xs text-[#78716C]">
          Manually verify social media handles and screenshots to issue personal discount coupons.
        </p>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Platform & Handle</th>
              <th className="p-3">Proof</th>
              <th className="p-3">Status</th>
              <th className="p-3">Issued Code</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
            {verifications.map((v) => (
              <tr key={v.id}>
                <td className="p-3">
                  <p className="font-semibold text-sm">{v.customerName}</p>
                  <p className="text-[#78716C]">{v.customerEmail || v.customerPhone}</p>
                </td>
                <td className="p-3">
                  <p className="capitalize font-semibold">{v.platform}</p>
                  <p className="font-mono text-[#A67C2E] dark:text-[#D4AF37]">{v.username}</p>
                </td>
                <td className="p-3 max-w-[200px]">
                  <p className="truncate text-[#57534E] dark:text-[#A8A29E]">{v.proofNote || '—'}</p>
                  {v.proofUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewProof(v.proofUrl)}
                      className="inline-flex items-center gap-1 text-[#A67C2E] dark:text-[#D4AF37] underline mt-0.5"
                    >
                      <Eye className="w-3 h-3" /> View Screenshot
                    </button>
                  )}
                </td>
                <td className="p-3 capitalize font-semibold">{v.status}</td>
                <td className="p-3 font-mono font-bold">{v.generatedCode || '—'}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {v.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReview(v.id, 'approve')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(v.id, 'reject')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-700 text-white font-semibold"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewProof && (
        <div
          onClick={() => setPreviewProof(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <img src={previewProof} alt="Proof screenshot" className="max-h-[85vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function AdminReviewsPanel({
  reviews,
  onRefresh,
  notify,
}: {
  reviews: Review[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const toggleApprove = async (r: Review) => {
    await apiFetch(`/api/admin/reviews/${r.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved: !r.isApproved }),
    });
    notify('Review status updated.', 'success');
    await onRefresh();
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    notify('Review deleted.', 'info');
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Reviews Moderation</h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] flex flex-col sm:flex-row justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {r.customerName} · {r.rating}/5 Stars ({r.productName})
              </p>
              <p className="text-[#57534E] dark:text-[#A8A29E]">{r.comment}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleApprove(r)}
                className={`px-3 py-1 rounded font-semibold ${
                  r.isApproved
                    ? 'bg-emerald-700 text-white'
                    : 'border border-[#E8E3D9] dark:border-[#2C2A25]'
                }`}
              >
                {r.isApproved ? 'Approved' : 'Hidden'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="p-1.5 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBannersPanel({
  banners,
  onRefresh,
  notify,
}: {
  banners: Banner[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [form, setForm] = useState<Partial<Banner> | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.id) {
      await apiFetch(`/api/admin/banners/${form.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setForm(null);
    notify('Banner saved.', 'success');
    await onRefresh();
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    notify('Banner deleted.', 'info');
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Website Banners</h2>
        <button
          type="button"
          onClick={() =>
            setForm({
              title: '',
              subtitle: '',
              kicker: 'PRINCE STAR',
              ctaText: 'Shop Collection',
              ctaLink: '/shop',
              imageUrl: BUILTIN_GALLERY_OPTIONS[0]?.key || '',
              placement: 'hero',
              sortOrder: banners.length + 1,
              isActive: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div
            key={b.id}
            className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg overflow-hidden"
          >
            <div className="aspect-[16/9] bg-[#1A1916]">
              <SafeImage src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{b.title}</p>
                <p className="text-xs text-[#78716C] truncate">{b.ctaLink}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setForm(b)}
                  className="px-2.5 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg max-w-lg w-full p-6 space-y-3 text-sm"
          >
            <h3 className="font-display text-2xl font-semibold">
              {form.id ? 'Edit Banner' : 'New Banner'}
            </h3>
            <input
              type="text"
              value={form.kicker || ''}
              onChange={(e) => setForm({ ...form, kicker: e.target.value })}
              placeholder="Kicker"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
            />
            <input
              type="text"
              required
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Headline *"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
            />
            <input
              type="text"
              value={form.subtitle || ''}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Subtitle"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.ctaText || ''}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                placeholder="CTA Label"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
              <input
                type="text"
                value={form.ctaLink || ''}
                onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                placeholder="/shop"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>
            <input
              type="text"
              required
              value={form.imageUrl || ''}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="Image URL"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-mono"
            />
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_GALLERY_OPTIONS.slice(0, 4).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: opt.key })}
                  className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-[11px]"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
                Save Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminSettingsForm({
  settings,
  section,
  onSaveKey,
}: {
  settings: StorefrontSettings;
  section: 'homepage' | 'shipping' | 'website' | 'social';
  onSaveKey: (key: keyof StorefrontSettings, val: Record<string, unknown>) => Promise<void>;
}) {
  const [general, setGeneral] = useState(settings.general);
  const [appearance, setAppearance] = useState(settings.appearance);
  const [storeCfg, setStoreCfg] = useState(settings.store);
  const [social, setSocial] = useState(settings.social);

  if (section === 'homepage') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSaveKey('appearance', appearance as unknown as Record<string, unknown>);
        }}
        className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-5 text-sm max-w-3xl"
      >
        <h2 className="font-display text-2xl font-semibold">Homepage Editor & Visibility</h2>
        <div>
          <label className="block text-xs font-medium mb-1">Top Announcement Text</label>
          <input
            type="text"
            value={appearance.announcementText}
            onChange={(e) => setAppearance({ ...appearance, announcementText: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Hero Fallback Heading</label>
          <input
            type="text"
            value={appearance.heroHeading}
            onChange={(e) => setAppearance({ ...appearance, heroHeading: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Brand Story Heading</label>
          <input
            type="text"
            value={appearance.brandStoryHeading}
            onChange={(e) => setAppearance({ ...appearance, brandStoryHeading: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Brand Story Copy</label>
          <textarea
            rows={3}
            value={appearance.brandStoryBody}
            onChange={(e) => setAppearance({ ...appearance, brandStoryBody: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
          {[
            ['announcementEnabled', 'Announcement Bar'],
            ['showHero', 'Hero Slider'],
            ['showCategories', 'Shop by Category'],
            ['showNewArrivals', 'New Arrivals'],
            ['showBestSellers', 'Best Sellers'],
            ['showSpecialOffers', 'Exclusive Offers'],
            ['showFeatured', 'Featured Collection'],
            ['showSocialShowcase', 'Social Club Spotlight'],
            ['showBrandStory', 'Brand Story'],
            ['showWhyChoose', 'Why Choose Us'],
            ['showTestimonials', 'Testimonials'],
            ['showFaq', 'FAQs'],
          ].map(([k, label]) => (
            <label key={k} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(appearance[k as keyof typeof appearance])}
                onChange={(e) => setAppearance({ ...appearance, [k]: e.target.checked })}
                className="accent-[#A67C2E]"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          Save Homepage Configuration
        </button>
      </form>
    );
  }

  if (section === 'shipping') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSaveKey('store', storeCfg as unknown as Record<string, unknown>);
        }}
        className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4 text-sm max-w-2xl"
      >
        <h2 className="font-display text-2xl font-semibold">Shipping & Payment Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Standard Shipping (PKR)</label>
            <input
              type="number"
              value={storeCfg.standardShippingFee}
              onChange={(e) =>
                setStoreCfg({ ...storeCfg, standardShippingFee: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Free Delivery Threshold (PKR)</label>
            <input
              type="number"
              value={storeCfg.freeShippingThreshold}
              onChange={(e) =>
                setStoreCfg({ ...storeCfg, freeShippingThreshold: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tax (%)</label>
            <input
              type="number"
              value={storeCfg.taxPercent}
              onChange={(e) => setStoreCfg({ ...storeCfg, taxPercent: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8E3D9] dark:border-[#262420]">
          <div>
            <label className="block text-xs font-medium mb-1">Easypaisa Account Number</label>
            <input
              type="text"
              value={storeCfg.easypaisaAccount}
              onChange={(e) => setStoreCfg({ ...storeCfg, easypaisaAccount: e.target.value })}
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">JazzCash Account Number</label>
            <input
              type="text"
              value={storeCfg.jazzcashAccount}
              onChange={(e) => setStoreCfg({ ...storeCfg, jazzcashAccount: e.target.value })}
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={storeCfg.codEnabled}
              onChange={(e) => setStoreCfg({ ...storeCfg, codEnabled: e.target.checked })}
            />
            Cash on Delivery Enabled
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={storeCfg.easypaisaEnabled}
              onChange={(e) => setStoreCfg({ ...storeCfg, easypaisaEnabled: e.target.checked })}
            />
            Easypaisa Enabled
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={storeCfg.jazzcashEnabled}
              onChange={(e) => setStoreCfg({ ...storeCfg, jazzcashEnabled: e.target.checked })}
            />
            JazzCash Enabled
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          Save Shipping & Payment Settings
        </button>
      </form>
    );
  }

  if (section === 'social') {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSaveKey('social', social as unknown as Record<string, unknown>);
          await onSaveKey('store', storeCfg as unknown as Record<string, unknown>);
        }}
        className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-5 text-sm max-w-3xl"
      >
        <h2 className="font-display text-2xl font-semibold">Social Media & Reward Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={social.instagramHandle}
            onChange={(e) => setSocial({ ...social, instagramHandle: e.target.value })}
            placeholder="Instagram Handle"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.instagramUrl}
            onChange={(e) => setSocial({ ...social, instagramUrl: e.target.value })}
            placeholder="Instagram URL"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.tiktokHandle}
            onChange={(e) => setSocial({ ...social, tiktokHandle: e.target.value })}
            placeholder="TikTok Handle"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.tiktokUrl}
            onChange={(e) => setSocial({ ...social, tiktokUrl: e.target.value })}
            placeholder="TikTok URL"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.facebookHandle}
            onChange={(e) => setSocial({ ...social, facebookHandle: e.target.value })}
            placeholder="Facebook Page Name"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.facebookUrl}
            onChange={(e) => setSocial({ ...social, facebookUrl: e.target.value })}
            placeholder="Facebook URL"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.youtubeHandle}
            onChange={(e) => setSocial({ ...social, youtubeHandle: e.target.value })}
            placeholder="YouTube Handle"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
          <input
            type="text"
            value={social.youtubeUrl}
            onChange={(e) => setSocial({ ...social, youtubeUrl: e.target.value })}
            placeholder="YouTube URL"
            className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>

        <div className="pt-3 border-t border-[#E8E3D9] dark:border-[#262420] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Reward Value (% or PKR)</label>
            <input
              type="number"
              value={storeCfg.socialDiscountValue}
              onChange={(e) =>
                setStoreCfg({ ...storeCfg, socialDiscountValue: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Min Order (PKR)</label>
            <input
              type="number"
              value={storeCfg.socialDiscountMinOrder}
              onChange={(e) =>
                setStoreCfg({ ...storeCfg, socialDiscountMinOrder: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Coupon Validity (Days)</label>
            <input
              type="number"
              value={storeCfg.socialDiscountExpiryDays}
              onChange={(e) =>
                setStoreCfg({ ...storeCfg, socialDiscountExpiryDays: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          Save Social Settings
        </button>
      </form>
    );
  }

  // General Website Settings
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSaveKey('general', general as unknown as Record<string, unknown>);
      }}
      className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4 text-sm max-w-3xl"
    >
      <h2 className="font-display text-2xl font-semibold">General Website Settings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Brand Name</label>
          <input
            type="text"
            value={general.brandName}
            onChange={(e) => setGeneral({ ...general, brandName: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Tagline</label>
          <input
            type="text"
            value={general.tagline}
            onChange={(e) => setGeneral({ ...general, tagline: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Contact Phone</label>
          <input
            type="text"
            value={general.contactPhone}
            onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">WhatsApp Digits (923076817272)</label>
          <input
            type="text"
            value={general.whatsappNumber}
            onChange={(e) => setGeneral({ ...general, whatsappNumber: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Complaint Email</label>
          <input
            type="email"
            value={general.complaintEmail}
            onChange={(e) => setGeneral({ ...general, complaintEmail: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Custom Logo URL (optional)</label>
          <input
            type="text"
            value={general.logoUrl}
            onChange={(e) => setGeneral({ ...general, logoUrl: e.target.value })}
            placeholder="https://... or leave blank for official crest"
            className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Business Address</label>
        <input
          type="text"
          value={general.address}
          onChange={(e) => setGeneral({ ...general, address: e.target.value })}
          className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Google Maps Embed URL</label>
        <input
          type="text"
          value={general.googleMapsUrl}
          onChange={(e) => setGeneral({ ...general, googleMapsUrl: e.target.value })}
          className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-mono"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
      >
        Save General Settings
      </button>
    </form>
  );
}

export function AdminBackupAndExportsPanel({
  orders,
  products,
  customers,
  expenses,
  onPurgeDemo,
  notify,
}: {
  orders: Order[];
  products: Product[];
  customers: Array<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
    ordersCount: number;
    totalSpent: number;
  }>;
  expenses: Array<{ id: number; date: string; category: string; amount: number; notes: string }>;
  onPurgeDemo: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const handleJsonBackup = async () => {
    const data = await apiFetch<Record<string, unknown>>('/api/admin/backup');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRINCE-STAR-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Database JSON backup downloaded.', 'success');
  };

  const validOrders = orders.filter((o) => !['Cancelled', 'Returned', 'Refunded'].includes(o.orderStatus));
  const totalSales = validOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCogs = validOrders.reduce((s, o) => s + o.totalCost, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Backup & Branded Report Exports</h2>
          <p className="text-xs text-[#78716C]">
            Download PRINCE STAR PDF reports, CSV spreadsheets, or full JSON database backups.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleJsonBackup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> Full JSON Backup
          </button>
          <button
            type="button"
            onClick={onPurgeDemo}
            className="px-4 py-2 rounded border border-red-400 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Remove Demo Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {[
          {
            title: 'Order Report',
            pdf: () =>
              downloadBrandedReportPDF({
                title: 'Order Report',
                dateRangeLabel: 'All Recorded Orders',
                totals: [
                  { label: 'Total Orders', value: String(orders.length) },
                  { label: 'Net Sales', value: formatPKR(totalSales) },
                ],
                columns: ['Order #', 'Customer', 'Method', 'Status', 'Total'],
                rows: orders.map((o) => [
                  o.orderNumber,
                  o.customerName,
                  o.paymentMethod.toUpperCase(),
                  o.orderStatus,
                  formatPKR(o.totalAmount),
                ]),
                filename: 'PRINCE-STAR-Orders-Report.pdf',
              }),
            csv: () =>
              exportToCSV(
                'PRINCE-STAR-Orders.csv',
                ['Order #', 'Date', 'Customer', 'Phone', 'Method', 'Payment', 'Status', 'Total'],
                orders.map((o) => [
                  o.orderNumber,
                  o.createdAt,
                  o.customerName,
                  o.customerPhone,
                  o.paymentMethod,
                  o.paymentStatus,
                  o.orderStatus,
                  o.totalAmount,
                ])
              ),
          },
          {
            title: 'Inventory Valuation Report',
            pdf: () =>
              downloadBrandedReportPDF({
                title: 'Inventory Valuation Report',
                dateRangeLabel: `Snapshot ${new Date().toLocaleDateString('en-PK')}`,
                totals: [
                  { label: 'Products', value: String(products.length) },
                  {
                    label: 'Asset Cost Value',
                    value: formatPKR(products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0)),
                  },
                ],
                columns: ['SKU', 'Product', 'Stock', 'Cost', 'Valuation'],
                rows: products.map((p) => [
                  p.sku,
                  p.name,
                  p.stockQuantity,
                  formatPKR(p.costPrice),
                  formatPKR(p.stockQuantity * p.costPrice),
                ]),
                filename: 'PRINCE-STAR-Inventory-Report.pdf',
              }),
            csv: () =>
              exportToCSV(
                'PRINCE-STAR-Inventory.csv',
                ['SKU', 'Product', 'Stock', 'Cost Price', 'Regular Price', 'Sale Price'],
                products.map((p) => [
                  p.sku,
                  p.name,
                  p.stockQuantity,
                  p.costPrice,
                  p.regularPrice,
                  p.salePrice || '',
                ])
              ),
          },
          {
            title: 'Customer Report',
            pdf: () =>
              downloadBrandedReportPDF({
                title: 'Customer Directory Report',
                dateRangeLabel: 'All Registered Customers',
                totals: [{ label: 'Registered Accounts', value: String(customers.length) }],
                columns: ['Name', 'Email', 'Phone', 'Orders', 'Spent'],
                rows: customers.map((c) => [
                  c.fullName,
                  c.email,
                  c.phone,
                  c.ordersCount,
                  formatPKR(c.totalSpent),
                ]),
                filename: 'PRINCE-STAR-Customers-Report.pdf',
              }),
            csv: () =>
              exportToCSV(
                'PRINCE-STAR-Customers.csv',
                ['Name', 'Email', 'Phone', 'Orders', 'Total Spent'],
                customers.map((c) => [c.fullName, c.email, c.phone, c.ordersCount, c.totalSpent])
              ),
          },
          {
            title: 'Profit & Loss Report',
            pdf: () =>
              downloadBrandedReportPDF({
                title: 'Profit & Loss Statement',
                dateRangeLabel: 'Cumulative Ledger',
                totals: [
                  { label: 'Net Sales', value: formatPKR(totalSales) },
                  { label: 'Gross Profit', value: formatPKR(totalSales - totalCogs) },
                  { label: 'Net Profit', value: formatPKR(totalSales - totalCogs - totalExp) },
                ],
                columns: ['Date', 'Category', 'Notes', 'Amount'],
                rows: expenses.map((e) => [e.date, e.category, e.notes, formatPKR(e.amount)]),
                filename: 'PRINCE-STAR-Profit-Loss-Report.pdf',
              }),
            csv: () =>
              exportToCSV(
                'PRINCE-STAR-Expenses.csv',
                ['Date', 'Category', 'Amount', 'Notes'],
                expenses.map((e) => [e.date, e.category, e.amount, e.notes])
              ),
          },
        ].map((rep) => (
          <div
            key={rep.title}
            className="p-5 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-3"
          >
            <h3 className="font-semibold text-sm">{rep.title}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={rep.pdf}
                className="px-3 py-1.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={rep.csv}
                className="px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] font-semibold"
              >
                Export CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
