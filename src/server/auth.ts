import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  adminSessions,
  adminUsers,
  auditLogs,
  customerSessions,
  orders,
  users,
} from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { ensureBootstrapData } from './seed.ts';

export const ADMIN_COOKIE_NAME = 'ps_admin_session';
export const CUSTOMER_COOKIE_NAME = 'ps_customer_session';

export interface AdminContext {
  id: number;
  username: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export interface CustomerContext {
  id: number;
  uid: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
}

export interface AuthRequest extends Request {
  admin?: AdminContext;
  customer?: CustomerContext;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length >= 12) {
    return '0' + digits.slice(2);
  }
  return digits;
}

// Simple in-memory rate limiter for auth & sensitive actions
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyPrefix: string, maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
    }
    bucket.count += 1;
    return next();
  };
}

function getCookieOptions(res: Response) {
  const req = (res as Response & { req?: Request }).req;
  const isHttps =
    Boolean(req?.secure) ||
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    secure: isHttps,
    path: '/',
  };
}

export function setCookie(res: Response, name: string, value: string, maxAgeMs: number) {
  res.cookie(name, value, {
    ...getCookieOptions(res),
    maxAge: maxAgeMs,
  });
}

export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, getCookieOptions(res));
}

export async function createAdminSession(adminId: number, req: Request): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12h session
  await db.insert(adminSessions).values({
    adminId,
    tokenHash,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 240),
    ipAddress: String(req.ip || '').slice(0, 64),
    expiresAt,
  });
  return rawToken;
}

export async function createCustomerSession(userId: number): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14d session
  await db.insert(customerSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });
  return rawToken;
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureBootstrapData();
    const rawToken =
      req.cookies?.[ADMIN_COOKIE_NAME] ||
      (req.headers['x-admin-token'] as string | undefined);

    if (!rawToken) {
      return res.status(401).json({ error: 'Administrator authentication required.' });
    }

    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const [sessionRow] = await db
      .select({
        session: adminSessions,
        admin: adminUsers,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
      .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, now)));

    if (!sessionRow || !sessionRow.admin.isActive) {
      return res.status(401).json({ error: 'Invalid or expired administrator session.' });
    }

    req.admin = {
      id: sessionRow.admin.id,
      username: sessionRow.admin.username,
      email: sessionRow.admin.email,
      role: sessionRow.admin.role,
      mustChangePassword: sessionRow.admin.mustChangePassword,
    };

    const allowedWhenMustChange = [
      '/api/admin/me',
      '/api/admin/change-password',
      '/api/admin/logout',
    ];
    if (
      req.admin.mustChangePassword &&
      !allowedWhenMustChange.includes(req.originalUrl.split('?')[0])
    ) {
      return res.status(403).json({
        error: 'You must change the initial administrator password before continuing.',
        mustChangePassword: true,
      });
    }

    return next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

export async function resolveCustomer(req: AuthRequest): Promise<CustomerContext | null> {
  await ensureBootstrapData();
  // 1. Check Firebase Bearer token if provided
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const email = (decoded.email || `${decoded.uid}@firebase.local`).toLowerCase();
        const fullName = decoded.name || email.split('@')[0];

        // Upsert safely by uid or email
        const [existingByUid] = await db
          .select()
          .from(users)
          .where(eq(users.uid, decoded.uid));
        if (existingByUid) {
          return {
            id: existingByUid.id,
            uid: existingByUid.uid,
            email: existingByUid.email,
            fullName: existingByUid.fullName,
            phone: existingByUid.phone,
            status: existingByUid.status,
          };
        }

        const [existingByEmail] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));
        if (existingByEmail) {
          const [updated] = await db
            .update(users)
            .set({ uid: decoded.uid, updatedAt: new Date() })
            .where(eq(users.id, existingByEmail.id))
            .returning();
          return {
            id: updated.id,
            uid: updated.uid,
            email: updated.email,
            fullName: updated.fullName,
            phone: updated.phone,
            status: updated.status,
          };
        }

        const [created] = await db
          .insert(users)
          .values({
            uid: decoded.uid,
            email,
            fullName,
            addresses: [],
          })
          .onConflictDoUpdate({
            target: users.email,
            set: { uid: decoded.uid, updatedAt: new Date() },
          })
          .returning();

        return {
          id: created.id,
          uid: created.uid,
          email: created.email,
          fullName: created.fullName,
          phone: created.phone,
          status: created.status,
        };
      } catch {
        // Fall back to cookie check if token invalid
      }
    }
  }

  // 2. Check customer HttpOnly session cookie
  const rawToken = req.cookies?.[CUSTOMER_COOKIE_NAME];
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const [row] = await db
    .select({
      session: customerSessions,
      user: users,
    })
    .from(customerSessions)
    .innerJoin(users, eq(customerSessions.userId, users.id))
    .where(and(eq(customerSessions.tokenHash, tokenHash), gt(customerSessions.expiresAt, now)));

  if (!row || row.user.status === 'blocked') return null;

  return {
    id: row.user.id,
    uid: row.user.uid,
    email: row.user.email,
    fullName: row.user.fullName,
    phone: row.user.phone,
    status: row.user.status,
  };
}

export async function optionalCustomer(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    req.customer = (await resolveCustomer(req)) || undefined;
    next();
  } catch (error) {
    console.error('Optional customer error:', error);
    next();
  }
}

export async function requireCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const customer = await resolveCustomer(req);
    if (!customer) {
      return res.status(401).json({ error: 'Please sign in to access your account.' });
    }
    req.customer = customer;
    return next();
  } catch (error) {
    console.error('Customer auth error:', error);
    return res.status(401).json({ error: 'Invalid customer session.' });
  }
}

export async function linkGuestOrdersForVerifiedEmail(userId: number, email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;

  const matchingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerEmail, normalized));

  let linked = 0;
  for (const ord of matchingOrders) {
    if (!ord.userId) {
      await db.update(orders).set({ userId }).where(eq(orders.id, ord.id));
      linked += 1;
    }
  }

  if (linked > 0) {
    const allUserOrders = await db.select().from(orders).where(eq(orders.userId, userId));
    const totalSpent = allUserOrders
      .filter((o) => !['Cancelled', 'Refunded'].includes(o.orderStatus))
      .reduce((acc, o) => acc + o.totalAmount, 0);
    await db
      .update(users)
      .set({
        ordersCount: allUserOrders.length,
        totalSpent,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  return linked;
}

export async function recordAuditLog(
  admin: AdminContext,
  action: string,
  entityType: string,
  entityId: string | number = '',
  details: Record<string, unknown> = {}
) {
  try {
    await db.insert(auditLogs).values({
      adminId: admin.id,
      adminUsername: admin.username,
      action,
      entityType,
      entityId: String(entityId),
      details,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
