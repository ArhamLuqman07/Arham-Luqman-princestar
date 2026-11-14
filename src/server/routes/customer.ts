import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  coupons,
  customerSessions,
  orderItems,
  orders,
  orderStatusHistory,
  products,
  users,
  wishlistItems,
} from '../../db/schema.ts';
import {
  type AuthRequest,
  CUSTOMER_COOKIE_NAME,
  clearCookie,
  createCustomerSession,
  hashToken,
  linkGuestOrdersForVerifiedEmail,
  optionalCustomer,
  rateLimit,
  requireCustomer,
  setCookie,
} from '../auth.ts';
import { ensureBootstrapData } from '../seed.ts';

const router = express.Router();

router.post('/auth/register', rateLimit('register', 10, 60 * 1000), async (req, res) => {
  try {
    await ensureBootstrapData();
    const { fullName, email, phone, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!fullName || !cleanEmail || !password || String(password).length < 6) {
      return res.status(400).json({
        error: 'Full name, valid email, and a password of at least 6 characters are required.',
      });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    let userRow;
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          fullName: String(fullName).trim(),
          phone: String(phone || existing.phone || '').trim(),
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      userRow = updated;
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: cleanEmail,
          fullName: String(fullName).trim(),
          phone: String(phone || '').trim(),
          passwordHash,
          addresses: [],
        })
        .returning();
      userRow = created;
    }

    const sessionToken = await createCustomerSession(userRow.id);
    setCookie(res, CUSTOMER_COOKIE_NAME, sessionToken, 1000 * 60 * 60 * 24 * 14);

    res.status(201).json({
      user: {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.fullName,
        phone: userRow.phone,
        addresses: userRow.addresses,
        status: userRow.status,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/auth/login', rateLimit('login', 15, 60 * 1000), async (req, res) => {
  try {
    await ensureBootstrapData();
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionToken = await createCustomerSession(user.id);
    setCookie(res, CUSTOMER_COOKIE_NAME, sessionToken, 1000 * 60 * 60 * 24 * 14);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        addresses: user.addresses,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sign in failed.' });
  }
});

// Sync Google Firebase Auth login & optionally claim guest orders for verified email
router.post('/auth/firebase-sync', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const linkedOrdersCount = await linkGuestOrdersForVerifiedEmail(customer.id, customer.email);
    const [freshUser] = await db.select().from(users).where(eq(users.id, customer.id));
    res.json({
      user: {
        id: freshUser.id,
        email: freshUser.email,
        fullName: freshUser.fullName,
        phone: freshUser.phone,
        addresses: freshUser.addresses,
        status: freshUser.status,
      },
      linkedOrdersCount,
    });
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ error: 'Unable to sync account.' });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const rawToken = req.cookies?.[CUSTOMER_COOKIE_NAME];
    if (rawToken) {
      await db.delete(customerSessions).where(eq(customerSessions.tokenHash, hashToken(rawToken)));
    }
    clearCookie(res, CUSTOMER_COOKIE_NAME);
    res.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

router.get('/auth/me', optionalCustomer, async (req: AuthRequest, res) => {
  try {
    if (!req.customer) {
      return res.json({ user: null });
    }
    const [freshUser] = await db.select().from(users).where(eq(users.id, req.customer.id));
    if (!freshUser) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: freshUser.id,
        uid: freshUser.uid,
        email: freshUser.email,
        fullName: freshUser.fullName,
        phone: freshUser.phone,
        addresses: freshUser.addresses,
        status: freshUser.status,
        totalSpent: freshUser.totalSpent,
        ordersCount: freshUser.ordersCount,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Unable to fetch profile.' });
  }
});

router.post('/auth/forgot-password', rateLimit('forgot-pw', 5, 60 * 1000), async (req, res) => {
  try {
    await ensureBootstrapData();
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!user) {
      return res.json({
        message: 'If an account matches this email, a reset token has been generated.',
      });
    }
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetTokenHash = hashToken(resetCode);
    await db
      .update(users)
      .set({
        resetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15),
      })
      .where(eq(users.id, user.id));

    // NOTE: In production without SMTP configured, do NOT expose reset code publicly;
    // when SMTP is not active we return a status indicating email dispatch/support flow.
    res.json({
      message:
        'Password reset request recorded. Please check your registered email or contact PRINCE STAR WhatsApp support (+92 307 6817272) for verification.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to process reset request.' });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    await ensureBootstrapData();
    const { email, token, newPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !token || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Valid email, reset code, and 6+ character password required.' });
    }
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (
      !user ||
      !user.resetTokenHash ||
      user.resetTokenHash !== hashToken(String(token).trim()) ||
      !user.resetTokenExpiresAt ||
      new Date(user.resetTokenExpiresAt) < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await db
      .update(users)
      .set({
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Password updated. You may now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset password.' });
  }
});

router.put('/customer/profile', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const { fullName, phone, addresses } = req.body || {};
    const [updated] = await db
      .update(users)
      .set({
        fullName: fullName ? String(fullName).trim() : customer.fullName,
        phone: phone !== undefined ? String(phone).trim() : customer.phone,
        addresses: Array.isArray(addresses) ? addresses : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, customer.id))
      .returning();

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        addresses: updated.addresses,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

router.post('/customer/claim-guest-orders', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    // Only allow auto-linking for verified Google UID accounts or matching email + phone confirmation
    const linked = await linkGuestOrdersForVerifiedEmail(customer.id, customer.email);
    res.json({
      linkedOrdersCount: linked,
      message:
        linked > 0
          ? `${linked} previous guest order(s) linked to your account.`
          : 'No unlinked guest orders found for your email.',
    });
  } catch (error) {
    console.error('Claim guest orders error:', error);
    res.status(500).json({ error: 'Unable to link previous orders.' });
  }
});

router.get('/customer/orders', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, customer.id))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = userOrders.map((o) => o.id);
    const [items, history] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      db.select().from(orderStatusHistory).where(inArray(orderStatusHistory.orderId, orderIds)),
    ]);

    const itemsByOrder = new Map<number, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const historyByOrder = new Map<number, typeof history>();
    for (const h of history) {
      const list = historyByOrder.get(h.orderId) || [];
      list.push(h);
      historyByOrder.set(h.orderId, list);
    }

    res.json({
      orders: userOrders.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) || [],
        history: historyByOrder.get(o.id) || [],
      })),
    });
  } catch (error) {
    console.error('Customer orders error:', error);
    res.status(500).json({ error: 'Unable to load order history.' });
  }
});

router.get('/customer/coupons', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const allCoupons = await db
      .select()
      .from(coupons)
      .where(eq(coupons.isActive, true))
      .orderBy(desc(coupons.createdAt));

    const available = allCoupons.filter(
      (c) =>
        (!c.assignedEmail || c.assignedEmail.toLowerCase() === customer.email.toLowerCase()) &&
        c.usedCount < c.maxUses &&
        (!c.expiresAt || new Date(c.expiresAt) > new Date())
    );

    res.json({ coupons: available });
  } catch (error) {
    console.error('Customer coupons error:', error);
    res.status(500).json({ error: 'Unable to load coupons.' });
  }
});

router.get('/customer/wishlist', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const rows = await db
      .select({
        wishlist: wishlistItems,
        product: products,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, customer.id));

    res.json({ items: rows.map((r) => r.product) });
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({ error: 'Unable to load wishlist.' });
  }
});

router.post('/customer/wishlist/:productId', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const productId = Number(req.params.productId);
    const existing = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, customer.id), eq(wishlistItems.productId, productId)));
    if (existing.length === 0) {
      await db.insert(wishlistItems).values({ userId: customer.id, productId });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Wishlist add error:', error);
    res.status(500).json({ error: 'Unable to update wishlist.' });
  }
});

router.delete('/customer/wishlist/:productId', requireCustomer, async (req: AuthRequest, res) => {
  try {
    const customer = req.customer!;
    const productId = Number(req.params.productId);
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, customer.id), eq(wishlistItems.productId, productId)));
    res.json({ ok: true });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    res.status(500).json({ error: 'Unable to remove wishlist item.' });
  }
});

export default router;
