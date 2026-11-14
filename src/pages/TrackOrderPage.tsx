import React, { useState } from 'react';
import { PackageSearch, Truck } from 'lucide-react';
import { apiFetch, formatPKR } from '../lib/api.ts';
import type { OrderHistoryEntry, OrderItem } from '../types/store.ts';

interface TrackedOrderResult {
  order: {
    orderNumber: string;
    customerName: string;
    city: string;
    province: string;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    trackingNumber: string;
    courierName: string;
    subtotal: number;
    discountAmount: number;
    couponCode: string;
    shippingCost: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  items: OrderItem[];
  history: OrderHistoryEntry[];
}

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackedOrderResult | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await apiFetch<TrackedOrderResult>(
        `/api/orders/track?orderNumber=${encodeURIComponent(
          orderNumber.trim()
        )}&phone=${encodeURIComponent(phone.trim())}`
      );
      setResult(res);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Unable to locate order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37]">
          Live Dispatch Status
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">Track Your Order</h1>
        <p className="text-sm text-[#57534E] dark:text-[#A8A29E] max-w-xl mx-auto">
          Enter your PRINCE STAR order number and the mobile number used at checkout—no account
          required.
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
      >
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium mb-1">Order Number</label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="e.g. PS-2026-1001"
            className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono uppercase"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs font-medium mb-1">Mobile Number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
            className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90"
          >
            <PackageSearch className="w-4 h-4" />
            {loading ? 'Checking...' : 'Track'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E3D9] dark:border-[#262420]">
            <div>
              <p className="text-xs text-[#78716C] font-mono">{result.order.orderNumber}</p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                Status: {result.order.orderStatus}
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                Destination: {result.order.city}, {result.order.province}
              </p>
            </div>
            <div className="sm:text-right text-sm space-y-1">
              <p className="font-mono font-semibold">{formatPKR(result.order.totalAmount)}</p>
              <p className="text-xs text-[#78716C] uppercase">
                {result.order.paymentMethod} · {result.order.paymentStatus.replace(/_/g, ' ')}
              </p>
              {result.order.trackingNumber && (
                <p className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A67C2E] dark:text-[#D4AF37]">
                  <Truck className="w-3.5 h-3.5" />
                  {result.order.courierName}: {result.order.trackingNumber}
                </p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Status Timeline
            </h3>
            <div className="space-y-3">
              {result.history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between gap-4 pb-3 border-b border-[#F0ECE2] dark:border-[#22201D] last:border-none"
                >
                  <div>
                    <p className="text-sm font-semibold">{h.status}</p>
                    {h.note && <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">{h.note}</p>}
                  </div>
                  <span className="text-xs font-mono text-[#78716C] whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleString('en-PK')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2 pt-2 border-t border-[#E8E3D9] dark:border-[#262420]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Ordered Items
            </h3>
            {result.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span>
                  {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''} ×{' '}
                  {item.quantity}
                </span>
                <span className="font-mono tabular-nums">{formatPKR(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
