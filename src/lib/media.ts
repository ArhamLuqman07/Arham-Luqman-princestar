import heroLuxuryWatches from '../assets/images/hero_luxury_watches_1794663409281.jpg';
import heroEyewearLeather from '../assets/images/hero_eyewear_leather_1794663410087.jpg';
import heroMenswearFootwear from '../assets/images/hero_menswear_footwear_1794663410443.jpg';
import productWatchChronograph from '../assets/images/product_watch_chronograph_1794663410870.jpg';
import productWatchSkeleton from '../assets/images/product_watch_skeleton_1794663410958.jpg';
import productGlassesAviator from '../assets/images/product_glasses_aviator_1794663411759.jpg';
import productWalletLeather from '../assets/images/product_wallet_leather_1794663412724.jpg';
import productShoesLoafer from '../assets/images/product_shoes_loafer_1794663413173.jpg';
import productClothingJacket from '../assets/images/product_clothing_jacket_1794663413323.jpg';
import productAccessoryCufflinks from '../assets/images/product_accessory_cufflinks_1794663414081.jpg';

const MEDIA_MAP: Record<string, string> = {
  '/src/assets/images/hero_luxury_watches_1794663409281.jpg': heroLuxuryWatches,
  '/src/assets/images/hero_eyewear_leather_1794663410087.jpg': heroEyewearLeather,
  '/src/assets/images/hero_menswear_footwear_1794663410443.jpg': heroMenswearFootwear,
  '/src/assets/images/product_watch_chronograph_1794663410870.jpg': productWatchChronograph,
  '/src/assets/images/product_watch_skeleton_1794663410958.jpg': productWatchSkeleton,
  '/src/assets/images/product_glasses_aviator_1794663411759.jpg': productGlassesAviator,
  '/src/assets/images/product_wallet_leather_1794663412724.jpg': productWalletLeather,
  '/src/assets/images/product_shoes_loafer_1794663413173.jpg': productShoesLoafer,
  '/src/assets/images/product_clothing_jacket_1794663413323.jpg': productClothingJacket,
  '/src/assets/images/product_accessory_cufflinks_1794663414081.jpg': productAccessoryCufflinks,
};

export const BUILTIN_GALLERY_OPTIONS = Object.entries(MEDIA_MAP).map(([key, src]) => ({
  key,
  label: key
    .replace('/src/assets/images/', '')
    .replace(/_\d+\.jpg$/, '')
    .replace(/_/g, ' '),
  src,
}));

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return productWatchChronograph;
  if (MEDIA_MAP[url]) return MEDIA_MAP[url];
  return url;
}
