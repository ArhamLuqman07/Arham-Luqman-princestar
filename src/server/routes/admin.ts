import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  adminSessions,
  adminUsers,
  auditLogs,
  banners,
  categories,
  coupons,
  expenses,
  inquiries,
  newsletterSubscribers,
  orderItems,
  orders,
  orderStatusHistory,
  products,
  reviews,
  siteSettings,
  socialVerifications,
  users,
} from '../../db/schema.ts';
import {
  ADMIN_COOKIE_NAME,
  type AuthRequest,
  clearCookie,
  createAdminSession,
  hashToken,
  rateLimit,
  recordAuditLog,
  requireAdmin,
  setCookie,
} from '../auth.ts';
import { DEFAULT_SETTINGS, ensureBootstrapData, getSettingValue } from '../seed.ts';

const router = express.Router();

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
] as const;

const OPERATING_EXPENSE_CATEGORIES = new Set([
  'advertising',
  'packaging',
  'delivery',
  'payment_fees',
  'returns_refunds',
  'other',
]);

function resolveDateBounds(range: string, start?: string, end?: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (range === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (range === 'yesterday') {
    const y = new Date(now.getTime() - 86400000);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (range === '7d') {
    const f = new Date(now.getTime() - 6 * 86400000);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  if (range === '30d') {
    const f = new Date(now.getTime() - 29 * 86400000);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  if (range === 'this_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: endOfDay(now),
    };
  }
  if (range === 'prev_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (range === 'custom' && start && end) {
    return {
      from: startOfDay(new Date(start)),
      to: endOfDay(new Date(end)),
    };
  }
  return { from: null, to: null };
}

function inRange(dateVal: Date | string, from: Date | null, to: Date | null): boolean {
  const d = new Date(dateVal);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// --- Admin Authentication ---

router.post('/login', rateLimit('admin-login', 10, 60 * 1000), async (req, res) => {
  try {
    await ensureBootstrapData();
    const { username, password } = req.body || {};
    const cleanUser = String(username || '').trim();
    if (!cleanUser || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, cleanUser));

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const valid = await bcrypt.compare(String(password), admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin.id));

    const token = await createAdminSession(admin.id, req);
    setCookie(res, ADMIN_COOKIE_NAME, token, 1000 * 60 * 60 * 12);

    await recordAuditLog(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
      'LOGIN',
      'admin_user',
      admin.id
    );

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Administrator sign in failed.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const rawToken = req.cookies?.[ADMIN_COOKIE_NAME];
    if (rawToken) {
      await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(rawToken)));
    }
    clearCookie(res, ADMIN_COOKIE_NAME);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

router.get('/me', requireAdmin, (req: AuthRequest, res) => {
  res.json({ admin: req.admin });
});

router.post('/change-password', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const admin = req.admin!;
    const { currentPassword, newPassword, newUsername, newEmail } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        error: 'Current password and a new password of at least 8 characters are required.',
      });
    }

    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id));
    const matches = await bcrypt.compare(String(currentPassword), row.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (String(newPassword) === String(currentPassword)) {
      return res.status(400).json({ error: 'Please choose a new password different from the current one.' });
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    const updatedUsername = newUsername ? String(newUsername).trim() : row.username;
    const updatedEmail = newEmail ? String(newEmail).trim().toLowerCase() : row.email;

    const [updated] = await db
      .update(adminUsers)
      .set({
        username: updatedUsername,
        email: updatedEmail,
        passwordHash: newHash,
        mustChangePassword: false,
      })
      .where(eq(adminUsers.id, admin.id))
      .returning();

    await recordAuditLog(admin, 'CHANGE_CREDENTIALS', 'admin_user', admin.id, {
      usernameUpdated: updatedUsername !== row.username,
    });

    res.json({
      admin: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        mustChangePassword: updated.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({ error: 'Failed to update administrator credentials.' });
  }
});

// Protect all routes below with requireAdmin
router.use(requireAdmin);

// --- Analytics & Overview ---

router.get('/analytics', async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const start = req.query.start ? String(req.query.start) : undefined;
    const end = req.query.end ? String(req.query.end) : undefined;
    const { from, to } = resolveDateBounds(range, start, end);

    const [
      allOrders,
      allOrderItems,
      allProducts,
      allCategories,
      allUsers,
      allExpenses,
      allSocials,
      allInquiries,
    ] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(products),
      db.select().from(categories),
      db.select().from(users),
      db.select().from(expenses),
      db.select().from(socialVerifications),
      db.select().from(inquiries),
    ]);

    const filteredOrders = allOrders.filter((o) => inRange(o.createdAt, from, to));
    const filteredExpenses = allExpenses.filter((e) => inRange(e.date, from, to));
    const filteredOrderIds = new Set(filteredOrders.map((o) => o.id));
    const filteredItems = allOrderItems.filter((i) => filteredOrderIds.has(i.orderId));

    const validOrders = filteredOrders.filter(
      (o) => !['Cancelled', 'Returned', 'Refunded'].includes(o.orderStatus)
    );
    const validOrderIds = new Set(validOrders.map((o) => o.id));
    const validItems = filteredItems.filter((i) => validOrderIds.has(i.orderId));

    const totalRevenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const collectedCash = validOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const outstandingPayments = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);

    const totalCogs = validOrders.reduce((s, o) => s + o.totalCost, 0);
    const grossProfit = totalRevenue - totalCogs;
    const operatingExpenses = filteredExpenses
      .filter((e) => OPERATING_EXPENSE_CATEGORIES.has(e.category))
      .reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - operatingExpenses;

    const pendingOrders = filteredOrders.filter((o) => o.orderStatus === 'Pending').length;
    const deliveredOrders = filteredOrders.filter((o) => o.orderStatus === 'Delivered').length;
    const cancelledOrders = filteredOrders.filter((o) => o.orderStatus === 'Cancelled').length;
    const returnsRefunds = filteredOrders.filter((o) =>
      ['Returned', 'Refunded'].includes(o.orderStatus)
    ).length;

    const productsSold = validItems.reduce((s, i) => s + i.quantity, 0);
    const totalDiscounts = validOrders.reduce((s, o) => s + o.discountAmount, 0);
    const averageOrderValue =
      validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

    const lowStockProducts = allProducts
      .filter((p) => p.stockQuantity <= p.lowStockThreshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    const inventoryValue = allProducts.reduce(
      (s, p) => s + p.stockQuantity * p.costPrice,
      0
    );

    // Best-selling products
    const prodSalesMap = new Map<
      number,
      { productId: number; name: string; sku: string; units: number; revenue: number }
    >();
    for (const item of validItems) {
      if (!item.productId) continue;
      const prev = prodSalesMap.get(item.productId) || {
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        units: 0,
        revenue: 0,
      };
      prev.units += item.quantity;
      prev.revenue += item.lineTotal;
      prodSalesMap.set(item.productId, prev);
    }
    const bestSellingProducts = Array.from(prodSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // Category performance
    const prodById = new Map(allProducts.map((p) => [p.id, p]));
    const catById = new Map(allCategories.map((c) => [c.id, c]));
    const catPerfMap = new Map<string, { name: string; units: number; revenue: number }>();
    for (const item of validItems) {
      const prod = item.productId ? prodById.get(item.productId) : null;
      const cat = prod?.categoryId ? catById.get(prod.categoryId) : null;
      const catName = cat?.name || 'Other';
      const prev = catPerfMap.get(catName) || { name: catName, units: 0, revenue: 0 };
      prev.units += item.quantity;
      prev.revenue += item.lineTotal;
      catPerfMap.set(catName, prev);
    }
    const categoryPerformance = Array.from(catPerfMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Payment breakdown
    const paymentBreakdown = ['cod', 'easypaisa', 'jazzcash'].map((method) => {
      const matching = validOrders.filter((o) => o.paymentMethod === method);
      return {
        method,
        count: matching.length,
        amount: matching.reduce((s, o) => s + o.totalAmount, 0),
      };
    });

    // Daily trend series
    const dayMap = new Map<
      string,
      { date: string; revenue: number; orders: number; profit: number }
    >();
    for (const ord of validOrders) {
      const dayKey = new Date(ord.createdAt).toISOString().slice(0, 10);
      const prev = dayMap.get(dayKey) || { date: dayKey, revenue: 0, orders: 0, profit: 0 };
      prev.revenue += ord.totalAmount;
      prev.orders += 1;
      prev.profit += ord.totalAmount - ord.totalCost;
      dayMap.set(dayKey, prev);
    }
    const dailySeries = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      summary: {
        totalRevenue,
        collectedCash,
        outstandingPayments,
        totalOrders: filteredOrders.length,
        totalCustomers: allUsers.length,
        totalProducts: allProducts.length,
        grossProfit,
        netProfit,
        cogs: totalCogs,
        operatingExpenses,
        inventoryValue,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        returnsRefunds,
        productsSold,
        averageOrderValue,
        totalDiscounts,
        pendingSocialCount: allSocials.filter((s) => s.status === 'pending').length,
        newInquiriesCount: allInquiries.filter((i) => i.status === 'new').length,
      },
      lowStockProducts,
      bestSellingProducts,
      categoryPerformance,
      paymentBreakdown,
      dailySeries,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Unable to load analytics.' });
  }
});

// --- Products & Inventory ---

router.get('/products', async (_req, res) => {
  try {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    res.json({ products: rows });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({ error: 'Unable to load products.' });
  }
});

router.post('/products', async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.sku || !body.regularPrice) {
      return res.status(400).json({ error: 'Product name, SKU, and regular price are required.' });
    }
    const regularPrice = Number(body.regularPrice);
    const salePrice = body.salePrice ? Number(body.salePrice) : null;
    const discountPercent =
      salePrice && salePrice < regularPrice
        ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
        : 0;
    const slug = `${slugify(String(body.name))}-${String(body.sku).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const [created] = await db
      .insert(products)
      .values({
        name: String(body.name).trim(),
        slug,
        sku: String(body.sku).trim().toUpperCase(),
        description: String(body.description || '').trim(),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        subcategory: String(body.subcategory || ''),
        regularPrice,
        salePrice,
        costPrice: Number(body.costPrice || 0),
        discountPercent,
        images: Array.isArray(body.images) ? body.images : [],
        colors: Array.isArray(body.colors) ? body.colors : [],
        sizes: Array.isArray(body.sizes) ? body.sizes : [],
        variants: Array.isArray(body.variants) ? body.variants : [],
        stockQuantity: Number(body.stockQuantity || 0),
        lowStockThreshold: Number(body.lowStockThreshold ?? 5),
        isAvailable: body.isAvailable !== false,
        isFeatured: Boolean(body.isFeatured),
        isBestSeller: Boolean(body.isBestSeller),
        isNewArrival: Boolean(body.isNewArrival),
        isSpecialOffer: Boolean(body.isSpecialOffer),
        specifications: Array.isArray(body.specifications) ? body.specifications : [],
        warrantyInfo: String(body.warrantyInfo || '1-Year Official Brand Warranty'),
        shippingInfo: String(body.shippingInfo || 'Nationwide delivery across Pakistan within 2-4 business days.'),
        seoTitle: String(body.seoTitle || ''),
        seoDescription: String(body.seoDescription || ''),
        isDemo: false,
      })
      .returning();

    await recordAuditLog(req.admin!, 'CREATE_PRODUCT', 'product', created.id, {
      sku: created.sku,
      name: created.name,
    });
    res.status(201).json({ product: created });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json({ error: 'Unable to create product. Ensure SKU is unique.' });
  }
});

router.put('/products/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const regularPrice = Number(body.regularPrice);
    const salePrice = body.salePrice ? Number(body.salePrice) : null;
    const discountPercent =
      salePrice && salePrice < regularPrice
        ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
        : 0;

    const [updated] = await db
      .update(products)
      .set({
        name: String(body.name).trim(),
        sku: String(body.sku).trim().toUpperCase(),
        description: String(body.description || '').trim(),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        subcategory: String(body.subcategory || ''),
        regularPrice,
        salePrice,
        costPrice: Number(body.costPrice || 0),
        discountPercent,
        images: Array.isArray(body.images) ? body.images : [],
        colors: Array.isArray(body.colors) ? body.colors : [],
        sizes: Array.isArray(body.sizes) ? body.sizes : [],
        variants: Array.isArray(body.variants) ? body.variants : [],
        stockQuantity: Number(body.stockQuantity || 0),
        lowStockThreshold: Number(body.lowStockThreshold ?? 5),
        isAvailable: body.isAvailable !== false,
        isFeatured: Boolean(body.isFeatured),
        isBestSeller: Boolean(body.isBestSeller),
        isNewArrival: Boolean(body.isNewArrival),
        isSpecialOffer: Boolean(body.isSpecialOffer),
        specifications: Array.isArray(body.specifications) ? body.specifications : [],
        warrantyInfo: String(body.warrantyInfo || ''),
        shippingInfo: String(body.shippingInfo || ''),
        seoTitle: String(body.seoTitle || ''),
        seoDescription: String(body.seoDescription || ''),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_PRODUCT', 'product', id, { name: updated?.name });
    res.json({ product: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json({ error: 'Unable to update product.' });
  }
});

router.delete('/products/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(products).where(eq(products.id, id));
    await recordAuditLog(req.admin!, 'DELETE_PRODUCT', 'product', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Unable to delete product.' });
  }
});

router.patch('/inventory/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { stockQuantity, lowStockThreshold, isAvailable } = req.body || {};
    const [updated] = await db
      .update(products)
      .set({
        stockQuantity: Number(stockQuantity),
        lowStockThreshold: Number(lowStockThreshold ?? 5),
        isAvailable: isAvailable !== false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_STOCK', 'product', id, { stockQuantity });
    res.json({ product: updated });
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Unable to update inventory.' });
  }
});

// --- Categories ---

router.get('/categories', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    res.json({ categories: rows });
  } catch (error) {
    console.error('Admin categories error:', error);
    res.status(500).json({ error: 'Unable to load categories.' });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, imageUrl, sortOrder, isVisible, isSpecialCollection } =
      req.body || {};
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const [created] = await db
      .insert(categories)
      .values({
        name: String(name).trim(),
        slug: slug ? slugify(String(slug)) : slugify(String(name)),
        description: String(description || ''),
        imageUrl: String(imageUrl || ''),
        sortOrder: Number(sortOrder || 0),
        isVisible: isVisible !== false,
        isSpecialCollection: Boolean(isSpecialCollection),
      })
      .returning();

    await recordAuditLog(req.admin!, 'CREATE_CATEGORY', 'category', created.id, {
      name: created.name,
    });
    res.status(201).json({ category: created });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(400).json({ error: 'Unable to create category.' });
  }
});

router.put('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug, description, imageUrl, sortOrder, isVisible, isSpecialCollection } =
      req.body || {};
    const [updated] = await db
      .update(categories)
      .set({
        name: String(name).trim(),
        slug: slug ? slugify(String(slug)) : slugify(String(name)),
        description: String(description || ''),
        imageUrl: String(imageUrl || ''),
        sortOrder: Number(sortOrder || 0),
        isVisible: isVisible !== false,
        isSpecialCollection: Boolean(isSpecialCollection),
      })
      .where(eq(categories.id, id))
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_CATEGORY', 'category', id, { name: updated?.name });
    res.json({ category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(400).json({ error: 'Unable to update category.' });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(categories).where(eq(categories.id, id));
    await recordAuditLog(req.admin!, 'DELETE_CATEGORY', 'category', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Unable to delete category.' });
  }
});

// --- Orders ---

router.get('/orders', async (_req, res) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    if (allOrders.length === 0) return res.json({ orders: [] });

    const ids = allOrders.map((o) => o.id);
    const [items, history] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
      db
        .select()
        .from(orderStatusHistory)
        .where(inArray(orderStatusHistory.orderId, ids))
        .orderBy(asc(orderStatusHistory.createdAt)),
    ]);

    const itemsMap = new Map<number, typeof items>();
    for (const i of items) {
      const arr = itemsMap.get(i.orderId) || [];
      arr.push(i);
      itemsMap.set(i.orderId, arr);
    }

    const histMap = new Map<number, typeof history>();
    for (const h of history) {
      const arr = histMap.get(h.orderId) || [];
      arr.push(h);
      histMap.set(h.orderId, arr);
    }

    res.json({
      orders: allOrders.map((o) => ({
        ...o,
        items: itemsMap.get(o.id) || [],
        history: histMap.get(o.id) || [],
      })),
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ error: 'Unable to load orders.' });
  }
});

router.put('/orders/:id/status', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { orderStatus, trackingNumber, courierName, internalNotes, note } = req.body || {};

    if (!ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(orders).where(eq(orders.id, id));
      if (!existing) throw new Error('Order not found.');

      const wasRestocked = ['Cancelled', 'Returned', 'Refunded'].includes(existing.orderStatus);
      const willRestock = ['Cancelled', 'Returned', 'Refunded'].includes(orderStatus);

      if (!wasRestocked && willRestock) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
        for (const item of items) {
          if (item.productId) {
            const [prod] = await tx
              .select()
              .from(products)
              .where(eq(products.id, item.productId));
            if (prod) {
              await tx
                .update(products)
                .set({ stockQuantity: prod.stockQuantity + item.quantity })
                .where(eq(products.id, prod.id));
            }
          }
        }
      }

      const [nextOrder] = await tx
        .update(orders)
        .set({
          orderStatus,
          trackingNumber:
            trackingNumber !== undefined ? String(trackingNumber).trim() : existing.trackingNumber,
          courierName:
            courierName !== undefined ? String(courierName).trim() : existing.courierName,
          internalNotes:
            internalNotes !== undefined ? String(internalNotes).trim() : existing.internalNotes,
          paymentStatus:
            orderStatus === 'Delivered' && existing.paymentMethod === 'cod'
              ? 'paid'
              : orderStatus === 'Refunded'
              ? 'refunded'
              : existing.paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderStatusHistory).values({
        orderId: id,
        status: orderStatus,
        note: String(note || `Order status updated to ${orderStatus}.`).trim(),
        changedBy: req.admin!.username,
      });

      return nextOrder;
    });

    await recordAuditLog(req.admin!, 'UPDATE_ORDER_STATUS', 'order', id, {
      orderNumber: updated.orderNumber,
      orderStatus,
    });

    res.json({ order: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unable to update order.';
    res.status(400).json({ error: msg });
  }
});

router.put('/orders/:id/payment', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { paymentStatus, paymentReference, note } = req.body || {};
    const valid = ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'];
    if (!valid.includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }

    const [updated] = await db
      .update(orders)
      .set({
        paymentStatus,
        paymentReference:
          paymentReference !== undefined ? String(paymentReference).trim() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (updated) {
      await db.insert(orderStatusHistory).values({
        orderId: id,
        status: updated.orderStatus,
        note: String(note || `Payment status marked as ${paymentStatus}.`).trim(),
        changedBy: req.admin!.username,
      });
      await recordAuditLog(req.admin!, 'UPDATE_PAYMENT_STATUS', 'order', id, {
        orderNumber: updated.orderNumber,
        paymentStatus,
      });
    }

    res.json({ order: updated });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Unable to update payment status.' });
  }
});

// --- Customers ---

router.get('/customers', async (_req, res) => {
  try {
    const [allUsers, allOrders] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
    ]);

    const guestSummaryMap = new Map<
      string,
      { name: string; email: string; phone: string; ordersCount: number; totalSpent: number; lastOrder: Date }
    >();

    for (const o of allOrders) {
      if (!o.userId) {
        const key = o.customerPhone;
        const curr = guestSummaryMap.get(key) || {
          name: o.customerName,
          email: o.customerEmail || '',
          phone: o.customerPhone,
          ordersCount: 0,
          totalSpent: 0,
          lastOrder: o.createdAt,
        };
        curr.ordersCount += 1;
        if (!['Cancelled', 'Refunded'].includes(o.orderStatus)) {
          curr.totalSpent += o.totalAmount;
        }
        guestSummaryMap.set(key, curr);
      }
    }

    res.json({
      customers: allUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status,
        totalSpent: u.totalSpent,
        ordersCount: u.ordersCount,
        createdAt: u.createdAt,
      })),
      guestCustomers: Array.from(guestSummaryMap.values()),
    });
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).json({ error: 'Unable to load customers.' });
  }
});

router.put('/customers/:id/status', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || 'active');
    const [updated] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    await recordAuditLog(req.admin!, 'UPDATE_CUSTOMER_STATUS', 'user', id, { status });
    res.json({ customer: updated });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ error: 'Unable to update customer status.' });
  }
});

// --- Coupons ---

router.get('/coupons', async (_req, res) => {
  try {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json({ coupons: rows });
  } catch (error) {
    console.error('Admin coupons error:', error);
    res.status(500).json({ error: 'Unable to load coupons.' });
  }
});

router.post('/coupons', async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    const code = String(body.code || '').trim().toUpperCase();
    if (!code || !body.discountValue) {
      return res.status(400).json({ error: 'Coupon code and discount value are required.' });
    }
    const [created] = await db
      .insert(coupons)
      .values({
        code,
        discountType: body.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(body.discountValue),
        minOrderValue: Number(body.minOrderValue || 0),
        maxUses: Number(body.maxUses || 1),
        eligibleCategoryIds: Array.isArray(body.eligibleCategoryIds) ? body.eligibleCategoryIds : [],
        eligibleProductIds: Array.isArray(body.eligibleProductIds) ? body.eligibleProductIds : [],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive !== false,
        source: 'admin',
        assignedEmail: String(body.assignedEmail || '').trim().toLowerCase(),
      })
      .returning();

    await recordAuditLog(req.admin!, 'CREATE_COUPON', 'coupon', created.id, { code: created.code });
    res.status(201).json({ coupon: created });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(400).json({ error: 'Unable to create coupon. Ensure code is unique.' });
  }
});

router.put('/coupons/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const [updated] = await db
      .update(coupons)
      .set({
        discountType: body.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(body.discountValue),
        minOrderValue: Number(body.minOrderValue || 0),
        maxUses: Number(body.maxUses || 1),
        isActive: body.isActive !== false,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .where(eq(coupons.id, id))
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_COUPON', 'coupon', id, { isActive: updated?.isActive });
    res.json({ coupon: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Unable to update coupon.' });
  }
});

router.delete('/coupons/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(coupons).where(eq(coupons.id, id));
    await recordAuditLog(req.admin!, 'DELETE_COUPON', 'coupon', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Unable to delete coupon.' });
  }
});

// --- Social Verification Requests ---

router.get('/social-verifications', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(socialVerifications)
      .orderBy(desc(socialVerifications.createdAt));
    res.json({ verifications: rows });
  } catch (error) {
    console.error('Admin social verifications error:', error);
    res.status(500).json({ error: 'Unable to load social verification requests.' });
  }
});

router.post('/social-verifications/:id/review', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const {
      action,
      adminNote,
      discountType,
      discountValue,
      minOrderValue,
      expiryDays,
      maxUses,
      eligibleCategoryIds,
    } = req.body || {};

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject.' });
    }

    const storeSettings = await getSettingValue<{
      socialDiscountType: string;
      socialDiscountValue: number;
      socialDiscountMinOrder: number;
      socialDiscountExpiryDays: number;
      socialDiscountMaxUses: number;
    }>('store');

    const result = await db.transaction(async (tx) => {
      const [reqRow] = await tx
        .select()
        .from(socialVerifications)
        .where(eq(socialVerifications.id, id));

      if (!reqRow) throw new Error('Verification request not found.');
      if (reqRow.status === 'approved') {
        throw new Error('This request has already been approved.');
      }

      if (action === 'reject') {
        const [rejected] = await tx
          .update(socialVerifications)
          .set({
            status: 'rejected',
            adminNote: String(adminNote || 'Could not confirm follow on account.').trim(),
            reviewedBy: req.admin!.username,
            reviewedAt: new Date(),
          })
          .where(eq(socialVerifications.id, id))
          .returning();
        return { verification: rejected, coupon: null };
      }

      const dType =
        discountType === 'fixed' || discountType === 'percentage'
          ? discountType
          : storeSettings.socialDiscountType === 'fixed'
          ? 'fixed'
          : 'percentage';
      const dValue = Number(discountValue ?? storeSettings.socialDiscountValue ?? 15);
      const minOrd = Number(minOrderValue ?? storeSettings.socialDiscountMinOrder ?? 3000);
      const expDays = Number(expiryDays ?? storeSettings.socialDiscountExpiryDays ?? 30);
      const uses = Number(maxUses ?? storeSettings.socialDiscountMaxUses ?? 1);
      const expiresAt = new Date(Date.now() + expDays * 86400000);

      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const generatedCode = `PS-VIP-${randomHex}`;

      const [createdCoupon] = await tx
        .insert(coupons)
        .values({
          code: generatedCode,
          discountType: dType,
          discountValue: dValue,
          minOrderValue: minOrd,
          maxUses: uses,
          eligibleCategoryIds: Array.isArray(eligibleCategoryIds) ? eligibleCategoryIds : [],
          eligibleProductIds: [],
          expiresAt,
          isActive: true,
          source: 'social_verification',
          assignedEmail: reqRow.customerEmail || '',
        })
        .returning();

      const [approved] = await tx
        .update(socialVerifications)
        .set({
          status: 'approved',
          couponId: createdCoupon.id,
          generatedCode,
          adminNote: String(adminNote || 'Follow verified. Exclusive coupon issued.').trim(),
          reviewedBy: req.admin!.username,
          reviewedAt: new Date(),
        })
        .where(eq(socialVerifications.id, id))
        .returning();

      return { verification: approved, coupon: createdCoupon };
    });

    await recordAuditLog(req.admin!, `SOCIAL_${action.toUpperCase()}`, 'social_verification', id, {
      generatedCode: result.verification.generatedCode,
    });

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unable to review verification.';
    res.status(400).json({ error: msg });
  }
});

// --- Reviews Moderation ---

router.get('/reviews', async (_req, res) => {
  try {
    const [allReviews, allProducts] = await Promise.all([
      db.select().from(reviews).orderBy(desc(reviews.createdAt)),
      db.select({ id: products.id, name: products.name }).from(products),
    ]);
    const prodMap = new Map(allProducts.map((p) => [p.id, p.name]));
    res.json({
      reviews: allReviews.map((r) => ({ ...r, productName: prodMap.get(r.productId) || 'Product' })),
    });
  } catch (error) {
    console.error('Admin reviews error:', error);
    res.status(500).json({ error: 'Unable to load reviews.' });
  }
});

router.put('/reviews/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(reviews)
      .set({ isApproved: Boolean(req.body?.isApproved) })
      .where(eq(reviews.id, id))
      .returning();
    await recordAuditLog(req.admin!, 'MODERATE_REVIEW', 'review', id, {
      isApproved: updated?.isApproved,
    });
    res.json({ review: updated });
  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({ error: 'Unable to update review.' });
  }
});

router.delete('/reviews/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(reviews).where(eq(reviews.id, id));
    await recordAuditLog(req.admin!, 'DELETE_REVIEW', 'review', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Unable to delete review.' });
  }
});

// --- Banners ---

router.get('/banners', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(banners)
      .orderBy(asc(banners.sortOrder), asc(banners.id));
    res.json({ banners: rows });
  } catch (error) {
    console.error('Admin banners error:', error);
    res.status(500).json({ error: 'Unable to load banners.' });
  }
});

router.post('/banners', async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.imageUrl) {
      return res.status(400).json({ error: 'Banner title and image URL are required.' });
    }
    const [created] = await db
      .insert(banners)
      .values({
        title: String(body.title).trim(),
        subtitle: String(body.subtitle || '').trim(),
        kicker: String(body.kicker || '').trim(),
        ctaText: String(body.ctaText || 'Shop Collection').trim(),
        ctaLink: String(body.ctaLink || '/shop').trim(),
        imageUrl: String(body.imageUrl).trim(),
        placement: String(body.placement || 'hero'),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .returning();
    await recordAuditLog(req.admin!, 'CREATE_BANNER', 'banner', created.id);
    res.status(201).json({ banner: created });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ error: 'Unable to create banner.' });
  }
});

router.put('/banners/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const [updated] = await db
      .update(banners)
      .set({
        title: String(body.title).trim(),
        subtitle: String(body.subtitle || '').trim(),
        kicker: String(body.kicker || '').trim(),
        ctaText: String(body.ctaText || 'Shop Collection').trim(),
        ctaLink: String(body.ctaLink || '/shop').trim(),
        imageUrl: String(body.imageUrl).trim(),
        placement: String(body.placement || 'hero'),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      })
      .where(eq(banners.id, id))
      .returning();
    await recordAuditLog(req.admin!, 'UPDATE_BANNER', 'banner', id);
    res.json({ banner: updated });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ error: 'Unable to update banner.' });
  }
});

router.delete('/banners/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(banners).where(eq(banners.id, id));
    await recordAuditLog(req.admin!, 'DELETE_BANNER', 'banner', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ error: 'Unable to delete banner.' });
  }
});

// --- Financial Accounting & Expenses ---

router.get('/finance', async (req, res) => {
  try {
    const range = String(req.query.range || 'all');
    const start = req.query.start ? String(req.query.start) : undefined;
    const end = req.query.end ? String(req.query.end) : undefined;
    const { from, to } = resolveDateBounds(range, start, end);

    const [allOrders, allExpenses, allProducts] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(expenses).orderBy(desc(expenses.date), desc(expenses.createdAt)),
      db.select().from(products),
    ]);

    const filteredOrders = allOrders.filter((o) => inRange(o.createdAt, from, to));
    const filteredExpenses = allExpenses.filter((e) => inRange(e.date, from, to));

    const validOrders = filteredOrders.filter(
      (o) => !['Cancelled', 'Returned', 'Refunded'].includes(o.orderStatus)
    );
    const cancelledOrRefunded = filteredOrders.filter((o) =>
      ['Cancelled', 'Returned', 'Refunded'].includes(o.orderStatus)
    );

    const grossOrderSales = validOrders.reduce((s, o) => s + o.subtotal, 0);
    const discountsGiven = validOrders.reduce((s, o) => s + o.discountAmount, 0);
    const netSales = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const cogs = validOrders.reduce((s, o) => s + o.totalCost, 0);
    const grossProfit = netSales - cogs;

    const collectedCash = validOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const outstandingPayments = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);

    const expenseByCat: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      expenseByCat[exp.category] = (expenseByCat[exp.category] || 0) + exp.amount;
    }

    const operatingExpenses = filteredExpenses
      .filter((e) => OPERATING_EXPENSE_CATEGORIES.has(e.category))
      .reduce((s, e) => s + e.amount, 0);

    const netProfit = grossProfit - operatingExpenses;
    const ownerWithdrawals = expenseByCat.owner_withdrawal || 0;
    const capitalAdditions = expenseByCat.capital_addition || 0;
    const stockInvestments = expenseByCat.stock_investment || 0;
    const inventoryAssetValue = allProducts.reduce(
      (s, p) => s + p.stockQuantity * p.costPrice,
      0
    );

    res.json({
      ledger: {
        grossOrderSales,
        discountsGiven,
        netSales,
        cogs,
        grossProfit,
        operatingExpenses,
        netProfit,
        collectedCash,
        outstandingPayments,
        cancelledRefundedTotal: cancelledOrRefunded.reduce((s, o) => s + o.totalAmount, 0),
        ownerWithdrawals,
        capitalAdditions,
        stockInvestments,
        inventoryAssetValue,
        expenseByCategory: expenseByCat,
      },
      expenses: filteredExpenses,
      orders: filteredOrders,
    });
  } catch (error) {
    console.error('Finance load error:', error);
    res.status(500).json({ error: 'Unable to load financial ledger.' });
  }
});

router.post('/expenses', async (req: AuthRequest, res) => {
  try {
    const { date, category, amount, notes } = req.body || {};
    if (!date || !category || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Date, category, and positive amount are required.' });
    }
    const [created] = await db
      .insert(expenses)
      .values({
        date: String(date),
        category: String(category),
        amount: Math.round(Number(amount)),
        notes: String(notes || '').trim(),
        recordedBy: req.admin!.username,
        isDemo: false,
      })
      .returning();

    await recordAuditLog(req.admin!, 'ADD_EXPENSE', 'expense', created.id, {
      category: created.category,
      amount: created.amount,
    });
    res.status(201).json({ expense: created });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Unable to record expense.' });
  }
});

router.delete('/expenses/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(expenses).where(eq(expenses.id, id));
    await recordAuditLog(req.admin!, 'DELETE_EXPENSE', 'expense', id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Unable to delete expense.' });
  }
});

// --- Subscribers & Inquiries ---

router.get('/subscribers', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt));
    res.json({ subscribers: rows });
  } catch (error) {
    console.error('Admin subscribers error:', error);
    res.status(500).json({ error: 'Unable to load subscribers.' });
  }
});

router.get('/inquiries', async (_req, res) => {
  try {
    const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    res.json({ inquiries: rows });
  } catch (error) {
    console.error('Admin inquiries error:', error);
    res.status(500).json({ error: 'Unable to load inquiries.' });
  }
});

router.put('/inquiries/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status, adminReply } = req.body || {};
    const [updated] = await db
      .update(inquiries)
      .set({
        status: String(status || 'in_progress'),
        adminReply: String(adminReply || '').trim(),
      })
      .where(eq(inquiries.id, id))
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_INQUIRY', 'inquiry', id, { status });
    res.json({ inquiry: updated });
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ error: 'Unable to update inquiry.' });
  }
});

// --- Website Settings ---

router.get('/settings', async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettings);
    const settingsMap: Record<string, Record<string, unknown>> = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      settingsMap[r.key] = { ...(DEFAULT_SETTINGS[r.key] || {}), ...r.value };
    }
    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).json({ error: 'Unable to load settings.' });
  }
});

router.put('/settings/:key', async (req: AuthRequest, res) => {
  try {
    const key = String(req.params.key);
    const value = (req.body?.value || req.body || {}) as Record<string, unknown>;
    const [updated] = await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();

    await recordAuditLog(req.admin!, 'UPDATE_SETTINGS', 'site_settings', key);
    res.json({ setting: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Unable to save settings.' });
  }
});

// --- Admin Users, Security, Audit Logs, Backup ---

router.get('/users', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        email: adminUsers.email,
        role: adminUsers.role,
        mustChangePassword: adminUsers.mustChangePassword,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .orderBy(asc(adminUsers.id));
    res.json({ adminUsers: rows });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Unable to load admin users.' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { username, email, password, role } = req.body || {};
    if (!username || !email || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Username, email, and 8+ char password required.' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const [created] = await db
      .insert(adminUsers)
      .values({
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        role: ['super_admin', 'manager', 'staff'].includes(role) ? role : 'manager',
        mustChangePassword: true,
        isActive: true,
      })
      .returning();

    await recordAuditLog(req.admin!, 'CREATE_ADMIN_USER', 'admin_user', created.id, {
      username: created.username,
      role: created.role,
    });
    res.status(201).json({
      adminUser: {
        id: created.id,
        username: created.username,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
      },
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(400).json({ error: 'Unable to create admin user. Username may already exist.' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { role, isActive } = req.body || {};
    const [updated] = await db
      .update(adminUsers)
      .set({
        role: ['super_admin', 'manager', 'staff'].includes(role) ? role : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      })
      .where(eq(adminUsers.id, id))
      .returning();
    await recordAuditLog(req.admin!, 'UPDATE_ADMIN_USER', 'admin_user', id, { role, isActive });
    res.json({ adminUser: updated });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ error: 'Unable to update admin user.' });
  }
});

router.get('/audit-logs', async (_req, res) => {
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json({ logs: rows });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Unable to load audit logs.' });
  }
});

router.get('/sessions', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: adminSessions.id,
        adminId: adminSessions.adminId,
        userAgent: adminSessions.userAgent,
        ipAddress: adminSessions.ipAddress,
        expiresAt: adminSessions.expiresAt,
        createdAt: adminSessions.createdAt,
      })
      .from(adminSessions)
      .orderBy(desc(adminSessions.createdAt))
      .limit(20);
    res.json({ sessions: rows });
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Unable to load active sessions.' });
  }
});

router.get('/backup', async (req: AuthRequest, res) => {
  try {
    const [
      allCategories,
      allProducts,
      allOrders,
      allOrderItems,
      allCoupons,
      allSocials,
      allExpenses,
      allBanners,
      allSettings,
      allSubscribers,
      allInquiries,
      allReviews,
    ] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
      db.select().from(orders),
      db.select().from(orderItems),
      db.select().from(coupons),
      db.select().from(socialVerifications),
      db.select().from(expenses),
      db.select().from(banners),
      db.select().from(siteSettings),
      db.select().from(newsletterSubscribers),
      db.select().from(inquiries),
      db.select().from(reviews),
    ]);

    await recordAuditLog(req.admin!, 'EXPORT_BACKUP', 'database', 'full');

    res.json({
      exportedAt: new Date().toISOString(),
      brand: 'PRINCE STAR — LUXURY LIFESTYLE',
      data: {
        categories: allCategories,
        products: allProducts,
        orders: allOrders,
        orderItems: allOrderItems,
        coupons: allCoupons,
        socialVerifications: allSocials,
        expenses: allExpenses,
        banners: allBanners,
        siteSettings: allSettings,
        newsletterSubscribers: allSubscribers,
        inquiries: allInquiries,
        reviews: allReviews,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Unable to generate backup.' });
  }
});

router.delete('/demo-data', async (req: AuthRequest, res) => {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(orders).where(eq(orders.isDemo, true));
      await tx.delete(products).where(eq(products.isDemo, true));
      await tx.delete(expenses).where(eq(expenses.isDemo, true));
    });
    await recordAuditLog(req.admin!, 'PURGE_DEMO_DATA', 'database', 'demo');
    res.json({ message: 'All demo products, demo orders, and demo expenses have been removed.' });
  } catch (error) {
    console.error('Purge demo data error:', error);
    res.status(500).json({ error: 'Unable to remove demo data.' });
  }
});

export default router;
