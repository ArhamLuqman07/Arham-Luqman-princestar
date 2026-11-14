import React from 'react';
import { Layout } from './components/Layout.tsx';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { CartPage, WishlistPage } from './pages/CartAndWishlistPages.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { AboutPage, ContactPage, PolicyPage } from './pages/InfoPages.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { SocialRewardsPage } from './pages/SocialRewardsPage.tsx';
import { TrackOrderPage } from './pages/TrackOrderPage.tsx';

function AppRouter() {
  const { route } = useStore();
  const pathname = route.split('?')[0].replace(/\/+$/, '') || '/';

  if (pathname === '/admin') {
    return <AdminDashboardPage />;
  }

  let page: React.ReactNode = <HomePage />;

  if (pathname === '/') {
    page = <HomePage />;
  } else if (pathname === '/shop') {
    page = <ShopPage />;
  } else if (pathname === '/new-arrivals') {
    page = (
      <ShopPage
        initialCategory="new-arrivals"
        pageTitle="New Arrivals"
        pageSubtitle="Freshly unveiled timepieces, eyewear, leathercraft, and menswear."
      />
    );
  } else if (pathname === '/best-sellers') {
    page = (
      <ShopPage
        initialCategory="best-sellers"
        pageTitle="Best Sellers"
        pageSubtitle="Our most sought-after essentials across Pakistan."
      />
    );
  } else if (pathname === '/collections') {
    page = (
      <ShopPage
        initialCategory="featured"
        pageTitle="Featured Collections"
        pageSubtitle="Handpicked signatures from the PRINCE STAR atelier."
      />
    );
  } else if (pathname.startsWith('/category/')) {
    const slug = pathname.replace('/category/', '');
    page = <ShopPage initialCategory={slug} />;
  } else if (pathname.startsWith('/product/')) {
    const slug = pathname.replace('/product/', '');
    page = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/wishlist') {
    page = <WishlistPage />;
  } else if (pathname === '/cart') {
    page = <CartPage />;
  } else if (pathname === '/checkout') {
    page = <CheckoutPage />;
  } else if (pathname === '/track-order') {
    page = <TrackOrderPage />;
  } else if (pathname === '/account') {
    page = <AccountPage />;
  } else if (pathname === '/about') {
    page = <AboutPage />;
  } else if (pathname === '/contact') {
    page = <ContactPage />;
  } else if (pathname === '/social-rewards') {
    page = <SocialRewardsPage />;
  } else if (pathname === '/faqs') {
    page = (
      <PolicyPage
        kicker="Client Care"
        title="Frequently Asked Questions"
        sections={[
          {
            heading: 'Delivery Timeframes Across Pakistan',
            body: 'Orders placed before 4:00 PM PKT are dispatched the same business day from our Gujrat studio. Delivery takes 2–3 business days in Punjab & Islamabad, and 3–5 business days across Sindh, KPK, Balochistan, and AJK.',
          },
          {
            heading: 'Payment Methods & Verification',
            body: 'We accept Cash on Delivery nationwide as well as Easypaisa and JazzCash transfers. Online transfers require entering your Transaction ID at checkout and are verified by our accounts desk before dispatch.',
          },
          {
            heading: 'Social Media Exclusive Discount Club',
            body: 'Follow @prince_star_0617 on Instagram, @princestar_01 on TikTok or YouTube, or Prince Star on Facebook. Submit your username in our Social Club page to receive a personal coupon once verified.',
          },
          {
            heading: 'Warranty & Authenticity',
            body: 'All watches carry movement and plating warranties, and our leather goods are backed by a 1-year stitching guarantee.',
          },
        ]}
      />
    );
  } else if (pathname === '/shipping-policy') {
    page = (
      <PolicyPage
        kicker="Logistics & Dispatch"
        title="Shipping Policy"
        sections={[
          {
            heading: 'Nationwide Delivery',
            body: 'PRINCE STAR ships across every major city and town in Pakistan via trusted couriers including TCS, Leopards, and PostEx.',
          },
          {
            heading: 'Shipping Rates & Free Delivery Threshold',
            body: 'Orders equal to or above PKR 8,000 qualify for complimentary shipping nationwide. Orders below PKR 8,000 carry a flat PKR 250 courier fee.',
          },
          {
            heading: 'Order Tracking',
            body: 'Once dispatched, your tracking number is added to your order timeline and can be checked anytime on the Track Order page.',
          },
        ]}
      />
    );
  } else if (pathname === '/refund-policy') {
    page = (
      <PolicyPage
        kicker="Client Assurance"
        title="Refund & Return Policy"
        sections={[
          {
            heading: '7-Day Exchange & Return Window',
            body: 'Unused items in original condition with intact tags and velvet presentation boxes may be returned or exchanged for another size within 7 days of delivery.',
          },
          {
            heading: 'Damaged or Incorrect Items',
            body: 'If an item arrives damaged or differs from your order, contact WhatsApp +92 307 6817272 or email princestar.store@gmail.com within 48 hours for an immediate complimentary replacement.',
          },
          {
            heading: 'Refund Processing',
            body: 'Approved refunds for prepaid Easypaisa, JazzCash, or returned COD orders are transferred within 3–5 business days after parcel inspection.',
          },
        ]}
      />
    );
  } else if (pathname === '/privacy-policy') {
    page = (
      <PolicyPage
        kicker="Data Protection"
        title="Privacy Policy"
        sections={[
          {
            heading: 'Information We Collect',
            body: 'We collect only the contact, shipping, and order details necessary to fulfill your orders, verify social discount requests, and provide order tracking.',
          },
          {
            heading: 'Security & Confidentiality',
            body: 'Passwords are encrypted using industry-standard hashing, and customer contact details are never sold or exposed publicly.',
          },
          {
            heading: 'Contact for Data Requests',
            body: 'To update or delete your customer record, write to princestar.store@gmail.com.',
          },
        ]}
      />
    );
  } else if (pathname === '/terms') {
    page = (
      <PolicyPage
        kicker="Legal"
        title="Terms & Conditions"
        sections={[
          {
            heading: 'Pricing & Currency',
            body: 'All prices are listed in Pakistani Rupees (PKR). Promotional offers and coupons apply subject to minimum spend and expiry terms.',
          },
          {
            heading: 'Order Acceptance',
            body: 'PRINCE STAR reserves the right to verify COD phone numbers and Easypaisa/JazzCash transaction references prior to dispatch.',
          },
          {
            heading: 'Governing Jurisdiction',
            body: 'These terms are governed by the laws of the Islamic Republic of Pakistan.',
          },
        ]}
      />
    );
  }

  return <Layout>{page}</Layout>;
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
