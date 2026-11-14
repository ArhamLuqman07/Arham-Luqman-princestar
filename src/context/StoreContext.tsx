import { signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setMemoryFirebaseToken } from '../lib/api.ts';
import { auth } from '../lib/firebase.ts';
import type {
  Banner,
  CartItem,
  Category,
  CustomerUser,
  Product,
  Review,
  StorefrontSettings,
} from '../types/store.ts';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  route: string;
  navigate: (to: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loadingStorefront: boolean;
  settings: StorefrontSettings | null;
  categories: Category[];
  banners: Banner[];
  products: Product[];
  testimonials: Review[];
  refreshStorefront: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (item: CartItem) => void;
  updateCartQty: (productId: number, variantId: string | undefined, qty: number) => void;
  removeFromCart: (productId: number, variantId?: string) => void;
  clearCart: () => void;
  wishlistIds: number[];
  toggleWishlist: (productId: number) => Promise<void>;
  customer: CustomerUser | null;
  loadingCustomer: boolean;
  refreshCustomer: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  toasts: ToastItem[];
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_KEY = 'ps_cart_v1';
const WISHLIST_KEY = 'ps_wishlist_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(() => window.location.pathname + window.location.search);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const [loadingStorefront, setLoadingStorefront] = useState(true);
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const navigate = useCallback((to: string) => {
    if (to.startsWith('http://') || to.startsWith('https://')) {
      const link = document.createElement('a');
      link.href = to;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (window.location.pathname + window.location.search !== to) {
      window.history.pushState({}, '', to);
      setRoute(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('ps-theme', next);
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  const refreshStorefront = useCallback(async () => {
    try {
      setLoadingStorefront(true);
      const data = await apiFetch<{
        settings: StorefrontSettings;
        categories: Category[];
        banners: Banner[];
        products: Product[];
        testimonials: Review[];
      }>('/api/storefront');
      setSettings(data.settings);
      setCategories(data.categories);
      setBanners(data.banners);
      setProducts(data.products);
      setTestimonials(data.testimonials);
    } catch (err) {
      console.error('Storefront load failed:', err);
    } finally {
      setLoadingStorefront(false);
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    try {
      setLoadingCustomer(true);
      const res = await apiFetch<{ user: CustomerUser | null }>('/api/auth/me');
      setCustomer(res.user);
      if (res.user) {
        try {
          const wl = await apiFetch<{ items: Product[] }>('/api/customer/wishlist');
          const serverIds = wl.items.map((p) => p.id);
          setWishlistIds((prev) => Array.from(new Set([...prev, ...serverIds])));
        } catch {
          // ignore
        }
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoadingCustomer(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
    refreshCustomer();
  }, [refreshStorefront, refreshCustomer]);

  const logoutCustomer = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setMemoryFirebaseToken(null);
    setCustomer(null);
    notify('Signed out successfully.', 'info');
  }, [notify]);

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.productId === item.productId && (i.variantId || '') === (item.variantId || '')
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
          return next;
        }
        return [...prev, item];
      });
      notify(`${item.name} added to bag.`, 'success');
    },
    [notify]
  );

  const updateCartQty = useCallback(
    (productId: number, variantId: string | undefined, qty: number) => {
      setCart((prev) =>
        qty <= 0
          ? prev.filter(
              (i) => !(i.productId === productId && (i.variantId || '') === (variantId || ''))
            )
          : prev.map((i) =>
              i.productId === productId && (i.variantId || '') === (variantId || '')
                ? { ...i, quantity: qty }
                : i
            )
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: number, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (i.variantId || '') === (variantId || ''))
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      const exists = wishlistIds.includes(productId);
      setWishlistIds((prev) =>
        exists ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      if (customer) {
        try {
          await apiFetch(`/api/customer/wishlist/${productId}`, {
            method: exists ? 'DELETE' : 'POST',
          });
        } catch {
          // ignore
        }
      }
      notify(exists ? 'Removed from wishlist.' : 'Saved to wishlist.', 'info');
    },
    [customer, notify, wishlistIds]
  );

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        route,
        navigate,
        theme,
        toggleTheme,
        loadingStorefront,
        settings,
        categories,
        banners,
        products,
        testimonials,
        refreshStorefront,
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        customer,
        loadingCustomer,
        refreshCustomer,
        logoutCustomer,
        toasts,
        notify,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
