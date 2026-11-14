import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatPKR } from '../lib/api.ts';

export function HomePage() {
  const { navigate, settings, categories, banners, products, testimonials, loadingStorefront } =
    useStore();
  const [slideIdx, setSlideIdx] = useState(0);

  const heroBanners = banners.filter((b) => b.placement === 'hero' && b.isActive);
  const appearance = settings?.appearance;
  const social = settings?.social;

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((i) => (i + 1) % heroBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  const activeBanner = heroBanners[slideIdx] || heroBanners[0];
  const primaryCategories = categories.filter((c) => !c.isSpecialCollection);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const specialOffers = products
    .filter((p) => p.isSpecialOffer || (p.salePrice !== null && p.salePrice < p.regularPrice))
    .slice(0, 3);

  const faqs = [
    {
      q: 'How long does Cash on Delivery take across Pakistan?',
      a: 'Orders placed before 4 PM PKT are dispatched the same business day from Gujrat. Delivery takes 2–3 days in Punjab & Islamabad and 3–5 days across Sindh, KPK, and Balochistan.',
    },
    {
      q: 'Can I verify Easypaisa or JazzCash payments safely?',
      a: 'Yes. Select Easypaisa or JazzCash at checkout, transfer to our official PRINCE STAR account, and enter your Transaction ID. Our finance team verifies and confirms your order immediately.',
    },
    {
      q: 'How does the Follow & Unlock 15% Discount club work?',
      a: 'Follow any of our official Instagram, TikTok, Facebook, or YouTube channels, submit your handle in our Social Club page, and once reviewed by our team, you receive a personal coupon code.',
    },
    {
      q: 'What is your exchange and return policy?',
      a: 'We offer a hassle-free 7-day size exchange or return on unworn items in original velvet packaging.',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* 1. Luxury Hero Slider */}
      {appearance?.showHero !== false && (
        <section className="relative w-full overflow-hidden bg-[#111111]">
          <div className="relative h-[430px] sm:h-[580px] lg:h-[660px] w-full">
            <SafeImage
              src={
                activeBanner?.imageUrl ||
                '/src/assets/images/hero_luxury_watches_1794663409281.jpg'
              }
              alt={activeBanner?.title || 'PRINCE STAR Luxury Collection'}
              className="w-full h-full object-cover object-center opacity-85 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />

            <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-end pb-14 sm:pb-20">
              <div className="max-w-2xl space-y-3 sm:space-y-4">
                <p className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase text-[#D4AF37]">
                  {activeBanner?.kicker || 'PRINCE STAR · LUXURY LIFESTYLE'}
                </p>
                <h1 className="font-display text-[28px] sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.12] text-balance">
                  {activeBanner?.title ||
                    appearance?.heroHeading ||
                    'Timeless Distinction for the Modern Gentleman'}
                </h1>
                <p className="text-xs sm:text-base text-[#E7E5E4] max-w-xl leading-relaxed">
                  {activeBanner?.subtitle ||
                    appearance?.heroSubheading ||
                    'Precision timepieces, polarized titanium eyewear, and handcrafted leather essentials.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 pr-20 sm:pr-0">
                  <button
                    type="button"
                    onClick={() => navigate(activeBanner?.ctaLink || '/shop')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded bg-[#D4AF37] text-[#0A0A0B] text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <span>{activeBanner?.ctaText || 'Explore Collection'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/social-rewards')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded border border-white/35 text-white text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Unlock 15% Social Reward
                  </button>
                </div>
              </div>
            </div>

            {heroBanners.length > 1 && (
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSlideIdx((i) => (i - 1 + heroBanners.length) % heroBanners.length)
                  }
                  aria-label="Previous slide"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 text-white border border-white/25 flex items-center justify-center hover:bg-black/80"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i + 1) % heroBanners.length)}
                  aria-label="Next slide"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 text-white border border-white/25 flex items-center justify-center hover:bg-black/80"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Shop by Category */}
      {appearance?.showCategories !== false && primaryCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
                Curated Departments
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold">
                Shop by Category
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-xs sm:text-sm font-medium underline underline-offset-4 hover:text-[#A67C2E] dark:hover:text-[#D4AF37] whitespace-nowrap shrink-0"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {primaryCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(`/category/${cat.slug}`)}
                className="group text-left bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] rounded-lg overflow-hidden hover:border-[#A67C2E] dark:hover:border-[#D4AF37] transition-colors"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2EFE8] dark:bg-[#1A1916]">
                  <SafeImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5 sm:p-3">
                  <p className="text-xs sm:text-sm font-semibold truncate">{cat.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. New Arrivals */}
      {appearance?.showNewArrivals !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
                Latest Drops
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold">New Arrivals</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/new-arrivals')}
              className="text-xs sm:text-sm font-medium underline underline-offset-4 hover:text-[#A67C2E] dark:hover:text-[#D4AF37] whitespace-nowrap shrink-0"
            >
              Explore All
            </button>
          </div>
          {loadingStorefront && products.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-lg bg-[#EFECE5] dark:bg-[#181715] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Best Sellers */}
      {appearance?.showBestSellers !== false && bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
                Client Favorites
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold">Best Sellers</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/best-sellers')}
              className="text-xs sm:text-sm font-medium underline underline-offset-4 hover:text-[#A67C2E] dark:hover:text-[#D4AF37] whitespace-nowrap shrink-0"
            >
              Shop Best Sellers
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Exclusive Deals & Limited-Time Offers */}
      {appearance?.showSpecialOffers !== false && specialOffers.length > 0 && (
        <section className="bg-[#111111] text-[#F5F3EE] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
                  Limited-Time Privileges
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
                  Exclusive Offers
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/category/special-offers')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#D4AF37] hover:underline"
              >
                View All Offers <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {specialOffers.map((item) => {
                const saving = item.salePrice ? item.regularPrice - item.salePrice : 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/product/${item.slug}`)}
                    className="cursor-pointer group bg-[#181715] border border-[#2C2923] rounded-lg overflow-hidden hover:border-[#D4AF37]/70 transition-colors"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#1F1E1B]">
                      <SafeImage
                        src={item.images?.[0]}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-xs uppercase tracking-wider text-[#D4AF37]">
                        Save {formatPKR(saving)}
                      </p>
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      <div className="flex items-baseline gap-2.5 pt-1">
                        <span className="font-mono text-base font-semibold text-[#D4AF37] tabular-nums">
                          {formatPKR(item.salePrice || item.regularPrice)}
                        </span>
                        {item.salePrice && (
                          <span className="font-mono text-xs text-[#78716C] line-through tabular-nums">
                            {formatPKR(item.regularPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. Featured Products */}
      {appearance?.showFeatured !== false && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
                Atelier Selection
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold">
                Featured Collection
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/collections')}
              className="text-xs sm:text-sm font-medium underline underline-offset-4 hover:text-[#A67C2E] dark:hover:text-[#D4AF37] whitespace-nowrap shrink-0"
            >
              View Collection
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Social Follow & Exclusive Discount Spotlight */}
      {appearance?.showSocialShowcase !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-xl overflow-hidden border border-[#E8E3D9] dark:border-[#262420] bg-white dark:bg-[#131316]">
            <div className="lg:col-span-6 p-5 sm:p-12 flex flex-col justify-center space-y-4 sm:space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A67C2E] dark:text-[#D4AF37]">
                PRINCE STAR SOCIAL CLUB
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold leading-tight text-balance">
                Follow. Verify. Unlock Your Exclusive Discount.
              </h2>
              <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                Join our official community on Instagram ({social?.instagramHandle || '@prince_star_0617'}),
                TikTok ({social?.tiktokHandle || '@princestar_01'}), Facebook, or YouTube. Submit
                your handle for verification and receive a personal discount code for checkout.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/social-rewards')}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded bg-[#111111] text-white dark:bg-[#D4AF37] dark:text-[#0A0A0B] text-xs sm:text-sm font-semibold hover:opacity-90"
                >
                  Claim Social Discount <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="lg:col-span-6 min-h-[210px] sm:min-h-[280px] bg-[#1A1916]">
              <SafeImage
                src="/src/assets/images/hero_eyewear_leather_1794663410087.jpg"
                alt="PRINCE STAR Social Showcase"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* 8. Brand Introduction & Why Choose PRINCE STAR */}
      {(appearance?.showBrandStory !== false || appearance?.showWhyChoose !== false) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          {appearance?.showBrandStory !== false && (
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A67C2E] dark:text-[#D4AF37]">
                Karianwala · District Gujrat · Pakistan
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-balance">
                {appearance?.brandStoryHeading || 'Crafted in Character. Delivered Across Pakistan.'}
              </h2>
              <p className="text-base text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                {appearance?.brandStoryBody ||
                  'Born in Karianwala, District Gujrat, PRINCE STAR curates heirloom-grade men’s watches, polarized eyewear, full-grain leather wallets, and bench-made footwear for discerning gentlemen nationwide.'}
              </p>
            </div>
          )}

          {appearance?.showWhyChoose !== false && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Verified Craftsmanship',
                  desc: 'Every timepiece and leather piece is inspected before dispatch with official brand warranty.',
                },
                {
                  icon: Truck,
                  title: 'Nationwide COD & Express',
                  desc: 'Complimentary delivery above PKR 8,000 across Lahore, Karachi, Islamabad, Gujrat, and all cities.',
                },
                {
                  icon: Award,
                  title: 'Signature Gift Presentation',
                  desc: 'Arrives in structured velvet presentation boxes ready for gifting or personal collection.',
                },
                {
                  icon: Sparkles,
                  title: 'Direct Concierge Support',
                  desc: 'Real WhatsApp assistance at +92 307 6817272 for sizing, styling, and live order updates.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-6 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] space-y-3"
                >
                  <item.icon className="w-6 h-6 text-[#A67C2E] dark:text-[#D4AF37]" />
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 9. Customer Testimonials */}
      {appearance?.showTestimonials !== false && testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
              Verified Client Reviews
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">
              Trusted Across Pakistan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-lg bg-white dark:bg-[#131316] border border-[#E8E3D9] dark:border-[#262420] flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#A67C2E] dark:text-[#D4AF37]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  {rev.title && <h3 className="text-base font-semibold">{rev.title}</h3>}
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    “{rev.comment}”
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#78716C] dark:text-[#A8A29E] pt-3 border-t border-[#F0ECE2] dark:border-[#22201D]">
                  <span className="font-semibold text-[#111111] dark:text-[#F5F3EE]">
                    {rev.customerName}
                  </span>
                  {rev.isVerifiedPurchase && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#A67C2E] dark:text-[#D4AF37]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Buyer
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 10. FAQs */}
      {appearance?.showFaq !== false && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A67C2E] dark:text-[#D4AF37] mb-1">
              Questions & Answers
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="divide-y divide-[#E8E3D9] dark:divide-[#262420] border-y border-[#E8E3D9] dark:border-[#262420]">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-medium">
                  <span>{faq.q}</span>
                  <span className="text-[#A67C2E] dark:text-[#D4AF37] text-lg font-mono group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
