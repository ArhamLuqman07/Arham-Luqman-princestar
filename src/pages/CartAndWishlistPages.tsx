import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, formatPKR } from '../lib/api.ts';

export function WishlistPage() {
  const { products, wishlistIds, navigate } = useStore();
  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          Curated Favorites
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">Wishlist</h1>
      </div>

      {savedProducts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E8E3D9] dark:border-[#2C2A25] rounded-lg space-y-4">
          <p className="font-display text-2xl font-semibold">Your wishlist is empty</p>
          <p className="text-sm text-[#78716C]">
            Save timepieces, eyewear, or leather goods while browsing.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            Explore Collections
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {savedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CartPage() {
  const { cart, cartSubtotal, updateCartQty, removeFromCart, navigate, settings, notify } =
    useStore();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  const freeThreshold = Number(settings?.store?.freeShippingThreshold ?? 8000);
  const stdShipping = Number(settings?.store?.standardShippingFee ?? 250);
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const afterDiscount = Math.max(0, cartSubtotal - discount);
  const shipping = cart.length === 0 ? 0 : afterDiscount >= freeThreshold ? 0 : stdShipping;
  const total = afterDiscount + shipping;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setValidating(true);
      const res = await apiFetch<{
        code: string;
        discountAmount: number;
        message: string;
      }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponInput.trim(),
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });
      setAppliedCoupon(res);
      sessionStorage.setItem('ps_pending_coupon', res.code);
      notify(res.message, 'success');
    } catch (err: unknown) {
      setAppliedCoupon(null);
      notify(err instanceof Error ? err.message : 'Invalid coupon', 'error');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
          Review Your Selection
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold">Shopping Bag</h1>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E8E3D9] dark:border-[#2C2A25] rounded-lg space-y-4">
          <ShoppingBag className="w-10 h-10 mx-auto text-[#78716C]" />
          <p className="font-display text-2xl font-semibold">Your shopping bag is empty</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-8 divide-y divide-[#E8E3D9] dark:divide-[#262420] bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || ''}`}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div
                  onClick={() => navigate(`/product/${item.slug}`)}
                  className="w-24 aspect-[4/3] rounded overflow-hidden bg-[#F2EFE8] dark:bg-[#19191D] shrink-0 cursor-pointer"
                >
                  <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/product/${item.slug}`)}
                    className="text-base font-semibold hover:text-[#A67C2E] dark:hover:text-[#D4AF37] text-left"
                  >
                    {item.name}
                  </button>
                  <p className="text-xs text-[#78716C] font-mono">
                    SKU: {item.sku} {item.variantLabel ? `· ${item.variantLabel}` : ''}
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatPKR(item.unitPrice)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="inline-flex items-center border border-[#E8E3D9] dark:border-[#2C2A25] rounded">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.productId, item.variantId, item.quantity - 1)}
                      className="p-2 hover:bg-[#F2EFE8] dark:hover:bg-[#1C1B18]"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-mono text-xs font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.productId, item.variantId, item.quantity + 1)}
                      className="p-2 hover:bg-[#F2EFE8] dark:hover:bg-[#1C1B18]"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="font-mono text-sm font-semibold tabular-nums min-w-[95px] text-right">
                    {formatPKR(item.unitPrice * item.quantity)}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    aria-label="Remove item"
                    className="p-2 text-[#78716C] hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-4 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-5">
            <h2 className="font-display text-2xl font-semibold">Order Summary</h2>

            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="w-full pl-8 pr-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-xs font-mono uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={validating}
                className="px-3.5 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
              >
                {validating ? '...' : 'Apply'}
              </button>
            </form>

            {appliedCoupon && (
              <p className="text-xs text-[#A67C2E] dark:text-[#D4AF37] font-medium">
                {appliedCoupon.message}
              </p>
            )}

            <div className="space-y-2.5 text-sm border-t border-[#F0ECE2] dark:border-[#22201D] pt-4">
              <div className="flex justify-between">
                <span className="text-[#78716C]">Subtotal</span>
                <span className="font-mono tabular-nums">{formatPKR(cartSubtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#A67C2E] dark:text-[#D4AF37]">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span className="font-mono tabular-nums">-{formatPKR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#78716C]">Delivery</span>
                <span className="font-mono tabular-nums">
                  {shipping === 0 ? 'Complimentary' : formatPKR(shipping)}
                </span>
              </div>
              {afterDiscount < freeThreshold && (
                <p className="text-xs text-[#78716C]">
                  Add {formatPKR(freeThreshold - afterDiscount)} more for free nationwide delivery.
                </p>
              )}
              <div className="flex justify-between text-base font-semibold pt-3 border-t border-[#F0ECE2] dark:border-[#22201D]">
                <span>Total Payable</span>
                <span className="font-mono tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
