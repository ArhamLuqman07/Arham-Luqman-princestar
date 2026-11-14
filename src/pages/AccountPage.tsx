import { signInWithPopup } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Download,
  LogOut,
  MapPin,
  Package,
  Plus,
  Tag,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch, formatPKR, setMemoryFirebaseToken } from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { downloadOrderInvoicePDF } from '../lib/reports.ts';
import type { Order, SavedAddress } from '../types/store.ts';

interface CouponRow {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  expiresAt: string | null;
}

export function AccountPage() {
  const { customer, loadingCustomer, refreshCustomer, logoutCustomer, navigate, notify } =
    useStore();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetRequested, setResetRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'coupons'>(
    'orders'
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    province: 'Punjab',
    postalCode: '',
  });

  useEffect(() => {
    if (customer) {
      setEditName(customer.fullName);
      setEditPhone(customer.phone || '');
      setAddresses(customer.addresses || []);
      apiFetch<{ orders: Order[] }>('/api/customer/orders')
        .then((r) => setOrders(r.orders))
        .catch(() => {});
      apiFetch<{ coupons: CouponRow[] }>('/api/customer/coupons')
        .then((r) => setCoupons(r.coupons))
        .catch(() => {});
    }
  }, [customer]);

  const handleGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setMemoryFirebaseToken(token);
      const syncRes = await apiFetch<{ linkedOrdersCount: number }>('/api/auth/firebase-sync', {
        method: 'POST',
      });
      await refreshCustomer();
      if (syncRes.linkedOrdersCount > 0) {
        notify(`Signed in & linked ${syncRes.linkedOrdersCount} previous order(s)!`, 'success');
      } else {
        notify('Signed in with Google.', 'success');
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Google Sign-In failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (authMode === 'login') {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await refreshCustomer();
        notify('Welcome back to PRINCE STAR.', 'success');
      } else if (authMode === 'register') {
        await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ fullName, email, phone, password }),
        });
        await refreshCustomer();
        notify('Account created successfully.', 'success');
      } else if (authMode === 'forgot') {
        if (!resetRequested) {
          const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          setResetRequested(true);
          notify(res.message, 'info');
        } else {
          const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, token: resetToken, newPassword }),
          });
          notify(res.message, 'success');
          setAuthMode('login');
          setResetRequested(false);
        }
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Authentication failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName: editName, phone: editPhone, addresses }),
      });
      await refreshCustomer();
      notify('Profile updated.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedList: SavedAddress[] = [
      ...addresses,
      {
        id: `addr-${Date.now()}`,
        label: newAddr.label,
        fullName: newAddr.fullName || editName,
        phone: newAddr.phone || editPhone,
        address: newAddr.address,
        city: newAddr.city,
        province: newAddr.province,
        postalCode: newAddr.postalCode,
        isDefault: addresses.length === 0,
      },
    ];
    try {
      await apiFetch('/api/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({ addresses: updatedList }),
      });
      setAddresses(updatedList);
      setNewAddr({
        label: 'Home',
        fullName: '',
        phone: '',
        address: '',
        city: '',
        province: 'Punjab',
        postalCode: '',
      });
      await refreshCustomer();
      notify('Delivery address saved.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to save address', 'error');
    }
  };

  const handleRemoveAddress = async (id: string) => {
    const updatedList = addresses.filter((a) => a.id !== id);
    await apiFetch('/api/customer/profile', {
      method: 'PUT',
      body: JSON.stringify({ addresses: updatedList }),
    });
    setAddresses(updatedList);
    await refreshCustomer();
  };

  const handleClaimGuestOrders = async () => {
    try {
      const res = await apiFetch<{ message: string; linkedOrdersCount: number }>(
        '/api/customer/claim-guest-orders',
        { method: 'POST' }
      );
      notify(res.message, 'success');
      if (res.linkedOrdersCount > 0) {
        const refreshed = await apiFetch<{ orders: Order[] }>('/api/customer/orders');
        setOrders(refreshed.orders);
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to link orders', 'error');
    }
  };

  if (loadingCustomer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-64 rounded-lg bg-[#EFECE5] dark:bg-[#181715] animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37]">
              PRINCE STAR Client Portal
            </p>
            <h1 className="font-display text-3xl font-semibold">
              {authMode === 'login'
                ? 'Welcome Back'
                : authMode === 'register'
                ? 'Create Account'
                : 'Reset Password'}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-semibold hover:border-[#A67C2E] transition-colors"
          >
            Continue with Google
          </button>

          <div className="relative text-center text-xs text-[#78716C]">
            <span className="bg-white dark:bg-[#131316] px-2 relative z-10">or with email</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#E8E3D9] dark:bg-[#262420]" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'register' && (
              <>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (03XX-XXXXXXX)"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
                />
              </>
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />

            {authMode !== 'forgot' && (
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            )}

            {authMode === 'forgot' && resetRequested && (
              <>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="6-digit Reset Code"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
                />
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90"
            >
              {submitting
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Sign In'
                : authMode === 'register'
                ? 'Create Account'
                : resetRequested
                ? 'Set New Password'
                : 'Request Reset Code'}
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-[#78716C] pt-2">
            {authMode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="hover:underline"
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="hover:underline"
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setResetRequested(false);
                }}
                className="hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E3D9] dark:border-[#262420] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37]">
            Client Profile · {customer.status.toUpperCase()}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">{customer.fullName}</h1>
          <p className="text-xs text-[#78716C] mt-1">{customer.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {customer.uid && (
            <button
              type="button"
              onClick={handleClaimGuestOrders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold hover:border-[#A67C2E]"
            >
              <UserCheck className="w-3.5 h-3.5" /> Link Guest Orders
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/wishlist')}
            className="px-3.5 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
          >
            Wishlist
          </button>
          <button
            type="button"
            onClick={logoutCustomer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E8E3D9] dark:border-[#262420] pb-3">
        {[
          { id: 'orders' as const, label: `Order History (${orders.length})`, icon: Package },
          { id: 'addresses' as const, label: `Addresses (${addresses.length})`, icon: MapPin },
          { id: 'coupons' as const, label: `My Coupons (${coupons.length})`, icon: Tag },
          { id: 'profile' as const, label: 'Account Details', icon: UserCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                : 'bg-[#F2EFE8] dark:bg-[#181715] text-[#44403C] dark:text-[#D6D3D1]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-[#E8E3D9] dark:border-[#262420] rounded-lg space-y-3">
              <p className="text-sm text-[#78716C]">No orders found in your account yet.</p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE2] dark:border-[#22201D]">
                  <div>
                    <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-[#78716C]">
                      {new Date(order.createdAt).toLocaleDateString('en-PK')} · Status:{' '}
                      <strong>{order.orderStatus}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatPKR(order.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadOrderInvoicePDF(order)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> Invoice
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-[#57534E] dark:text-[#A8A29E]">
                  {(order.items || []).map((item) => (
                    <p key={item.id}>
                      {item.productName} × {item.quantity} — {formatPKR(item.lineTotal)}
                    </p>
                  ))}
                  {order.trackingNumber && (
                    <p className="text-[#A67C2E] dark:text-[#D4AF37] font-mono pt-1">
                      Tracking: {order.courierName} · {order.trackingNumber}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-3">
            {addresses.length === 0 ? (
              <p className="text-sm text-[#78716C]">No saved delivery addresses yet.</p>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] flex justify-between gap-4"
                >
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">
                      {addr.label} · {addr.fullName}
                    </p>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                      {addr.address}, {addr.city}, {addr.province}
                    </p>
                    <p className="text-xs font-mono text-[#78716C]">{addr.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(addr.id)}
                    className="p-2 text-[#78716C] hover:text-red-600 self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAddAddress}
            className="lg:col-span-6 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-3"
          >
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Delivery Address
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                placeholder="Label (Home/Office)"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
              <input
                type="tel"
                required
                value={newAddr.phone}
                onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                placeholder="Mobile Number"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
              />
            </div>
            <input
              type="text"
              required
              value={newAddr.address}
              onChange={(e) => setNewAddr({ ...newAddr, address: e.target.value })}
              placeholder="Street Address"
              className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                placeholder="City"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
              <input
                type="text"
                required
                value={newAddr.province}
                onChange={(e) => setNewAddr({ ...newAddr, province: e.target.value })}
                placeholder="Province"
                className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
            >
              Save Address
            </button>
          </form>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.length === 0 ? (
            <p className="text-sm text-[#78716C]">
              No active coupons right now. Visit our Social Club to earn an exclusive discount!
            </p>
          ) : (
            coupons.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-2"
              >
                <p className="font-mono text-lg font-bold text-[#A67C2E] dark:text-[#D4AF37]">
                  {c.code}
                </p>
                <p className="text-sm font-medium">
                  {c.discountType === 'percentage'
                    ? `${c.discountValue}% Off`
                    : `${formatPKR(c.discountValue)} Off`}
                </p>
                <p className="text-xs text-[#78716C]">
                  Min. order: {formatPKR(c.minOrderValue)}
                  {c.expiresAt
                    ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-PK')}`
                    : ''}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
          >
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
}
