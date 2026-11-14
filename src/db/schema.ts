import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  phone: text('phone').default(''),
  addresses: jsonb('addresses').$type<SavedAddress[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  totalSpent: integer('total_spent').default(0).notNull(),
  ordersCount: integer('orders_count').default(0).notNull(),
  resetTokenHash: text('reset_token_hash'),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('super_admin').notNull(),
  mustChangePassword: boolean('must_change_password').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id')
    .references(() => adminUsers.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  userAgent: text('user_agent').default(''),
  ipAddress: text('ip_address').default(''),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customerSessions = pgTable('customer_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').default(''),
  imageUrl: text('image_url').default(''),
  sortOrder: integer('sort_order').default(0).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isSpecialCollection: boolean('is_special_collection').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  subcategory: text('subcategory').default(''),
  regularPrice: integer('regular_price').notNull(),
  salePrice: integer('sale_price'),
  costPrice: integer('cost_price').default(0).notNull(),
  discountPercent: integer('discount_percent').default(0).notNull(),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  colors: jsonb('colors').$type<string[]>().default([]).notNull(),
  sizes: jsonb('sizes').$type<string[]>().default([]).notNull(),
  variants: jsonb('variants').$type<ProductVariant[]>().default([]).notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isBestSeller: boolean('is_best_seller').default(false).notNull(),
  isNewArrival: boolean('is_new_arrival').default(false).notNull(),
  isSpecialOffer: boolean('is_special_offer').default(false).notNull(),
  specifications: jsonb('specifications').$type<ProductSpec[]>().default([]).notNull(),
  warrantyInfo: text('warranty_info').default('1-Year Official Brand Warranty'),
  shippingInfo: text('shipping_info').default('Nationwide delivery across Pakistan within 2-4 business days.'),
  seoTitle: text('seo_title').default(''),
  seoDescription: text('seo_description').default(''),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').default('percentage').notNull(),
  discountValue: integer('discount_value').notNull(),
  minOrderValue: integer('min_order_value').default(0).notNull(),
  maxUses: integer('max_uses').default(1).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  eligibleCategoryIds: jsonb('eligible_category_ids').$type<number[]>().default([]).notNull(),
  eligibleProductIds: jsonb('eligible_product_ids').$type<number[]>().default([]).notNull(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  source: text('source').default('admin').notNull(),
  assignedEmail: text('assigned_email').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').default(''),
  deliveryAddress: text('delivery_address').notNull(),
  city: text('city').notNull(),
  province: text('province').notNull(),
  postalCode: text('postal_code').default(''),
  orderNotes: text('order_notes').default(''),
  paymentMethod: text('payment_method').default('cod').notNull(),
  paymentStatus: text('payment_status').default('pending').notNull(),
  paymentReference: text('payment_reference').default(''),
  orderStatus: text('order_status').default('Pending').notNull(),
  trackingNumber: text('tracking_number').default(''),
  courierName: text('courier_name').default(''),
  internalNotes: text('internal_notes').default(''),
  subtotal: integer('subtotal').notNull(),
  discountAmount: integer('discount_amount').default(0).notNull(),
  couponCode: text('coupon_code').default(''),
  shippingCost: integer('shipping_cost').default(0).notNull(),
  totalAmount: integer('total_amount').notNull(),
  totalCost: integer('total_cost').default(0).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull(),
  variantLabel: text('variant_label').default(''),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitCost: integer('unit_cost').default(0).notNull(),
  lineTotal: integer('line_total').notNull(),
});

export const orderStatusHistory = pgTable('order_status_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(),
  note: text('note').default(''),
  changedBy: text('changed_by').default('System').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const socialVerifications = pgTable('social_verifications', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(),
  username: text('username').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').default(''),
  customerPhone: text('customer_phone').default(''),
  proofUrl: text('proof_url').default(''),
  proofNote: text('proof_note').default(''),
  status: text('status').default('pending').notNull(),
  couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  generatedCode: text('generated_code').default(''),
  adminNote: text('admin_note').default(''),
  reviewedBy: text('reviewed_by').default(''),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').default(''),
  comment: text('comment').notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  isApproved: boolean('is_approved').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wishlistItems = pgTable('wishlist_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  category: text('category').notNull(),
  amount: integer('amount').notNull(),
  notes: text('notes').default(''),
  recordedBy: text('recorded_by').default('Admin').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').default(''),
  kicker: text('kicker').default(''),
  ctaText: text('cta_text').default('Shop Collection'),
  ctaLink: text('cta_link').default('/shop'),
  imageUrl: text('image_url').notNull(),
  placement: text('placement').default('hero').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  type: text('type').default('contact').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').default(''),
  orderNumber: text('order_number').default(''),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').default('new').notNull(),
  adminReply: text('admin_reply').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  adminUsername: text('admin_username').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').default(''),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  history: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
