import express from 'express';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  banners,
  categories,
  coupons,
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
  type AuthRequest,
  normalizePhone,
  optionalCustomer,
  rateLimit,
} from '../auth.ts';
import { DEFAULT_SETTINGS, ensureBootstrapData, getSettingValue } from '../seed.ts';

const router = express.Router();

function computeEffectivePrice(
  regularPrice: number,
  salePrice: number | null,
  priceAdjust = 0
): number {
  const base = salePrice && salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;
  return Math.max(0, base + priceAdjust);
}

router.get('/storefront', async (_req, res) => {
  try {
    await ensureBootstrapData();
    const [allSettings, allCategories, allBanners, allProducts, approvedReviews] = await Promise.all([
      db.select().from(siteSettings),
      db
        .select()
        .from(categories)
        .where(eq(categories.isVisible, true))
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select()
        .from(banners)
        .where(eq(banners.isActive, true))
        .orderBy(asc(banners.sortOrder), asc(banners.id)),
      db
        .select()
        .from(products)
        .where(eq(products.isAvailable, true))
        .orderBy(desc(products.createdAt)),
      db
        .select()
        .from(reviews)
        .where(eq(reviews.isApproved, true))
        .orderBy(desc(reviews.createdAt))
        .limit(12),
    ]);

    const settingsMap: Record<string, Record<string, unknown>> = { ...DEFAULT_SETTINGS };
    for (const row of allSettings) {
      settingsMap[row.key] = { ...(DEFAULT_SETTINGS[row.key] || {}), ...row.value };
    }

    // Aggregate rating per product
    const ratingMap = new Map<number, { sum: number; count: number }>();
    for (const rev of approvedReviews) {
      const curr = ratingMap.get(rev.productId) || { sum: 0, count: 0 };
      curr.sum += rev.rating;
      curr.count += 1;
      ratingMap.set(rev.productId, curr);
    }

    const catMap = new Map(allCategories.map((c) => [c.id, c]));
    const enrichedProducts = allProducts.map((p) => {
      const r = ratingMap.get(p.id);
      const cat = p.categoryId ? catMap.get(p.categoryId) : null;
      return {
        ...p,
        categoryName: cat?.name || 'Collection',
        categorySlug: cat?.slug || 'collection',
        avgRating: r ? Number((r.sum / r.count).toFixed(1)) : 5.0,
        reviewCount: r ? r.count : 0,
      };
    });

    res.json({
      settings: settingsMap,
      categories: allCategories,
      banners: allBanners,
      products: enrichedProducts,
      testimonials: approvedReviews,
    });
  } catch (error) {
    console.error('Storefront load failed:', error);
    res.status(500).json({ error: 'Unable to load storefront data.' });
  }
});

router.get('/products', async (req, res) => {
  try {
    await ensureBootstrapData();
    const q = String(req.query.q || '').trim().toLowerCase();
    const categorySlug = String(req.query.category || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'newest');
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : Number.MAX_SAFE_INTEGER;

    const [allCategories, allProducts, approvedReviews] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder)),
      db.select().from(products).where(eq(products.isAvailable, true)),
      db.select().from(reviews).where(eq(reviews.isApproved, true)),
    ]);

    const catBySlug = new Map(allCategories.map((c) => [c.slug, c]));
    const catById = new Map(allCategories.map((c) => [c.id, c]));

    const ratingMap = new Map<number, { sum: number; count: number }>();
    for (const rev of approvedReviews) {
      const curr = ratingMap.get(rev.productId) || { sum: 0, count: 0 };
      curr.sum += rev.rating;
      curr.count += 1;
      ratingMap.set(rev.productId, curr);
    }

    let filtered = allProducts.map((p) => {
      const cat = p.categoryId ? catById.get(p.categoryId) : null;
      const r = ratingMap.get(p.id);
      const effectivePrice = computeEffectivePrice(p.regularPrice, p.salePrice);
      return {
        ...p,
        effectivePrice,
        categoryName: cat?.name || 'Collection',
        categorySlug: cat?.slug || 'collection',
        avgRating: r ? Number((r.sum / r.count).toFixed(1)) : 5.0,
        reviewCount: r ? r.count : 0,
      };
    });

    if (q) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    if (categorySlug && categorySlug !== 'all') {
      if (categorySlug === 'new-arrivals') {
        filtered = filtered.filter((p) => p.isNewArrival);
      } else if (categorySlug === 'best-sellers') {
        filtered = filtered.filter((p) => p.isBestSeller);
      } else if (categorySlug === 'special-offers') {
        filtered = filtered.filter((p) => p.isSpecialOffer || (p.salePrice && p.salePrice < p.regularPrice));
      } else if (categorySlug === 'featured') {
        filtered = filtered.filter((p) => p.isFeatured);
      } else {
        const targetCat = catBySlug.get(categorySlug);
        if (targetCat) {
          filtered = filtered.filter((p) => p.categoryId === targetCat.id);
        } else {
          filtered = [];
        }
      }
    }

    filtered = filtered.filter(
      (p) => p.effectivePrice >= minPrice && p.effectivePrice <= maxPrice
    );

    if (sort === 'price-asc') {
      filtered.sort((a, b) => a.effectivePrice - b.effectivePrice);
    } else if (sort === 'price-desc') {
      filtered.sort((a, b) => b.effectivePrice - a.effectivePrice);
    } else if (sort === 'featured') {
      filtered.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ products: filtered, categories: allCategories.filter((c) => c.isVisible) });
  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).json({ error: 'Unable to fetch products.' });
  }
});

router.get('/products/:slug', async (req, res) => {
  try {
    await ensureBootstrapData();
    const slug = String(req.params.slug || '').trim();
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const [cat, prodReviews, related] = await Promise.all([
      product.categoryId
        ? db.select().from(categories).where(eq(categories.id, product.categoryId))
        : Promise.resolve([]),
      db
        .select()
        .from(reviews)
        .where(and(eq(reviews.productId, product.id), eq(reviews.isApproved, true)))
        .orderBy(desc(reviews.createdAt)),
      product.categoryId
        ? db
            .select()
            .from(products)
            .where(and(eq(products.categoryId, product.categoryId), eq(products.isAvailable, true)))
            .limit(5)
        : db.select().from(products).where(eq(products.isAvailable, true)).limit(5),
    ]);

    const avgRating =
      prodReviews.length > 0
        ? Number((prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length).toFixed(1))
        : 5.0;

    res.json({
      product: {
        ...product,
        categoryName: cat[0]?.name || 'Collection',
        categorySlug: cat[0]?.slug || 'collection',
        avgRating,
        reviewCount: prodReviews.length,
      },
      reviews: prodReviews,
      relatedProducts: related.filter((p) => p.id !== product.id).slice(0, 4),
    });
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: 'Unable to load product details.' });
  }
});

router.post('/products/:id/reviews', optionalCustomer, async (req: AuthRequest, res) => {
  try {
    await ensureBootstrapData();
    const productId = Number(req.params.id);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }
    const { customerName, rating, title, comment } = req.body || {};
    const numRating = Number(rating);
    if (!customerName || !comment || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Name, rating (1-5), and comment are required.' });
    }

    let isVerifiedPurchase = false;
    if (req.customer) {
      const userOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.userId, req.customer.id), eq(orderItems.productId, productId)));
      isVerifiedPurchase = userOrders.length > 0;
    }

    const [created] = await db
      .insert(reviews)
      .values({
        productId,
        userId: req.customer?.id || null,
        customerName: String(customerName).trim().slice(0, 80),
        rating: numRating,
        title: String(title || '').trim().slice(0, 120),
        comment: String(comment).trim().slice(0, 1000),
        isVerifiedPurchase,
        isApproved: true,
      })
      .returning();

    res.status(201).json({ review: created });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Unable to submit review.' });
  }
});

router.post('/coupons/validate', async (req, res) => {
  try {
    await ensureBootstrapData();
    const { code, items, email } = req.body || {};
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      return res.status(400).json({ error: 'Please enter a coupon code.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, cleanCode));
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ error: 'Coupon code is invalid or inactive.' });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired.' });
    }
    if (coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
    }
    if (
      coupon.assignedEmail &&
      email &&
      coupon.assignedEmail.toLowerCase() !== String(email).trim().toLowerCase()
    ) {
      return res.status(400).json({ error: 'This exclusive coupon is assigned to another email.' });
    }

    // Compute eligible subtotal from real DB products
    let totalSubtotal = 0;
    let eligibleSubtotal = 0;
    for (const item of items) {
      const [prod] = await db.select().from(products).where(eq(products.id, Number(item.productId)));
      if (!prod) continue;
      const variant = (prod.variants || []).find((v) => v.id === item.variantId);
      const unitPrice = computeEffectivePrice(
        prod.regularPrice,
        prod.salePrice,
        variant?.priceAdjust || 0
      );
      const lineTotal = unitPrice * Math.max(1, Number(item.quantity) || 1);
      totalSubtotal += lineTotal;

      const catOk =
        !coupon.eligibleCategoryIds ||
        coupon.eligibleCategoryIds.length === 0 ||
        (prod.categoryId !== null && coupon.eligibleCategoryIds.includes(prod.categoryId));
      const prodOk =
        !coupon.eligibleProductIds ||
        coupon.eligibleProductIds.length === 0 ||
        coupon.eligibleProductIds.includes(prod.id);

      if (catOk && prodOk) {
        eligibleSubtotal += lineTotal;
      }
    }

    if (totalSubtotal < coupon.minOrderValue) {
      return res.status(400).json({
        error: `Minimum order of PKR ${coupon.minOrderValue.toLocaleString()} required for this coupon.`,
      });
    }
    if (eligibleSubtotal === 0) {
      return res.status(400).json({ error: 'This coupon does not apply to the items in your bag.' });
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.round((eligibleSubtotal * coupon.discountValue) / 100)
        : Math.min(eligibleSubtotal, coupon.discountValue);

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message:
        coupon.discountType === 'percentage'
          ? `${coupon.discountValue}% discount applied (-PKR ${discountAmount.toLocaleString()})`
          : `PKR ${discountAmount.toLocaleString()} discount applied`,
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    res.status(500).json({ error: 'Unable to validate coupon.' });
  }
});

router.post(
  '/orders',
  rateLimit('checkout', 15, 60 * 1000),
  optionalCustomer,
  async (req: AuthRequest, res) => {
    try {
      await ensureBootstrapData();
      const {
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
        couponCode,
        items,
      } = req.body || {};

      if (!customerName || !customerPhone || !deliveryAddress || !city || !province) {
        return res.status(400).json({
          error: 'Full name, mobile number, delivery address, city, and province are required.',
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Your shopping bag is empty.' });
      }

      const validPaymentMethods = ['cod', 'easypaisa', 'jazzcash'];
      const method = validPaymentMethods.includes(String(paymentMethod))
        ? String(paymentMethod)
        : 'cod';

      if ((method === 'easypaisa' || method === 'jazzcash') && !String(paymentReference || '').trim()) {
        return res.status(400).json({
          error: `Please provide your ${method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} Transaction ID / Reference for payment verification.`,
        });
      }

      const storeSettings = await getSettingValue<{
        standardShippingFee: number;
        freeShippingThreshold: number;
        taxPercent: number;
      }>('store');

      const createdOrder = await db.transaction(async (tx) => {
        let subtotal = 0;
        let totalCost = 0;
        const resolvedItems: Array<{
          productId: number;
          categoryId: number | null;
          productName: string;
          sku: string;
          variantLabel: string;
          quantity: number;
          unitPrice: number;
          unitCost: number;
          lineTotal: number;
        }> = [];

        for (const rawItem of items) {
          const productId = Number(rawItem.productId);
          const qty = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));
          const [prod] = await tx.select().from(products).where(eq(products.id, productId));
          if (!prod || !prod.isAvailable) {
            throw new Error(`Product "${rawItem.productName || productId}" is currently unavailable.`);
          }
          if (prod.stockQuantity < qty) {
            throw new Error(`Insufficient stock for "${prod.name}". Only ${prod.stockQuantity} left.`);
          }

          let variantLabel = String(rawItem.variantLabel || '');
          let priceAdjust = 0;
          const variantsList = Array.isArray(prod.variants) ? [...prod.variants] : [];
          if (rawItem.variantId && variantsList.length > 0) {
            const vIdx = variantsList.findIndex((v) => v.id === rawItem.variantId);
            if (vIdx >= 0) {
              if (variantsList[vIdx].stock < qty) {
                throw new Error(
                  `Insufficient stock for ${prod.name} (${variantsList[vIdx].name}).`
                );
              }
              variantsList[vIdx] = {
                ...variantsList[vIdx],
                stock: variantsList[vIdx].stock - qty,
              };
              variantLabel = variantsList[vIdx].name;
              priceAdjust = variantsList[vIdx].priceAdjust || 0;
            }
          }

          const unitPrice = computeEffectivePrice(prod.regularPrice, prod.salePrice, priceAdjust);
          const lineTotal = unitPrice * qty;
          subtotal += lineTotal;
          totalCost += prod.costPrice * qty;

          await tx
            .update(products)
            .set({
              stockQuantity: prod.stockQuantity - qty,
              variants: variantsList,
              updatedAt: new Date(),
            })
            .where(eq(products.id, prod.id));

          resolvedItems.push({
            productId: prod.id,
            categoryId: prod.categoryId,
            productName: prod.name,
            sku: prod.sku,
            variantLabel,
            quantity: qty,
            unitPrice,
            unitCost: prod.costPrice,
            lineTotal,
          });
        }

        // Coupon validation inside transaction
        let discountAmount = 0;
        let appliedCouponCode = '';
        const cleanCoupon = String(couponCode || '').trim().toUpperCase();
        if (cleanCoupon) {
          const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, cleanCoupon));
          if (!coupon || !coupon.isActive) {
            throw new Error('Coupon code is invalid or inactive.');
          }
          if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            throw new Error('Coupon code has expired.');
          }
          if (coupon.usedCount >= coupon.maxUses) {
            throw new Error('Coupon code usage limit has been reached.');
          }
          if (
            coupon.assignedEmail &&
            customerEmail &&
            coupon.assignedEmail.toLowerCase() !== String(customerEmail).trim().toLowerCase()
          ) {
            throw new Error('This coupon code belongs to a different email address.');
          }
          if (subtotal < coupon.minOrderValue) {
            throw new Error(
              `Minimum order of PKR ${coupon.minOrderValue.toLocaleString()} required for coupon ${cleanCoupon}.`
            );
          }

          let eligibleSubtotal = 0;
          for (const ri of resolvedItems) {
            const catOk =
              !coupon.eligibleCategoryIds ||
              coupon.eligibleCategoryIds.length === 0 ||
              (ri.categoryId !== null && coupon.eligibleCategoryIds.includes(ri.categoryId));
            const prodOk =
              !coupon.eligibleProductIds ||
              coupon.eligibleProductIds.length === 0 ||
              coupon.eligibleProductIds.includes(ri.productId);
            if (catOk && prodOk) {
              eligibleSubtotal += ri.lineTotal;
            }
          }
          if (eligibleSubtotal === 0) {
            throw new Error('Coupon does not apply to the selected items.');
          }

          discountAmount =
            coupon.discountType === 'percentage'
              ? Math.round((eligibleSubtotal * coupon.discountValue) / 100)
              : Math.min(eligibleSubtotal, coupon.discountValue);
          appliedCouponCode = coupon.code;

          await tx
            .update(coupons)
            .set({ usedCount: coupon.usedCount + 1 })
            .where(eq(coupons.id, coupon.id));
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const freeThreshold = Number(storeSettings.freeShippingThreshold ?? 8000);
        const stdShipping = Number(storeSettings.standardShippingFee ?? 250);
        const shippingCost = afterDiscount >= freeThreshold ? 0 : stdShipping;
        const taxRate = Number(storeSettings.taxPercent ?? 0);
        const taxAmount = Math.round((afterDiscount * taxRate) / 100);
        const totalAmount = afterDiscount + shippingCost + taxAmount;

        const year = new Date().getFullYear();
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `PS-${year}-${randSuffix}-${String(Date.now()).slice(-3)}`;

        const paymentStatus =
          method === 'cod' ? 'pending' : 'awaiting_verification';

        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId: req.customer?.id || null,
            customerName: String(customerName).trim(),
            customerPhone: String(customerPhone).trim(),
            customerEmail: String(customerEmail || '').trim().toLowerCase(),
            deliveryAddress: String(deliveryAddress).trim(),
            city: String(city).trim(),
            province: String(province).trim(),
            postalCode: String(postalCode || '').trim(),
            orderNotes: String(orderNotes || '').trim(),
            paymentMethod: method,
            paymentStatus,
            paymentReference: String(paymentReference || '').trim(),
            orderStatus: 'Pending',
            subtotal,
            discountAmount,
            couponCode: appliedCouponCode,
            shippingCost,
            totalAmount,
            totalCost,
            isDemo: false,
          })
          .returning();

        await tx.insert(orderItems).values(
          resolvedItems.map((ri) => ({
            orderId: order.id,
            productId: ri.productId,
            productName: ri.productName,
            sku: ri.sku,
            variantLabel: ri.variantLabel,
            quantity: ri.quantity,
            unitPrice: ri.unitPrice,
            unitCost: ri.unitCost,
            lineTotal: ri.lineTotal,
          }))
        );

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: 'Pending',
          note:
            method === 'cod'
              ? 'Order placed with Cash on Delivery.'
              : `${method.toUpperCase()} payment reference (${String(paymentReference).trim()}) submitted; awaiting verification.`,
          changedBy: req.customer ? req.customer.fullName : 'Guest Customer',
        });

        if (req.customer) {
          await tx
            .update(users)
            .set({
              ordersCount: sql`${users.ordersCount} + 1`,
              totalSpent: sql`${users.totalSpent} + ${totalAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, req.customer.id));
        }

        return { order, items: resolvedItems };
      });

      res.status(201).json(createdOrder);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to place order.';
      console.error('Checkout error:', error);
      res.status(400).json({ error: msg });
    }
  }
);

router.get('/orders/track', async (req, res) => {
  try {
    await ensureBootstrapData();
    const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
    const phone = normalizePhone(String(req.query.phone || '').trim());

    if (!orderNumber || !phone) {
      return res.status(400).json({ error: 'Order number and phone number are required.' });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber));

    if (!order || normalizePhone(order.customerPhone) !== phone) {
      return res.status(404).json({
        error: 'No order matched that order number and phone number.',
      });
    }

    const [items, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id))
        .orderBy(asc(orderStatusHistory.createdAt)),
    ]);

    res.json({
      order: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        city: order.city,
        province: order.province,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        courierName: order.courierName,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        couponCode: order.couponCode,
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      items,
      history,
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    res.status(500).json({ error: 'Unable to track order.' });
  }
});

router.post(
  '/social-verifications',
  rateLimit('social-verify', 10, 60 * 1000),
  async (req, res) => {
    try {
      await ensureBootstrapData();
      const { platform, username, customerName, customerEmail, customerPhone, proofUrl, proofNote } =
        req.body || {};

      const validPlatforms = ['instagram', 'tiktok', 'facebook', 'youtube'];
      const cleanPlatform = String(platform || '').toLowerCase();
      const cleanUsername = String(username || '').trim();

      if (!validPlatforms.includes(cleanPlatform) || !cleanUsername || !customerName) {
        return res.status(400).json({
          error: 'Platform, your social username, and full name are required.',
        });
      }

      // Prevent duplicate claim on same platform + username
      const existing = await db
        .select()
        .from(socialVerifications)
        .where(
          and(
            eq(socialVerifications.platform, cleanPlatform),
            eq(socialVerifications.username, cleanUsername)
          )
        );

      if (existing.length > 0 && existing.some((e) => e.status !== 'rejected')) {
        return res.status(409).json({
          error:
            'A verification request for this social username on this platform already exists. Check your status below.',
          existing: existing[0],
        });
      }

      const [created] = await db
        .insert(socialVerifications)
        .values({
          platform: cleanPlatform,
          username: cleanUsername.slice(0, 100),
          customerName: String(customerName).trim().slice(0, 100),
          customerEmail: String(customerEmail || '').trim().toLowerCase().slice(0, 120),
          customerPhone: String(customerPhone || '').trim().slice(0, 30),
          proofUrl: String(proofUrl || '').slice(0, 1_500_000), // Supports base64 screenshot upload up to ~1MB
          proofNote: String(proofNote || '').trim().slice(0, 500),
          status: 'pending',
        })
        .returning();

      res.status(201).json({
        verification: {
          id: created.id,
          platform: created.platform,
          username: created.username,
          status: created.status,
          createdAt: created.createdAt,
        },
        message:
          'Verification request submitted! Our team reviews handles manually and issues your exclusive code once verified.',
      });
    } catch (error) {
      console.error('Social verification error:', error);
      res.status(500).json({ error: 'Unable to submit verification request.' });
    }
  }
);

router.get('/social-verifications/status', async (req, res) => {
  try {
    await ensureBootstrapData();
    const platform = String(req.query.platform || '').trim().toLowerCase();
    const username = String(req.query.username || '').trim();
    if (!platform || !username) {
      return res.status(400).json({ error: 'Platform and username are required.' });
    }

    const rows = await db
      .select()
      .from(socialVerifications)
      .where(
        and(
          eq(socialVerifications.platform, platform),
          eq(socialVerifications.username, username)
        )
      )
      .orderBy(desc(socialVerifications.createdAt));

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No verification request found for that handle.' });
    }

    const latest = rows[0];
    res.json({
      status: latest.status,
      generatedCode: latest.status === 'approved' ? latest.generatedCode : null,
      adminNote: latest.adminNote,
      reviewedAt: latest.reviewedAt,
      createdAt: latest.createdAt,
    });
  } catch (error) {
    console.error('Social verification lookup error:', error);
    res.status(500).json({ error: 'Unable to check verification status.' });
  }
});

router.post('/newsletter', async (req, res) => {
  try {
    await ensureBootstrapData();
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    await db
      .insert(newsletterSubscribers)
      .values({ email, isActive: true })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: { isActive: true },
      });
    res.json({ message: 'Welcome to PRINCE STAR Private Dispatch.' });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ error: 'Unable to subscribe.' });
  }
});

router.post('/inquiries', async (req, res) => {
  try {
    await ensureBootstrapData();
    const { type, name, email, phone, orderNumber, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
    }

    const [created] = await db
      .insert(inquiries)
      .values({
        type: type === 'complaint' ? 'complaint' : 'contact',
        name: String(name).trim().slice(0, 120),
        email: String(email).trim().toLowerCase().slice(0, 140),
        phone: String(phone || '').trim().slice(0, 30),
        orderNumber: String(orderNumber || '').trim().slice(0, 40),
        subject: String(subject).trim().slice(0, 180),
        message: String(message).trim().slice(0, 2000),
        status: 'new',
      })
      .returning();

    res.status(201).json({
      inquiryId: created.id,
      message: 'Your inquiry has been logged with PRINCE STAR Support. We will respond shortly.',
    });
  } catch (error) {
    console.error('Inquiry submit error:', error);
    res.status(500).json({ error: 'Unable to submit inquiry.' });
  }
});

// Keep price filter helpers referenced cleanly
export const _queryHelpers = { gte, lte };

export default router;
