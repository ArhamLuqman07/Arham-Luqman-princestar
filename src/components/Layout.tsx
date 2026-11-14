import React, { useState } from 'react';
import {
  Heart,
  Menu,
  MessageCircle,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { BrandLogo } from './BrandLogo.tsx';

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    route,
    navigate,
    theme,
    toggleTheme,
    settings,
    categories,
    cartCount,
    wishlistIds,
    customer,
    toasts,
    notify,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const general = settings?.general;
  const appearance = settings?.appearance;
  const social = settings?.social;
  const whatsappClean = (general?.whatsappNumber || '923076817272').replace(/\D/g, '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      setSubscribing(true);
      const res = await apiFetch<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      notify(res.message, 'success');
      setNewsletterEmail('');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Subscription failed', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const navLinks = [
    { label: 'Shop', path: '/shop' },
    { label: 'Collections', path: '/collections' },
    { label: 'Social Club', path: '/social-rewards' },
    { label: 'Track Order', path: '/track-order' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => route.split('?')[0] === path;

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-[#FAF9F6] text-[#111111] dark:bg-[#0A0A0B] dark:text-[#F5F3EE] transition-colors duration-200">
      {/* Slim non-sticky top announcement bar */}
      {appearance?.announcementEnabled !== false && !announcementDismissed && (
        <div className="w-full overflow-hidden bg-[#111111] text-[#F5F3EE] dark:bg-[#171614] border-b border-[#2A2721] px-3 sm:px-4 py-2 text-[11px] sm:text-xs flex items-center justify-center relative">
          <p className="min-w-0 w-full text-center tracking-wide px-6 truncate">
            {appearance?.announcementText ||
              'Complimentary Nationwide Delivery Above PKR 8,000 · Follow @prince_star_0617 to Unlock 15% Off'}
          </p>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-2 sm:right-3 p-1 text-[#A8A29E] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Single-Row Sticky Header */}
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-[#FAF9F6]/95 dark:bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#E8E3D9] dark:border-[#24221E]">
        <div className="max-w-7xl w-full mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
          {/* Brand Zone + Mobile Menu Button */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 -ml-1 rounded-md shrink-0 hover:bg-[#EFECE5] dark:hover:bg-[#181715]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-left focus-visible:outline-none cursor-pointer min-w-0"
            >
              <BrandLogo logoUrl={general?.logoUrl} showTagline hideTaglineOnMobile />
            </button>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive(link.path)
                    ? 'border-[#A67C2E] text-[#111111] dark:border-[#D4AF37] dark:text-[#F5F3EE]'
                    : 'border-transparent text-[#57534E] dark:text-[#A8A29E] hover:text-[#111111] dark:hover:text-[#F5F3EE]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search products"
              className="p-1.5 sm:p-2 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EFECE5] dark:hover:bg-[#181715] transition-colors"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 sm:p-2 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EFECE5] dark:hover:bg-[#181715] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px] text-[#D4AF37]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/account')}
              aria-label="Customer account"
              className="hidden sm:inline-flex items-center gap-1.5 p-2 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EFECE5] dark:hover:bg-[#181715] transition-colors"
            >
              <User className="w-[18px] h-[18px]" />
              {customer && (
                <span className="text-xs font-medium max-w-[80px] truncate">
                  {customer.fullName.split(' ')[0]}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              aria-label="Wishlist"
              className="hidden sm:inline-flex relative p-2 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EFECE5] dark:hover:bg-[#181715] transition-colors"
            >
              <Heart className="w-[18px] h-[18px]" />
              {wishlistIds.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#A67C2E] dark:bg-[#D4AF37] text-white dark:text-[#0A0A0B] text-[9px] font-mono font-semibold flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/cart')}
              aria-label="Shopping bag"
              className="relative inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#111111] text-[#F5F3EE] dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs font-semibold whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-mono tabular-nums">{cartCount}</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-b border-[#E8E3D9] dark:border-[#24221E] bg-white dark:bg-[#131316] px-4 py-3">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-3xl mx-auto flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#78716C] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watches, polarized glasses, leather wallets, loafers..."
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-[#111111] dark:text-[#F5F3EE] placeholder:text-[#78716C]"
              />
              <button
                type="submit"
                className="px-3 sm:px-4 py-1.5 rounded text-xs font-semibold shrink-0 bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B]"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1.5 shrink-0 text-[#78716C] hover:text-[#111111] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-[#FAF9F6] dark:bg-[#111113] h-full flex flex-col justify-between p-6 border-r border-[#E8E3D9] dark:border-[#262420] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[#E8E3D9] dark:border-[#262420]">
                <BrandLogo logoUrl={general?.logoUrl} />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-[#EFECE5] dark:hover:bg-[#1C1B18]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-5 space-y-1">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Shop All', path: '/shop' },
                  { label: 'New Arrivals', path: '/new-arrivals' },
                  { label: 'Best Sellers', path: '/best-sellers' },
                  { label: 'Featured Collections', path: '/collections' },
                  { label: 'Social Follow & 15% Off', path: '/social-rewards' },
                  { label: 'Track Order', path: '/track-order' },
                  { label: `Wishlist (${wishlistIds.length})`, path: '/wishlist' },
                  { label: 'My Account', path: '/account' },
                  { label: 'About Us', path: '/about' },
                  { label: 'Contact & Complaints', path: '/contact' },
                  { label: 'FAQs', path: '/faqs' },
                ].map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium hover:bg-[#EFECE5] dark:hover:bg-[#1B1A17] transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {categories.length > 0 && (
                <div className="pt-4 border-t border-[#E8E3D9] dark:border-[#262420]">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {categories
                      .filter((c) => !c.isSpecialCollection)
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate(`/category/${cat.slug}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-sm text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EFECE5] dark:hover:bg-[#1B1A17]"
                        >
                          {cat.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-[#E8E3D9] dark:border-[#262420] flex items-center justify-between">
              <span className="text-xs text-[#78716C]">Appearance</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#2E2C27] text-xs font-medium"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#D4AF37]" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" /> Dark Mode
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Complete Luxury Footer */}
      <footer className="bg-[#111111] text-[#E7E5E4] border-t border-[#262420] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-left focus-visible:outline-none cursor-pointer"
            >
              <BrandLogo logoUrl={general?.logoUrl} size="lg" tone="dark" showTagline />
            </button>
            <p className="text-sm text-[#A8A29E] leading-relaxed">
              Curated men’s watches, polarized eyewear, full-grain leather wallets, hand-welted
              footwear, and tailored menswear.
            </p>
            <div className="text-xs text-[#A8A29E] space-y-1 pt-1">
              <p>{general?.address || 'Karianwala, District Gujrat, Pakistan'}</p>
              <p>WhatsApp: {general?.contactPhone || '+92 307 6817272'}</p>
              <p>Email: {general?.complaintEmail || 'princestar.store@gmail.com'}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37] mb-4">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D6D3D1]">
              <li>
                <button onClick={() => navigate('/shop')} className="hover:text-[#D4AF37]">
                  Shop All
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/new-arrivals')} className="hover:text-[#D4AF37]">
                  New Arrivals
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/best-sellers')} className="hover:text-[#D4AF37]">
                  Best Sellers
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/collections')} className="hover:text-[#D4AF37]">
                  Featured Collections
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/social-rewards')}
                  className="hover:text-[#D4AF37]"
                >
                  Follow & Unlock Discount
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37] mb-4">
              Client Care
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D6D3D1]">
              <li>
                <button onClick={() => navigate('/track-order')} className="hover:text-[#D4AF37]">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-[#D4AF37]">
                  About PRINCE STAR
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')} className="hover:text-[#D4AF37]">
                  Contact & Complaints
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/faqs')} className="hover:text-[#D4AF37]">
                  FAQs
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/shipping-policy')}
                  className="hover:text-[#D4AF37]"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/refund-policy')} className="hover:text-[#D4AF37]">
                  Refund & Return Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy-policy')}
                  className="hover:text-[#D4AF37]"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/terms')} className="hover:text-[#D4AF37]">
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              Private Dispatch
            </h4>
            <p className="text-sm text-[#A8A29E]">
              Receive early access to numbered drops and seasonal offers.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 min-w-0 px-3 py-2 rounded bg-[#1C1B18] border border-[#2E2B25] text-sm text-white placeholder:text-[#78716C] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-4 py-2 rounded bg-[#D4AF37] text-[#0A0A0B] text-xs font-semibold whitespace-nowrap hover:opacity-90 disabled:opacity-50"
              >
                {subscribing ? 'Saving...' : 'Join'}
              </button>
            </form>

            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-[#A8A29E] mb-2">
                Official Channels
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-[#D6D3D1]">
                <a
                  href={social?.instagramUrl || 'https://instagram.com/prince_star_0617'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D4AF37] underline underline-offset-4"
                >
                  Instagram ({social?.instagramHandle || '@prince_star_0617'})
                </a>
                <a
                  href={social?.tiktokUrl || 'https://tiktok.com/@princestar_01'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D4AF37] underline underline-offset-4"
                >
                  TikTok ({social?.tiktokHandle || '@princestar_01'})
                </a>
                <a
                  href={social?.facebookUrl || 'https://facebook.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D4AF37] underline underline-offset-4"
                >
                  Facebook ({social?.facebookHandle || 'Prince Star'})
                </a>
                <a
                  href={social?.youtubeUrl || 'https://youtube.com/@princestar_01'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D4AF37] underline underline-offset-4"
                >
                  YouTube ({social?.youtubeHandle || '@princestar_01'})
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#22201C] px-4 sm:px-6 py-5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#78716C]">
            <p>© {new Date().getFullYear()} PRINCE STAR — LUXURY LIFESTYLE. All rights reserved.</p>
            <p>Karianwala, District Gujrat, Pakistan · Nationwide Cash on Delivery</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <a
        href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
          'Assalam-o-Alaikum PRINCE STAR, I would like assistance with an inquiry.'
        )}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp Concierge"
        className={`fixed right-4 sm:right-5 z-40 inline-flex items-center gap-2 px-3.5 sm:px-4 py-3 rounded-full bg-[#128C7E] text-white text-xs font-semibold shadow-lg hover:bg-[#075E54] transition-colors ${
          route.startsWith('/product/') ? 'bottom-16 sm:bottom-5' : 'bottom-4 sm:bottom-5'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-5 z-50 flex flex-col gap-2 sm:max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-lg text-xs font-medium shadow-lg border ${
                t.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : t.type === 'success'
                  ? 'bg-[#111111] text-[#D4AF37] border-[#D4AF37]/40'
                  : 'bg-white dark:bg-[#1C1B18] text-[#111111] dark:text-[#F5F3EE] border-[#E8E3D9] dark:border-[#2C2A25]'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
