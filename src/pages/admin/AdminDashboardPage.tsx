import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  DatabaseBackup,
  DollarSign,
  FolderTree,
  Globe,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Menu,
  Moon,
  Package,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Sun,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.tsx';
import { useStore } from '../../context/StoreContext.tsx';
import { apiFetch, formatPKR } from '../../lib/api.ts';
import { downloadBrandedReportPDF, exportToCSV } from '../../lib/reports.ts';
import type { Banner, Category, Order, Product, Review, StorefrontSettings } from '../../types/store.ts';
import {
  AdminCategoriesPanel,
  AdminInventoryPanel,
  AdminOrdersPanel,
  AdminProductsPanel,
} from './AdminCatalogAndOrders.tsx';
import {
  AdminBackupAndExportsPanel,
  AdminBannersPanel,
  AdminCouponsPanel,
  AdminCustomersPanel,
  AdminReviewsPanel,
  AdminSettingsForm,
  AdminSocialVerificationPanel,
  type CouponAdminRow,
  type SocialVerificationRow,
} from './AdminMarketingAndSettings.tsx';

interface AdminProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface AnalyticsPayload {
  summary: {
    totalRevenue: number;
    collectedCash: number;
    outstandingPayments: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    grossProfit: number;
    netProfit: number;
    cogs: number;
    operatingExpenses: number;
    inventoryValue: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnsRefunds: number;
    productsSold: number;
    averageOrderValue: number;
    totalDiscounts: number;
    pendingSocialCount: number;
    newInquiriesCount: number;
  };
  lowStockProducts: Product[];
  bestSellingProducts: Array<{
    productId: number;
    name: string;
    sku: string;
    units: number;
    revenue: number;
  }>;
  categoryPerformance: Array<{ name: string; units: number; revenue: number }>;
  paymentBreakdown: Array<{ method: string; count: number; amount: number }>;
  dailySeries: Array<{ date: string; revenue: number; orders: number; profit: number }>;
}

interface FinancePayload {
  ledger: {
    grossOrderSales: number;
    discountsGiven: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    collectedCash: number;
    outstandingPayments: number;
    cancelledRefundedTotal: number;
    ownerWithdrawals: number;
    capitalAdditions: number;
    stockInvestments: number;
    inventoryAssetValue: number;
    expenseByCategory: Record<string, number>;
  };
  expenses: Array<{
    id: number;
    date: string;
    category: string;
    amount: number;
    notes: string;
    recordedBy: string;
    isDemo: boolean;
  }>;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'coupons'
  | 'social_requests'
  | 'payments'
  | 'shipping'
  | 'reviews'
  | 'banners'
  | 'homepage'
  | 'subscribers'
  | 'finance'
  | 'analytics'
  | 'website_settings'
  | 'social_settings'
  | 'admin_users'
  | 'backup';

export function AdminDashboardPage() {
  const { theme, toggleTheme, navigate, notify, refreshStorefront } = useStore();

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // First-login forced password change
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Dashboard Data
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<
    Array<{
      id: number;
      fullName: string;
      email: string;
      phone: string;
      status: string;
      totalSpent: number;
      ordersCount: number;
      createdAt: string;
    }>
  >([]);
  const [guestCustomers, setGuestCustomers] = useState<
    Array<{
      name: string;
      email: string;
      phone: string;
      ordersCount: number;
      totalSpent: number;
    }>
  >([]);
  const [coupons, setCoupons] = useState<CouponAdminRow[]>([]);
  const [socialReqs, setSocialReqs] = useState<SocialVerificationRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [subscribers, setSubscribers] = useState<
    Array<{ id: number; email: string; createdAt: string }>
  >([]);
  const [inquiries, setInquiries] = useState<
    Array<{
      id: number;
      type: string;
      name: string;
      email: string;
      phone: string;
      orderNumber: string;
      subject: string;
      message: string;
      status: string;
      adminReply: string;
      createdAt: string;
    }>
  >([]);
  const [adminUsersList, setAdminUsersList] = useState<
    Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      isActive: boolean;
      lastLoginAt: string | null;
    }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: number;
      adminUsername: string;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: string;
    }>
  >([]);
  const [adminSettings, setAdminSettings] = useState<StorefrontSettings | null>(null);

  // Add Expense State
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expCat, setExpCat] = useState('advertising');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Create Admin User State
  const [newAdmUser, setNewAdmUser] = useState('');
  const [newAdmEmail, setNewAdmEmail] = useState('');
  const [newAdmPass, setNewAdmPass] = useState('');
  const [newAdmRole, setNewAdmRole] = useState('manager');

  const loadAllAdminData = useCallback(async () => {
    const queryStr =
      dateRange === 'custom' && customStart && customEnd
        ? `range=custom&start=${encodeURIComponent(customStart)}&end=${encodeURIComponent(customEnd)}`
        : `range=${encodeURIComponent(dateRange)}`;

    const [
      anRes,
      finRes,
      prodRes,
      catRes,
      ordRes,
      custRes,
      coupRes,
      socRes,
      revRes,
      banRes,
      subRes,
      inqRes,
      setRes,
      usrRes,
      logRes,
    ] = await Promise.all([
      apiFetch<AnalyticsPayload>(`/api/admin/analytics?${queryStr}`),
      apiFetch<FinancePayload>(`/api/admin/finance?${queryStr}`),
      apiFetch<{ products: Product[] }>('/api/admin/products'),
      apiFetch<{ categories: Category[] }>('/api/admin/categories'),
      apiFetch<{ orders: Order[] }>('/api/admin/orders'),
      apiFetch<{
        customers: typeof customers;
        guestCustomers: typeof guestCustomers;
      }>('/api/admin/customers'),
      apiFetch<{ coupons: CouponAdminRow[] }>('/api/admin/coupons'),
      apiFetch<{ verifications: SocialVerificationRow[] }>('/api/admin/social-verifications'),
      apiFetch<{ reviews: Review[] }>('/api/admin/reviews'),
      apiFetch<{ banners: Banner[] }>('/api/admin/banners'),
      apiFetch<{ subscribers: typeof subscribers }>('/api/admin/subscribers'),
      apiFetch<{ inquiries: typeof inquiries }>('/api/admin/inquiries'),
      apiFetch<{ settings: StorefrontSettings }>('/api/admin/settings'),
      apiFetch<{ adminUsers: typeof adminUsersList }>('/api/admin/users'),
      apiFetch<{ logs: typeof auditLogs }>('/api/admin/audit-logs'),
    ]);

    setAnalytics(anRes);
    setFinance(finRes);
    setProducts(prodRes.products);
    setCategories(catRes.categories);
    setOrders(ordRes.orders);
    setCustomers(custRes.customers);
    setGuestCustomers(custRes.guestCustomers);
    setCoupons(coupRes.coupons);
    setSocialReqs(socRes.verifications);
    setReviews(revRes.reviews);
    setBanners(banRes.banners);
    setSubscribers(subRes.subscribers);
    setInquiries(inqRes.inquiries);
    setAdminSettings(setRes.settings);
    setAdminUsersList(usrRes.adminUsers);
    setAuditLogs(logRes.logs);
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await apiFetch<{ admin: AdminProfile }>('/api/admin/me');
        if (!active) return;
        setAdmin(res.admin);
        setNewUsername(res.admin.username);
        setNewEmail(res.admin.email);
        if (!res.admin.mustChangePassword) {
          await loadAllAdminData();
        }
      } catch {
        if (active) setAdmin(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [loadAllAdminData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      setLoginLoading(true);
      const res = await apiFetch<{ admin: AdminProfile }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      setAdmin(res.admin);
      setNewUsername(res.admin.username);
      setNewEmail(res.admin.email);
      setLoginPass('');
      if (!res.admin.mustChangePassword) {
        await loadAllAdminData();
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setChangingPw(true);
      const res = await apiFetch<{ admin: AdminProfile }>('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: curPass,
          newPassword: newPass,
          newUsername,
          newEmail,
        }),
      });
      setAdmin(res.admin);
      setCurPass('');
      setNewPass('');
      notify('Administrator credentials updated.', 'success');
      await loadAllAdminData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to update credentials.', 'error');
    } finally {
      setChangingPw(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/admin/logout', { method: 'POST' });
    setAdmin(null);
    notify('Signed out of Admin Console.', 'info');
  };

  const handleSaveSettingKey = async (
    key: keyof StorefrontSettings,
    val: Record<string, unknown>
  ) => {
    await apiFetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value: val }),
    });
    notify('Settings saved to database.', 'success');
    await Promise.all([loadAllAdminData(), refreshStorefront()]);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;
    await apiFetch('/api/admin/expenses', {
      method: 'POST',
      body: JSON.stringify({
        date: expDate,
        category: expCat,
        amount: Number(expAmount),
        notes: expNotes,
      }),
    });
    setExpAmount('');
    setExpNotes('');
    notify('Financial entry recorded.', 'success');
    await loadAllAdminData();
  };

  const handleDeleteExpense = async (id: number) => {
    await apiFetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    notify('Entry deleted.', 'info');
    await loadAllAdminData();
  };

  const handlePurgeDemo = async () => {
    await apiFetch('/api/admin/demo-data', { method: 'DELETE' });
    notify('All demo data removed.', 'success');
    await Promise.all([loadAllAdminData(), refreshStorefront()]);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0A0A0B] flex items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. Admin Login Gate (Zero credential hints)
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0A0A0B] text-[#111111] dark:text-[#F5F3EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <BrandLogo size="lg" compact />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A67C2E] dark:text-[#D4AF37] pt-2">
              Executive Operations Portal
            </p>
            <h1 className="font-display text-3xl font-semibold">Administrator Sign In</h1>
          </div>

          {loginError && (
            <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Username</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-sm font-semibold hover:opacity-90"
            >
              {loginLoading ? 'Verifying...' : 'Sign In to Console'}
            </button>
          </form>

          <div className="flex items-center justify-between pt-2 text-xs text-[#78716C]">
            <button type="button" onClick={() => navigate('/')} className="hover:underline">
              Return to Storefront
            </button>
            <button type="button" onClick={toggleTheme} className="hover:underline">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Forced First-Login Password Change Gate
  if (admin.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0A0A0B] text-[#111111] dark:text-[#F5F3EE] flex items-center justify-center p-4">
        <form
          onSubmit={handleForcedPasswordChange}
          className="max-w-md w-full bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-8 space-y-5"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
              Mandatory Security Action
            </p>
            <h1 className="font-display text-3xl font-semibold">Update Initial Credentials</h1>
            <p className="text-xs text-[#78716C]">
              For security, you must change the bootstrap password before accessing the dashboard.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium mb-1">Username</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Current Password</label>
              <input
                type="password"
                required
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={changingPw}
              className="px-5 py-2.5 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
            >
              {changingPw ? 'Updating...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 21 Sidebar Items matching specification
  const sidebarItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: analytics?.summary.pendingOrders },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: analytics?.lowStockProducts.length },
    { id: 'coupons', label: 'Discount Coupons', icon: Tag },
    { id: 'social_requests', label: 'Social Verification', icon: UserCheck, badge: analytics?.summary.pendingSocialCount },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'banners', label: 'Website Banners', icon: Image },
    { id: 'homepage', label: 'Homepage Editor', icon: LayoutTemplate },
    { id: 'subscribers', label: 'Newsletter & Inquiries', icon: Mail, badge: analytics?.summary.newInquiriesCount },
    { id: 'finance', label: 'Financial Reports', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'website_settings', label: 'Website Settings', icon: Globe },
    { id: 'social_settings', label: 'Social Media Settings', icon: Share2 },
    { id: 'admin_users', label: 'Admin Users & Security', icon: Shield },
    { id: 'backup', label: 'Backup & Data Export', icon: DatabaseBackup },
  ];

  const maxDailyRev = Math.max(1, ...(analytics?.dailySeries || []).map((d) => d.revenue));
  const maxCatRev = Math.max(1, ...(analytics?.categoryPerformance || []).map((c) => c.revenue));

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-[#0A0A0B] text-[#111111] dark:text-[#F5F3EE]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-[#111113] border-r border-[#E8E3D9] dark:border-[#24221E] sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-[#E8E3D9] dark:border-[#24221E] flex items-center justify-between">
          <BrandLogo />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 text-xs">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md font-medium transition-colors text-left ${
                activeTab === item.id
                  ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                  : 'text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#F2EFE8] dark:hover:bg-[#1B1A17]'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="font-mono text-[11px] font-bold opacity-80">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#E8E3D9] dark:border-[#24221E]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" /> Logout ({admin.username})
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white dark:bg-[#111113] h-full flex flex-col border-r border-[#E8E3D9] dark:border-[#24221E] overflow-y-auto">
            <div className="h-14 px-4 border-b border-[#E8E3D9] dark:border-[#24221E] flex items-center justify-between">
              <BrandLogo />
              <button type="button" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 text-xs">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md font-medium ${
                    activeTab === item.id
                      ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                      : 'text-[#44403C] dark:text-[#D6D3D1]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-[#E8E3D9] dark:border-[#24221E]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#FAF9F6]/95 dark:bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#E8E3D9] dark:border-[#24221E] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-xs sm:text-sm font-semibold truncate">
              PRINCE STAR Admin · {sidebarItems.find((i) => i.id === activeTab)?.label}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-medium whitespace-nowrap"
            >
              View Storefront
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25]"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Date Filter Bar for Overview, Analytics, Finance */}
          {['overview', 'analytics', 'finance'].includes(activeTab) && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '30d', label: 'Last 30 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'prev_month', label: 'Prev Month' },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateRange(opt.id)}
                    className={`px-3 py-1.5 rounded font-medium ${
                      dateRange === opt.id
                        ? 'bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]'
                        : 'bg-[#F2EFE8] dark:bg-[#1C1B18]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW & ANALYTICS */}
          {(activeTab === 'overview' || activeTab === 'analytics') && analytics && (
            <div className="space-y-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Net Sales', val: formatPKR(analytics.summary.totalRevenue) },
                  { label: 'Collected Cash', val: formatPKR(analytics.summary.collectedCash) },
                  { label: 'Gross Profit', val: formatPKR(analytics.summary.grossProfit) },
                  { label: 'Net Profit', val: formatPKR(analytics.summary.netProfit) },
                  { label: 'Total Orders', val: String(analytics.summary.totalOrders) },
                  { label: 'Pending Orders', val: String(analytics.summary.pendingOrders) },
                  { label: 'Delivered Orders', val: String(analytics.summary.deliveredOrders) },
                  { label: 'Avg Order Value', val: formatPKR(analytics.summary.averageOrderValue) },
                  { label: 'Products Sold', val: String(analytics.summary.productsSold) },
                  { label: 'Cancelled / Returns', val: `${analytics.summary.cancelledOrders} / ${analytics.summary.returnsRefunds}` },
                  { label: 'Total Discounts', val: formatPKR(analytics.summary.totalDiscounts) },
                  { label: 'Inventory Asset Value', val: formatPKR(analytics.summary.inventoryValue) },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="p-4 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-1"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-[#78716C]">{kpi.label}</p>
                    <p className="font-mono text-lg sm:text-xl font-semibold tabular-nums">
                      {kpi.val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Daily Revenue & Profit Bar Chart */}
                <div className="lg:col-span-7 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-4">
                  <h3 className="font-display text-xl font-semibold">Daily Revenue & Gross Profit</h3>
                  {analytics.dailySeries.length === 0 ? (
                    <p className="text-xs text-[#78716C] py-12 text-center">
                      No order revenue recorded in this selected date window.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-48 flex items-end gap-2 pt-4 border-b border-[#E8E3D9] dark:border-[#262420]">
                        {analytics.dailySeries.map((d) => {
                          const hPct = Math.max(6, Math.round((d.revenue / maxDailyRev) * 100));
                          return (
                            <div
                              key={d.date}
                              className="flex-1 flex flex-col items-center justify-end gap-1 h-full group"
                              title={`${d.date}: Revenue ${formatPKR(d.revenue)}, Gross Profit ${formatPKR(d.profit)}`}
                            >
                              <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {formatPKR(d.revenue)}
                              </span>
                              <div
                                style={{ height: `${hPct}%` }}
                                className="w-full max-w-[36px] rounded-t bg-[#A67C2E] dark:bg-[#D4AF37] transition-all"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-[#78716C]">
                        <span>{analytics.dailySeries[0]?.date}</span>
                        <span>{analytics.dailySeries[analytics.dailySeries.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Category & Payment Breakdown */}
                <div className="lg:col-span-5 bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-5">
                  <div className="space-y-3">
                    <h3 className="font-display text-xl font-semibold">Category Performance</h3>
                    {analytics.categoryPerformance.length === 0 ? (
                      <p className="text-xs text-[#78716C]">No category sales in range.</p>
                    ) : (
                      analytics.categoryPerformance.map((c) => (
                        <div key={c.name} className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{c.name}</span>
                            <span className="font-mono tabular-nums">{formatPKR(c.revenue)}</span>
                          </div>
                          <div className="h-2 rounded bg-[#EFECE5] dark:bg-[#22201D] overflow-hidden">
                            <div
                              style={{ width: `${Math.round((c.revenue / maxCatRev) * 100)}%` }}
                              className="h-full bg-[#111111] dark:bg-[#D4AF37]"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#E8E3D9] dark:border-[#262420] space-y-2 text-xs">
                    <h4 className="font-semibold uppercase tracking-wider text-[#78716C]">
                      Payment Breakdown
                    </h4>
                    {analytics.paymentBreakdown.map((pb) => (
                      <div key={pb.method} className="flex justify-between">
                        <span className="uppercase font-medium">
                          {pb.method} ({pb.count})
                        </span>
                        <span className="font-mono tabular-nums">{formatPKR(pb.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Best Sellers & Low Stock */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-3">
                  <h3 className="font-display text-xl font-semibold">Best-Selling Products</h3>
                  {analytics.bestSellingProducts.length === 0 ? (
                    <p className="text-xs text-[#78716C]">No sales recorded in period.</p>
                  ) : (
                    <div className="divide-y divide-[#F0ECE2] dark:divide-[#22201D] text-xs">
                      {analytics.bestSellingProducts.map((bp) => (
                        <div key={bp.productId} className="py-2.5 flex justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{bp.name}</p>
                            <p className="text-[#78716C] font-mono">
                              {bp.sku} · {bp.units} units sold
                            </p>
                          </div>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatPKR(bp.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Low-Stock Alerts
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="text-xs underline"
                    >
                      Manage Stock
                    </button>
                  </div>
                  {analytics.lowStockProducts.length === 0 ? (
                    <p className="text-xs text-[#78716C] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All inventory levels
                      healthy.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#F0ECE2] dark:divide-[#22201D] text-xs">
                      {analytics.lowStockProducts.map((lp) => (
                        <div key={lp.id} className="py-2.5 flex justify-between">
                          <span>
                            {lp.name} (<span className="font-mono">{lp.sku}</span>)
                          </span>
                          <span className="font-mono font-semibold text-amber-600">
                            {lp.stockQuantity} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS, CATEGORIES, INVENTORY, ORDERS, PAYMENTS */}
          {activeTab === 'products' && (
            <AdminProductsPanel
              products={products}
              categories={categories}
              onRefresh={async () => {
                await Promise.all([loadAllAdminData(), refreshStorefront()]);
              }}
              notify={notify}
            />
          )}
          {activeTab === 'categories' && (
            <AdminCategoriesPanel
              categories={categories}
              onRefresh={async () => {
                await Promise.all([loadAllAdminData(), refreshStorefront()]);
              }}
              notify={notify}
            />
          )}
          {activeTab === 'inventory' && (
            <AdminInventoryPanel
              products={products}
              onRefresh={async () => {
                await Promise.all([loadAllAdminData(), refreshStorefront()]);
              }}
              notify={notify}
            />
          )}
          {activeTab === 'orders' && (
            <AdminOrdersPanel orders={orders} onRefresh={loadAllAdminData} notify={notify} />
          )}
          {activeTab === 'payments' && (
            <AdminOrdersPanel
              orders={orders}
              paymentOnly
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}

          {/* CUSTOMERS, COUPONS, SOCIAL REQUESTS, REVIEWS, BANNERS */}
          {activeTab === 'customers' && (
            <AdminCustomersPanel
              customers={customers}
              guestCustomers={guestCustomers}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}
          {activeTab === 'coupons' && (
            <AdminCouponsPanel coupons={coupons} onRefresh={loadAllAdminData} notify={notify} />
          )}
          {activeTab === 'social_requests' && (
            <AdminSocialVerificationPanel
              verifications={socialReqs}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}
          {activeTab === 'reviews' && (
            <AdminReviewsPanel
              reviews={reviews}
              onRefresh={async () => {
                await Promise.all([loadAllAdminData(), refreshStorefront()]);
              }}
              notify={notify}
            />
          )}
          {activeTab === 'banners' && (
            <AdminBannersPanel
              banners={banners}
              onRefresh={async () => {
                await Promise.all([loadAllAdminData(), refreshStorefront()]);
              }}
              notify={notify}
            />
          )}

          {/* SETTINGS SECTIONS */}
          {activeTab === 'homepage' && adminSettings && (
            <AdminSettingsForm
              settings={adminSettings}
              section="homepage"
              onSaveKey={handleSaveSettingKey}
            />
          )}
          {activeTab === 'shipping' && adminSettings && (
            <AdminSettingsForm
              settings={adminSettings}
              section="shipping"
              onSaveKey={handleSaveSettingKey}
            />
          )}
          {activeTab === 'website_settings' && adminSettings && (
            <AdminSettingsForm
              settings={adminSettings}
              section="website"
              onSaveKey={handleSaveSettingKey}
            />
          )}
          {activeTab === 'social_settings' && adminSettings && (
            <AdminSettingsForm
              settings={adminSettings}
              section="social"
              onSaveKey={handleSaveSettingKey}
            />
          )}

          {/* NEWSLETTER SUBSCRIBERS & INQUIRIES */}
          {activeTab === 'subscribers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">
                  Inquiries & Complaints ({inquiries.length})
                </h2>
              </div>
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-4 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-2 text-xs"
                  >
                    <div className="flex justify-between gap-4">
                      <p className="font-semibold text-sm">
                        [{inq.type.toUpperCase()}] {inq.subject}
                      </p>
                      <select
                        value={inq.status}
                        onChange={async (e) => {
                          await apiFetch(`/api/admin/inquiries/${inq.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: e.target.value, adminReply: inq.adminReply }),
                          });
                          notify('Inquiry status updated.', 'success');
                          await loadAllAdminData();
                        }}
                        className="px-2 py-1 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <p className="text-[#78716C]">
                      {inq.name} · {inq.email} {inq.phone ? `· ${inq.phone}` : ''}{' '}
                      {inq.orderNumber ? `· Order ${inq.orderNumber}` : ''}
                    </p>
                    <p className="text-sm text-[#44403C] dark:text-[#D6D3D1]">{inq.message}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl font-semibold">
                    Newsletter Subscribers ({subscribers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      exportToCSV(
                        'PRINCE-STAR-Subscribers.csv',
                        ['Email', 'Subscribed Date'],
                        subscribers.map((s) => [s.email, s.createdAt])
                      )
                    }
                    className="px-3 py-1.5 rounded border border-[#E8E3D9] dark:border-[#2C2A25] text-xs font-semibold"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg divide-y divide-[#F0ECE2] dark:divide-[#22201D] text-xs">
                  {subscribers.map((s) => (
                    <div key={s.id} className="p-3 flex justify-between">
                      <span>{s.email}</span>
                      <span className="font-mono text-[#78716C]">
                        {new Date(s.createdAt).toLocaleDateString('en-PK')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL MANAGEMENT & ACCOUNTING */}
          {activeTab === 'finance' && finance && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Financial Accounting & Profit/Loss Ledger
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Gross Profit = Net Sales − COGS · Net Profit = Gross Profit − Operating Expenses
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadBrandedReportPDF({
                      title: 'Financial Profit & Loss Statement',
                      dateRangeLabel: `Filter: ${dateRange}`,
                      totals: [
                        { label: 'Net Sales', value: formatPKR(finance.ledger.netSales) },
                        { label: 'COGS', value: formatPKR(finance.ledger.cogs) },
                        { label: 'Gross Profit', value: formatPKR(finance.ledger.grossProfit) },
                        { label: 'Net Profit', value: formatPKR(finance.ledger.netProfit) },
                      ],
                      columns: ['Date', 'Category', 'Notes', 'Amount'],
                      rows: finance.expenses.map((e) => [
                        e.date,
                        e.category,
                        e.notes,
                        formatPKR(e.amount),
                      ]),
                      filename: `PRINCE-STAR-Finance-${dateRange}.pdf`,
                    })
                  }
                  className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold"
                >
                  Download P&L PDF
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Net Sales (Active)', val: formatPKR(finance.ledger.netSales) },
                  { label: 'Cost of Goods Sold', val: formatPKR(finance.ledger.cogs) },
                  { label: 'Gross Profit', val: formatPKR(finance.ledger.grossProfit) },
                  { label: 'Operating Expenses', val: formatPKR(finance.ledger.operatingExpenses) },
                  { label: 'Net Profit', val: formatPKR(finance.ledger.netProfit) },
                  { label: 'Actual Collected Cash', val: formatPKR(finance.ledger.collectedCash) },
                  { label: 'Outstanding Receivables', val: formatPKR(finance.ledger.outstandingPayments) },
                  { label: 'Inventory Asset Value', val: formatPKR(finance.ledger.inventoryAssetValue) },
                  { label: 'Owner Withdrawals', val: formatPKR(finance.ledger.ownerWithdrawals) },
                  { label: 'Capital Additions', val: formatPKR(finance.ledger.capitalAdditions) },
                  { label: 'Stock Investments', val: formatPKR(finance.ledger.stockInvestments) },
                  { label: 'Cancelled / Refunded', val: formatPKR(finance.ledger.cancelledRefundedTotal) },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="p-4 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420]"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-[#78716C]">{m.label}</p>
                    <p className="font-mono text-lg font-semibold tabular-nums mt-1">{m.val}</p>
                  </div>
                ))}
              </div>

              {/* Manual Expense / Capital Entry */}
              <form
                onSubmit={handleAddExpense}
                className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
              >
                <div>
                  <label className="block font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <select
                    value={expCat}
                    onChange={(e) => setExpCat(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  >
                    <option value="advertising">Advertising Expense</option>
                    <option value="packaging">Packaging Cost</option>
                    <option value="delivery">Delivery Expense</option>
                    <option value="payment_fees">Payment Processing Fees</option>
                    <option value="returns_refunds">Returns & Refunds</option>
                    <option value="stock_investment">Stock Investment</option>
                    <option value="owner_withdrawal">Owner Withdrawal</option>
                    <option value="capital_addition">Capital Addition</option>
                    <option value="other">Other Operating Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="Details..."
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
                >
                  Record Entry
                </button>
              </form>

              <div className="overflow-x-auto bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E8E3D9] dark:border-[#262420] text-[#78716C] uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
                    {finance.expenses.map((ex) => (
                      <tr key={ex.id}>
                        <td className="p-3 font-mono">{ex.date}</td>
                        <td className="p-3 capitalize font-medium">
                          {ex.category.replace(/_/g, ' ')}
                        </td>
                        <td className="p-3">{ex.notes || '—'}</td>
                        <td className="p-3">{ex.recordedBy}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold">
                          {formatPKR(ex.amount)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(ex.id)}
                            className="p-1 text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADMIN USERS, CREDENTIALS & AUDIT LOGS */}
          {activeTab === 'admin_users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Change My Credentials */}
                <form
                  onSubmit={handleForcedPasswordChange}
                  className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-3 text-xs"
                >
                  <h3 className="font-display text-xl font-semibold">Update My Credentials</h3>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <input
                    type="password"
                    required
                    value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    placeholder="Current Password"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New Password (8+ chars)"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
                  >
                    Save Credentials
                  </button>
                </form>

                {/* Create Staff Admin */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/admin/users', {
                      method: 'POST',
                      body: JSON.stringify({
                        username: newAdmUser,
                        email: newAdmEmail,
                        password: newAdmPass,
                        role: newAdmRole,
                      }),
                    });
                    setNewAdmUser('');
                    setNewAdmEmail('');
                    setNewAdmPass('');
                    notify('Admin user added.', 'success');
                    await loadAllAdminData();
                  }}
                  className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-6 space-y-3 text-xs"
                >
                  <h3 className="font-display text-xl font-semibold">Add Admin User</h3>
                  <input
                    type="text"
                    required
                    value={newAdmUser}
                    onChange={(e) => setNewAdmUser(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <input
                    type="email"
                    required
                    value={newAdmEmail}
                    onChange={(e) => setNewAdmEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newAdmPass}
                      onChange={(e) => setNewAdmPass(e.target.value)}
                      placeholder="Temp Password"
                      className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                    />
                    <select
                      value={newAdmRole}
                      onChange={(e) => setNewAdmRole(e.target.value)}
                      className="px-3 py-2 rounded border border-[#E8E3D9] dark:border-[#2C2A25] bg-[#FAF9F6] dark:bg-[#0A0A0B]"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] font-semibold"
                  >
                    Create Admin User
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg p-5 space-y-3 text-xs">
                <h3 className="font-display text-xl font-semibold">Admin Team & Audit Activity</h3>
                <div className="divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
                  {adminUsersList.map((au) => (
                    <div key={au.id} className="py-2 flex justify-between">
                      <span>
                        <strong>{au.username}</strong> ({au.email}) · {au.role}
                      </span>
                      <span className="text-[#78716C]">
                        {au.lastLoginAt
                          ? `Last login ${new Date(au.lastLoginAt).toLocaleString('en-PK')}`
                          : 'Never logged in'}
                      </span>
                    </div>
                  ))}
                </div>

                <h4 className="font-semibold uppercase text-[#78716C] pt-4">Recent Audit Logs</h4>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#F0ECE2] dark:divide-[#22201D]">
                  {auditLogs.map((l) => (
                    <div key={l.id} className="py-2 flex justify-between gap-4">
                      <span>
                        <strong>{l.adminUsername}</strong> · {l.action} ({l.entityType} #{l.entityId})
                      </span>
                      <span className="font-mono text-[#78716C]">
                        {new Date(l.createdAt).toLocaleString('en-PK')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BACKUP & EXPORTS */}
          {activeTab === 'backup' && finance && (
            <AdminBackupAndExportsPanel
              orders={orders}
              products={products}
              customers={customers}
              expenses={finance.expenses}
              onPurgeDemo={handlePurgeDemo}
              notify={notify}
            />
          )}
        </main>
      </div>
    </div>
  );
}
