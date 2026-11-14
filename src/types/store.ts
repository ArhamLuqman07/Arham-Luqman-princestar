export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  size?: string;
  skuSuffix: string;
  stock: number;
  priceAdjust: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isVisible: boolean;
  isSpecialCollection: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: number | null;
  categoryName?: string;
  categorySlug?: string;
  subcategory: string;
  regularPrice: number;
  salePrice: number | null;
  costPrice: number;
  discountPercent: number;
  effectivePrice?: number;
  images: string[];
  colors: string[];
  sizes: string[];
  variants: ProductVariant[];
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSpecialOffer: boolean;
  specifications: ProductSpec[];
  warrantyInfo: string;
  shippingInfo: string;
  seoTitle: string;
  seoDescription: string;
  isDemo?: boolean;
  avgRating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  kicker: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  placement: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Review {
  id: number;
  productId: number;
  productName?: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  image: string;
  unitPrice: number;
  regularPrice: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
}

export interface CustomerUser {
  id: number;
  uid?: string | null;
  email: string;
  fullName: string;
  phone: string;
  addresses: SavedAddress[];
  status: string;
  totalSpent?: number;
  ordersCount?: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  sku: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface OrderHistoryEntry {
  id: number;
  orderId: number;
  status: string;
  note: string;
  changedBy: string;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  city: string;
  province: string;
  postalCode: string;
  orderNotes: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string;
  orderStatus: string;
  trackingNumber: string;
  courierName: string;
  internalNotes: string;
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  shippingCost: number;
  totalAmount: number;
  totalCost: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  history?: OrderHistoryEntry[];
}

export interface StorefrontSettings {
  general: {
    brandName: string;
    tagline: string;
    contactPhone: string;
    whatsappNumber: string;
    complaintEmail: string;
    address: string;
    currency: string;
    timezone: string;
    logoUrl: string;
    googleMapsUrl: string;
  };
  appearance: {
    announcementText: string;
    announcementEnabled: boolean;
    showHero: boolean;
    showCategories: boolean;
    showNewArrivals: boolean;
    showBestSellers: boolean;
    showFeatured: boolean;
    showSpecialOffers: boolean;
    showBrandStory: boolean;
    showTestimonials: boolean;
    showWhyChoose: boolean;
    showSocialShowcase: boolean;
    showFaq: boolean;
    heroHeading: string;
    heroSubheading: string;
    brandStoryHeading: string;
    brandStoryBody: string;
    accentColor: string;
  };
  store: {
    standardShippingFee: number;
    freeShippingThreshold: number;
    taxPercent: number;
    codEnabled: boolean;
    easypaisaEnabled: boolean;
    easypaisaTitle: string;
    easypaisaAccount: string;
    jazzcashEnabled: boolean;
    jazzcashTitle: string;
    jazzcashAccount: string;
    socialDiscountType: string;
    socialDiscountValue: number;
    socialDiscountMinOrder: number;
    socialDiscountExpiryDays: number;
    socialDiscountMaxUses: number;
  };
  social: {
    instagramHandle: string;
    instagramUrl: string;
    tiktokHandle: string;
    tiktokUrl: string;
    facebookHandle: string;
    facebookUrl: string;
    youtubeHandle: string;
    youtubeUrl: string;
  };
}
