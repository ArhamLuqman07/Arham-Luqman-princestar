import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatPKR } from '../lib/api.ts';
import type { Product } from '../types/store.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart, wishlistIds, toggleWishlist } = useStore();
  const inWishlist = wishlistIds.includes(product.id);
  const hasDiscount = product.salePrice !== null && product.salePrice < product.regularPrice;
  const activePrice = hasDiscount ? product.salePrice! : product.regularPrice;
  const computedDiscount = hasDiscount
    ? Math.round(((product.regularPrice - product.salePrice!) / product.regularPrice) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stockQuantity <= 0) return;
    const defaultVariant = product.variants?.[0];
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: product.images?.[0] || '',
      unitPrice: activePrice + (defaultVariant?.priceAdjust || 0),
      regularPrice: product.regularPrice,
      quantity: 1,
      variantId: defaultVariant?.id,
      variantLabel: defaultVariant?.name || product.colors?.[0] || '',
    });
  };

  return (
    <article
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group cursor-pointer flex flex-col bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#A67C2E]/60 dark:hover:border-[#D4AF37]/60"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2EFE8] dark:bg-[#19191D]">
        <SafeImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-[#0A0A0B]/85 text-[#111111] dark:text-[#F5F3EE] border border-[#E8E3D9] dark:border-[#2C2A25] transition-colors hover:text-[#A67C2E] dark:hover:text-[#D4AF37]"
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#A67C2E] text-[#A67C2E] dark:fill-[#D4AF37] dark:text-[#D4AF37]' : ''}`} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase text-[#78716C] dark:text-[#A8A29E] mb-1.5">
            <span className="truncate">{product.categoryName || 'Luxury Collection'}</span>
            {computedDiscount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#A67C2E] dark:text-[#D4AF37] font-semibold">
                  Save {computedDiscount}%
                </span>
              </>
            )}
          </div>
          <h3 className="text-[15px] sm:text-base font-semibold text-[#111111] dark:text-[#F5F3EE] leading-snug line-clamp-2 group-hover:text-[#A67C2E] dark:group-hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0ECE2] dark:border-[#22201D]">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-mono text-[15px] font-semibold text-[#111111] dark:text-[#F5F3EE] tabular-nums whitespace-nowrap">
              {formatPKR(activePrice)}
            </span>
            {hasDiscount && (
              <span className="font-mono text-xs text-[#78716C] dark:text-[#78716C] line-through tabular-nums whitespace-nowrap">
                {formatPKR(product.regularPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={product.stockQuantity <= 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 bg-[#111111] text-[#F5F3EE] dark:bg-[#D4AF37] dark:text-[#0A0A0B] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stockQuantity > 0 ? 'Add' : 'Sold Out'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
