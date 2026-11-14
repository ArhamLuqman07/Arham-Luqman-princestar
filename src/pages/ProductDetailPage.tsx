import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  ZoomIn,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, formatPKR } from '../lib/api.ts';
import type { Product, ProductVariant, Review } from '../types/store.ts';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, addToCart, wishlistIds, toggleWishlist, settings, customer, notify } =
    useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [revName, setRevName] = useState(customer?.fullName || '');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (customer?.fullName && !revName) setRevName(customer.fullName);
  }, [customer, revName]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiFetch<{
          product: Product;
          reviews: Review[];
          relatedProducts: Product[];
        }>(`/api/products/${slug}`);
        if (!active) return;
        setProduct(res.product);
        setReviews(res.reviews);
        setRelated(res.relatedProducts);
        setSelectedVariant(res.product.variants?.[0] || null);
        setActiveImageIdx(0);
        setQuantity(1);
      } catch {
        if (active) setProduct(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-[4/3] rounded-lg bg-[#EFECE5] dark:bg-[#181715] animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-[#EFECE5] dark:bg-[#181715] rounded animate-pulse" />
          <div className="h-6 w-1/3 bg-[#EFECE5] dark:bg-[#181715] rounded animate-pulse" />
          <div className="h-32 w-full bg-[#EFECE5] dark:bg-[#181715] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold">Piece Not Found</h1>
        <p className="text-sm text-[#78716C]">This item may have been archived or moved.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const inWishlist = wishlistIds.includes(product.id);
  const hasDiscount = product.salePrice !== null && product.salePrice < product.regularPrice;
  const basePrice = hasDiscount ? product.salePrice! : product.regularPrice;
  const effectivePrice = basePrice + (selectedVariant?.priceAdjust || 0);
  const savings = hasDiscount ? product.regularPrice - effectivePrice : 0;
  const discountPct = hasDiscount
    ? Math.round(((product.regularPrice - effectivePrice) / product.regularPrice) * 100)
    : 0;
  const maxStock = selectedVariant ? selectedVariant.stock : product.stockQuantity;
  const whatsappNumber = (settings?.general?.whatsappNumber || '923076817272').replace(/\D/g, '');

  const buildCartPayload = () => ({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    image: product.images?.[0] || '',
    unitPrice: effectivePrice,
    regularPrice: product.regularPrice,
    quantity,
    variantId: selectedVariant?.id,
    variantLabel: selectedVariant?.name || product.colors?.[0] || '',
  });

  const handleAddToCart = () => {
    if (maxStock <= 0) return;
    addToCart(buildCartPayload());
  };

  const handleBuyNow = () => {
    if (maxStock <= 0) return;
    addToCart(buildCartPayload());
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;
    try {
      setSubmittingReview(true);
      const res = await apiFetch<{ review: Review }>(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: revName,
          rating: revRating,
          title: revTitle,
          comment: revComment,
        }),
      });
      setReviews((prev) => [res.review, ...prev]);
      setRevTitle('');
      setRevComment('');
      notify('Thank you for sharing your review.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to post review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="pb-20 sm:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#78716C] dark:text-[#A8A29E] mb-6">
          <button type="button" onClick={() => navigate('/')} className="hover:underline">
            Home
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => navigate(`/category/${product.categorySlug || 'all'}`)}
            className="hover:underline"
          >
            {product.categoryName || 'Shop'}
          </button>
          <span>/</span>
          <span className="text-[#111111] dark:text-[#F5F3EE] truncate">{product.name}</span>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div
              onClick={() => setZoomed((z) => !z)}
              className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#F2EFE8] dark:bg-[#19191D] border border-[#E8E3D9] dark:border-[#262420] cursor-zoom-in"
            >
              <SafeImage
                src={product.images?.[activeImageIdx] || product.images?.[0]}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  zoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
                }`}
              />
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-black/65 text-white text-[11px] inline-flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5" /> {zoomed ? 'Click to reset' : 'Click to zoom'}
              </span>
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setZoomed(false);
                    }}
                    className={`w-24 aspect-[4/3] rounded overflow-hidden border-2 shrink-0 ${
                      activeImageIdx === idx
                        ? 'border-[#A67C2E] dark:border-[#D4AF37]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wider">
                <span>{product.categoryName}</span>
                <span>·</span>
                <span className="font-mono">SKU: {product.sku}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center text-[#A67C2E] dark:text-[#D4AF37]">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 font-semibold font-mono">{product.avgRating || 5.0}</span>
                </div>
                <span className="text-[#78716C]">({reviews.length} reviews)</span>
              </div>
            </div>

            <div className="py-4 border-y border-[#F0ECE2] dark:border-[#22201D] space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums">
                  {formatPKR(effectivePrice)}
                </span>
                {hasDiscount && (
                  <span className="font-mono text-base text-[#78716C] line-through tabular-nums">
                    {formatPKR(product.regularPrice)}
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-xs font-semibold text-[#A67C2E] dark:text-[#D4AF37]">
                  You save {formatPKR(savings)} ({discountPct}% off)
                </p>
              )}
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] pt-1">
                {maxStock > 0
                  ? maxStock <= product.lowStockThreshold
                    ? `Limited stock · Only ${maxStock} remaining`
                    : `In stock (${maxStock} available)`
                  : 'Currently out of stock'}
              </p>
            </div>

            {/* Variant Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
                  Select Variant
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-2 rounded text-xs font-medium border transition-colors ${
                        selectedVariant?.id === v.id
                          ? 'border-[#111111] bg-[#111111] text-white dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                          : 'border-[#E8E3D9] dark:border-[#2C2A25] hover:border-[#A67C2E]'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Action Buttons */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-[#E8E3D9] dark:border-[#2C2A25] rounded">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 hover:bg-[#F2EFE8] dark:hover:bg-[#1C1B18]"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, maxStock), q + 1))}
                    className="p-2.5 hover:bg-[#F2EFE8] dark:hover:bg-[#1C1B18]"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold hover:border-[#A67C2E]"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      inWishlist
                        ? 'fill-[#A67C2E] text-[#A67C2E] dark:fill-[#D4AF37] dark:text-[#D4AF37]'
                        : ''
                    }`}
                  />
                  <span>{inWishlist ? 'Saved' : 'Wishlist'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={maxStock <= 0}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded border border-[#111111] dark:border-[#D4AF37] text-sm font-semibold hover:bg-[#111111] hover:text-white dark:hover:bg-[#D4AF37] dark:hover:text-[#0A0A0B] transition-colors disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Bag
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={maxStock <= 0}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                >
                  Buy Now
                </button>
              </div>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                  `Assalam-o-Alaikum PRINCE STAR, I am inquiring about "${product.name}" (SKU: ${product.sku}).`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-[#128C7E]/10 text-[#128C7E] dark:text-[#34D399] border border-[#128C7E]/30 text-xs font-semibold hover:bg-[#128C7E]/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Ask on WhatsApp (+92 307 6817272)
              </a>
            </div>

            {/* Description & Assurances */}
            <div className="space-y-4 pt-2 text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
              <p>{product.description}</p>
              <div className="space-y-2 pt-2 border-t border-[#F0ECE2] dark:border-[#22201D] text-xs">
                <p className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37] shrink-0" />
                  <span>{product.shippingInfo}</span>
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#A67C2E] dark:text-[#D4AF37] shrink-0" />
                  <span>{product.warrantyInfo}</span>
                </p>
              </div>
            </div>

            {/* Specifications Table */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="pt-4 border-t border-[#F0ECE2] dark:border-[#22201D]">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Specifications
                </h3>
                <dl className="divide-y divide-[#F0ECE2] dark:divide-[#22201D] text-xs">
                  {product.specifications.map((spec, idx) => (
                    <div key={idx} className="py-2 flex justify-between gap-4">
                      <dt className="text-[#78716C]">{spec.label}</dt>
                      <dd className="font-medium text-right">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Reviews & Ratings */}
        <section className="mt-16 pt-12 border-t border-[#E8E3D9] dark:border-[#262420] grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-3xl font-semibold">Client Reviews</h2>
            <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
              Share your experience with this PRINCE STAR piece.
            </p>
            <form
              onSubmit={handleReviewSubmit}
              className="space-y-3 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5"
            >
              <input
                type="text"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Your name & city (e.g. Tariq · Lahore)"
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#78716C]">Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRevRating(n)}
                    className={n <= revRating ? 'text-[#A67C2E] dark:text-[#D4AF37]' : 'text-[#A8A29E]'}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={revTitle}
                onChange={(e) => setRevTitle(e.target.value)}
                placeholder="Review headline (optional)"
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
              <textarea
                required
                rows={3}
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                placeholder="Your thoughts on finish, fit, and delivery..."
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-[#78716C]">No reviews yet. Be the first to review this piece.</p>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[#A67C2E] dark:text-[#D4AF37]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-[#78716C]">
                      {new Date(rev.createdAt).toLocaleDateString('en-PK')}
                    </span>
                  </div>
                  {rev.title && <h4 className="font-semibold text-sm">{rev.title}</h4>}
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">{rev.comment}</p>
                  <div className="flex items-center gap-2 text-xs text-[#78716C]">
                    <span className="font-medium text-[#111111] dark:text-[#F5F3EE]">
                      {rev.customerName}
                    </span>
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[#A67C2E] dark:text-[#D4AF37]">
                        <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[#E8E3D9] dark:border-[#262420]">
            <h2 className="font-display text-3xl font-semibold mb-6">You May Also Appreciate</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Add-to-Cart Bar (<15% viewport cap: 56px) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#131316]/95 backdrop-blur-md border-t border-[#E8E3D9] dark:border-[#262420] px-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{product.name}</p>
          <p className="font-mono text-sm font-semibold tabular-nums">{formatPKR(effectivePrice)}</p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={maxStock <= 0}
          className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-40"
        >
          {maxStock > 0 ? 'Add to Bag' : 'Sold Out'}
        </button>
      </div>
    </div>
  );
}
