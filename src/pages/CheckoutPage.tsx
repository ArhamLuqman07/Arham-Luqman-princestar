import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, MessageCircle, ShieldCheck, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, formatPKR } from '../lib/api.ts';
import { downloadOrderInvoicePDF } from '../lib/reports.ts';
import type { Order } from '../types/store.ts';

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Islamabad Capital Territory',
  'Balochistan',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

export function CheckoutPage() {
  const { cart, cartSubtotal, clearCart, customer, settings, navigate, notify } = useStore();

  const defaultAddr = customer?.addresses?.find((a) => a.isDefault) || customer?.addresses?.[0];

  const [customerName, setCustomerName] = useState(
    defaultAddr?.fullName || customer?.fullName || ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    defaultAddr?.phone || customer?.phone || ''
  );
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddr?.address || '');
  const [city, setCity] = useState(defaultAddr?.city || '');
  const [province, setProvince] = useState(defaultAddr?.province || 'Punjab');
  const [postalCode, setPostalCode] = useState(defaultAddr?.postalCode || '');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'easypaisa' | 'jazzcash'>('cod');
  const [paymentReference, setPaymentReference] = useState('');

  const [couponCode, setCouponCode] = useState(
    () => sessionStorage.getItem('ps_pending_coupon') || ''
  );
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (customer && !customerName) setCustomerName(customer.fullName);
    if (customer?.phone && !customerPhone) setCustomerPhone(customer.phone);
    if (customer?.email && !customerEmail) setCustomerEmail(customer.email);
  }, [customer, customerName, customerPhone, customerEmail]);

  const validateCoupon = async (codeToTry: string) => {
    if (!codeToTry.trim() || cart.length === 0) return;
    try {
      const res = await apiFetch<{
        code: string;
        discountAmount: number;
        message: string;
      }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: codeToTry.trim(),
          email: customerEmail,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });
      setCouponDiscount(res.discountAmount);
      setCouponMessage(res.message);
      setCouponCode(res.code);
    } catch (err: unknown) {
      setCouponDiscount(0);
      setCouponMessage('');
      notify(err instanceof Error ? err.message : 'Invalid coupon', 'error');
    }
  };

  useEffect(() => {
    const pending = sessionStorage.getItem('ps_pending_coupon');
    if (pending && cart.length > 0) {
      validateCoupon(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storeCfg = settings?.store;
  const freeThreshold = Number(storeCfg?.freeShippingThreshold ?? 8000);
  const stdShipping = Number(storeCfg?.standardShippingFee ?? 250);
  const afterDiscount = Math.max(0, cartSubtotal - couponDiscount);
  const shippingCost = cart.length === 0 ? 0 : afterDiscount >= freeThreshold ? 0 : stdShipping;
  const totalPayable = afterDiscount + shippingCost;
  const whatsappClean = (settings?.general?.whatsappNumber || '923076817272').replace(/\D/g, '');

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    try {
      setSubmitting(true);
      const res = await apiFetch<{ order: Order; items: Order['items'] }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
          city,
          province,
          postalCode,
          orderNotes,
          paymentMethod,
          paymentReference,
          couponCode: couponDiscount > 0 ? couponCode : '',
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            variantLabel: c.variantLabel,
            quantity: c.quantity,
          })),
        }),
      });

      const fullOrder: Order = { ...res.order, items: res.items };
      setConfirmedOrder(fullOrder);
      sessionStorage.removeItem('ps_pending_coupon');
      clearCart();
      notify(`Order ${res.order.orderNumber} placed successfully.`, 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Order submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    const waText = encodeURIComponent(
      `Assalam-o-Alaikum PRINCE STAR, I have placed order #${confirmedOrder.orderNumber} for ${formatPKR(
        confirmedOrder.totalAmount
      )} (${confirmedOrder.paymentMethod.toUpperCase()}). Name: ${confirmedOrder.customerName}, City: ${
        confirmedOrder.city
      }.`
    );

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 text-[#A67C2E] dark:text-[#D4AF37]">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Order Confirmed</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111111] dark:text-[#F5F3EE]">
                Thank You, {confirmedOrder.customerName}
              </h1>
            </div>
          </div>

          <div className="p-4 rounded bg-[#FAF9F6] dark:bg-[#0A0A0B] border border-[#E8E3D9] dark:border-[#262420] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs text-[#78716C]">Order Reference Number</p>
              <p className="font-mono text-lg font-semibold">{confirmedOrder.orderNumber}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-[#78716C]">Payment Status</p>
              <p className="text-sm font-semibold capitalize">
                {confirmedOrder.paymentStatus.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {confirmedOrder.paymentMethod !== 'cod' && (
            <p className="text-sm text-[#57534E] dark:text-[#A8A29E] bg-[#FAF9F6] dark:bg-[#1A1916] p-4 rounded border border-[#E8E3D9] dark:border-[#262420]">
              Your {confirmedOrder.paymentMethod.toUpperCase()} reference (
              <span className="font-mono font-semibold">{confirmedOrder.paymentReference}</span>) has
              been recorded and is awaiting verification by our accounts desk before dispatch.
            </p>
          )}

          <div className="space-y-2 border-t border-[#E8E3D9] dark:border-[#262420] pt-4 text-sm">
            {(confirmedOrder.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between gap-4">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-mono tabular-nums">{formatPKR(item.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-base pt-3 border-t border-[#F0ECE2] dark:border-[#22201D]">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums">{formatPKR(confirmedOrder.totalAmount)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={`https://wa.me/${whatsappClean}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#128C7E] text-white text-xs font-semibold hover:bg-[#075E54]"
            >
              <MessageCircle className="w-4 h-4" /> Confirm via WhatsApp
            </a>
            <button
              type="button"
              onClick={() => downloadOrderInvoicePDF(confirmedOrder)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold hover:border-[#A67C2E]"
            >
              <Download className="w-4 h-4" /> Download PDF Invoice
            </button>
            <button
              type="button"
              onClick={() => navigate('/track-order')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold">Your bag is empty</h1>
        <p className="text-sm text-[#78716C]">Add items to proceed with checkout.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          Browse Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6 mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          Guest & Member Checkout
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">Complete Your Order</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping & Payment */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold">Delivery Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Hamza Tariq"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Email Address (Optional for Guest Order Confirmation)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Complete Delivery Address *</label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House / Flat #, Street, Sector / Block"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore / Gujrat / Karachi"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Province *</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
                >
                  {PAKISTAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Postal Code (Optional)</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="50700"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Order Notes (Optional)</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Gift packaging message, preferred delivery hours..."
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
          </div>

          {/* Payment Options */}
          <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold">Payment Method</h2>

            <div className="space-y-3">
              {storeCfg?.codEnabled !== false && (
                <label className="flex items-start gap-3 p-4 rounded border border-[#E8E3D9] dark:border-[#2C2A25] cursor-pointer hover:border-[#A67C2E]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 accent-[#A67C2E]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Cash on Delivery (COD)</p>
                    <p className="text-xs text-[#78716C]">
                      Pay in cash directly to the courier upon receiving your parcel anywhere in Pakistan.
                    </p>
                  </div>
                </label>
              )}

              {storeCfg?.easypaisaEnabled !== false && (
                <label className="flex items-start gap-3 p-4 rounded border border-[#E8E3D9] dark:border-[#2C2A25] cursor-pointer hover:border-[#A67C2E]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'easypaisa'}
                    onChange={() => setPaymentMethod('easypaisa')}
                    className="mt-1 accent-[#A67C2E]"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold">Easypaisa Transfer (Manual Verification)</p>
                    <p className="text-xs text-[#78716C]">
                      Account Title: <strong>{storeCfg?.easypaisaTitle || 'PRINCE STAR Official'}</strong> ·
                      Account: <strong className="font-mono">{storeCfg?.easypaisaAccount || '0307-6817272'}</strong>
                    </p>
                  </div>
                </label>
              )}

              {storeCfg?.jazzcashEnabled !== false && (
                <label className="flex items-start gap-3 p-4 rounded border border-[#E8E3D9] dark:border-[#2C2A25] cursor-pointer hover:border-[#A67C2E]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'jazzcash'}
                    onChange={() => setPaymentMethod('jazzcash')}
                    className="mt-1 accent-[#A67C2E]"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold">JazzCash Transfer (Manual Verification)</p>
                    <p className="text-xs text-[#78716C]">
                      Account Title: <strong>{storeCfg?.jazzcashTitle || 'PRINCE STAR Official'}</strong> ·
                      Account: <strong className="font-mono">{storeCfg?.jazzcashAccount || '0307-6817272'}</strong>
                    </p>
                  </div>
                </label>
              )}
            </div>

            {(paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
              <div className="p-4 rounded bg-[#FAF9F6] dark:bg-[#0A0A0B] border border-[#A67C2E]/40 space-y-2">
                <label className="block text-xs font-semibold">
                  Enter {paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} Transaction ID (TID) *
                </label>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TID-8492019384"
                  className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-white dark:bg-[#131316] text-sm font-mono"
                />
                <p className="text-xs text-[#78716C]">
                  Your order is saved as Awaiting Verification until our accounts team confirms the transfer.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Review */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-semibold">Bag Summary</h2>

          <div className="divide-y divide-[#F0ECE2] dark:divide-[#22201D] max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || ''}`}
                className="py-3 flex justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-[#78716C]">
                    Qty {item.quantity} {item.variantLabel ? `· ${item.variantLabel}` : ''}
                  </p>
                </div>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {formatPKR(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Box */}
          <div className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="w-full pl-8 pr-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-mono uppercase"
              />
            </div>
            <button
              type="button"
              onClick={() => validateCoupon(couponCode)}
              className="px-3.5 py-2 rounded border border-[#111111] dark:border-[#D4AF37] text-xs font-semibold"
            >
              Apply
            </button>
          </div>
          {couponMessage && (
            <p className="text-xs text-[#A67C2E] dark:text-[#D4AF37] font-medium">{couponMessage}</p>
          )}

          <div className="space-y-2 text-sm border-t border-[#F0ECE2] dark:border-[#22201D] pt-4">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Subtotal</span>
              <span className="font-mono tabular-nums">{formatPKR(cartSubtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-[#A67C2E] dark:text-[#D4AF37]">
                <span>Discount</span>
                <span className="font-mono tabular-nums">-{formatPKR(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#78716C]">Shipping</span>
              <span className="font-mono tabular-nums">
                {shippingCost === 0 ? 'Complimentary' : formatPKR(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-3 border-t border-[#F0ECE2] dark:border-[#22201D]">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums">{formatPKR(totalPayable)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Confirming Order...' : `Place Order · ${formatPKR(totalPayable)}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-[#78716C]">
            <ShieldCheck className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37]" />
            Verified stock & atomic order reservation
          </p>
        </div>
      </form>
    </div>
  );
}
