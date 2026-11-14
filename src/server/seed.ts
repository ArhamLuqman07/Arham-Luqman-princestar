import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  adminUsers,
  banners,
  categories,
  coupons,
  expenses,
  orderItems,
  orders,
  orderStatusHistory,
  products,
  reviews,
  siteSettings,
  socialVerifications,
} from '../db/schema.ts';

let bootstrapPromise: Promise<void> | null = null;
let bootstrapped = false;

export const DEFAULT_SETTINGS: Record<string, Record<string, unknown>> = {
  general: {
    brandName: 'PRINCE STAR',
    tagline: 'LUXURY LIFESTYLE',
    contactPhone: '+92 307 6817272',
    whatsappNumber: '923076817272',
    complaintEmail: 'princestar.store@gmail.com',
    address: 'Karianwala, District Gujrat, Pakistan',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    logoUrl: '/assets/aistudio/WhatsApp_Image_2026-08-16_at_00.12.46_423540cc.jpeg',
    googleMapsUrl: 'https://www.google.com/maps?q=Karianwala,Gujrat,Pakistan&output=embed',
  },
  appearance: {
    announcementText:
      'Complimentary Nationwide Delivery Above PKR 8,000 · Follow @prince_star_0617 to Unlock 15% Off',
    announcementEnabled: true,
    showHero: true,
    showCategories: true,
    showNewArrivals: true,
    showBestSellers: true,
    showFeatured: true,
    showSpecialOffers: true,
    showBrandStory: true,
    showTestimonials: true,
    showWhyChoose: true,
    showSocialShowcase: true,
    showFaq: true,
    heroHeading: 'Timeless Distinction for the Modern Gentleman',
    heroSubheading:
      'Precision timepieces, artisan full-grain leather, and tailored essentials dispatched nationwide from Karianwala, Gujrat.',
    brandStoryHeading: 'Crafted in Character. Delivered Across Pakistan.',
    brandStoryBody:
      'Born in Karianwala, District Gujrat, PRINCE STAR curates heirloom-grade men’s accessories and tailoring with an obsession for proportion, weight, and tactile permanence.',
    accentColor: '#C59B38',
  },
  store: {
    standardShippingFee: 250,
    freeShippingThreshold: 8000,
    taxPercent: 0,
    codEnabled: true,
    easypaisaEnabled: true,
    easypaisaTitle: 'PRINCE STAR Official',
    easypaisaAccount: '0307-6817272',
    jazzcashEnabled: true,
    jazzcashTitle: 'PRINCE STAR Official',
    jazzcashAccount: '0307-6817272',
    socialDiscountType: 'percentage',
    socialDiscountValue: 15,
    socialDiscountMinOrder: 3000,
    socialDiscountExpiryDays: 30,
    socialDiscountMaxUses: 1,
  },
  social: {
    instagramHandle: '@prince_star_0617',
    instagramUrl: 'https://instagram.com/prince_star_0617',
    tiktokHandle: '@princestar_01',
    tiktokUrl: 'https://tiktok.com/@princestar_01',
    facebookHandle: 'Prince Star',
    facebookUrl: 'https://www.facebook.com/search/top?q=Prince%20Star',
    youtubeHandle: '@princestar_01',
    youtubeUrl: 'https://youtube.com/@princestar_01',
  },
};

async function runBootstrap(): Promise<void> {
  try {
    // 1. Ensure initial admin account exists
    const [{ value: adminCount }] = await db.select({ value: count() }).from(adminUsers);
    if (Number(adminCount) === 0) {
      const initialPasswordHash = await bcrypt.hash('Owner123', 10);
      await db
        .insert(adminUsers)
        .values({
          username: 'my admin',
          email: 'princestar.store@gmail.com',
          passwordHash: initialPasswordHash,
          role: 'super_admin',
          mustChangePassword: true,
          isActive: true,
        })
        .onConflictDoNothing();
    }

    // 2. Ensure default settings exist (and backfill official logoUrl if blank)
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db
        .insert(siteSettings)
        .values({ key, value })
        .onConflictDoNothing({ target: siteSettings.key });
    }
    const [existingGeneral] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'general'));
    if (existingGeneral && !existingGeneral.value?.logoUrl) {
      await db
        .update(siteSettings)
        .set({
          value: {
            ...existingGeneral.value,
            logoUrl: DEFAULT_SETTINGS.general.logoUrl,
          },
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, 'general'));
    }

    // 3. Seed default categories if empty
    const [{ value: catCount }] = await db.select({ value: count() }).from(categories);
    if (Number(catCount) === 0) {
      const seededCategories = await db
        .insert(categories)
        .values([
          {
            name: "Men's Watches",
            slug: 'mens-watches',
            description: 'Automatic skeleton and precision quartz chronographs.',
            imageUrl: '/src/assets/images/product_watch_chronograph_1794663410870.jpg',
            sortOrder: 1,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: 'Premium Glasses',
            slug: 'premium-glasses',
            description: 'Polarized titanium aviators and architectural optical frames.',
            imageUrl: '/src/assets/images/product_glasses_aviator_1794663411759.jpg',
            sortOrder: 2,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: "Men's Wallets",
            slug: 'mens-wallets',
            description: 'Full-grain Italian calfskin and RFID-shielded bifolds.',
            imageUrl: '/src/assets/images/product_wallet_leather_1794663412724.jpg',
            sortOrder: 3,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: 'Shoes',
            slug: 'shoes',
            description: 'Hand-welted patina leather loafers and dress boots.',
            imageUrl: '/src/assets/images/product_shoes_loafer_1794663413173.jpg',
            sortOrder: 4,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: "Men's Clothing",
            slug: 'mens-clothing',
            description: 'Tailored merino jackets, band-collar coats, and luxury essentials.',
            imageUrl: '/src/assets/images/product_clothing_jacket_1794663413323.jpg',
            sortOrder: 5,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: 'Fashion Accessories',
            slug: 'fashion-accessories',
            description: 'Onyx cufflinks, brushed brass belts, and curated gift sets.',
            imageUrl: '/src/assets/images/product_accessory_cufflinks_1794663414081.jpg',
            sortOrder: 6,
            isVisible: true,
            isSpecialCollection: false,
          },
          {
            name: 'New Arrivals',
            slug: 'new-arrivals',
            description: 'Latest seasonal releases from the PRINCE STAR atelier.',
            imageUrl: '/src/assets/images/product_watch_skeleton_1794663410958.jpg',
            sortOrder: 7,
            isVisible: true,
            isSpecialCollection: true,
          },
          {
            name: 'Best Sellers',
            slug: 'best-sellers',
            description: 'Most coveted pieces selected by Pakistani gentlemen.',
            imageUrl: '/src/assets/images/product_watch_chronograph_1794663410870.jpg',
            sortOrder: 8,
            isVisible: true,
            isSpecialCollection: true,
          },
          {
            name: 'Special Offers',
            slug: 'special-offers',
            description: 'Limited-edition privileges and seasonal markdowns.',
            imageUrl: '/src/assets/images/hero_eyewear_leather_1794663410087.jpg',
            sortOrder: 9,
            isVisible: true,
            isSpecialCollection: true,
          },
        ])
        .returning();

      const catBySlug = Object.fromEntries(seededCategories.map((c) => [c.slug, c.id]));

      // 4. Seed realistic demo products if empty
      const [{ value: prodCount }] = await db.select({ value: count() }).from(products);
      if (Number(prodCount) === 0) {
        const seededProducts = await db
          .insert(products)
          .values([
            {
              name: 'Sovereign Obsidian Chronograph',
              slug: 'sovereign-obsidian-chronograph',
              sku: 'PS-WCH-101',
              description:
                'A bold 42mm stainless steel chronograph finished in brushed PVD matte black and 18k champagne gold bezel. Engineered with sapphire-coated mineral glass, luminous hands, and 5ATM water resistance.',
              categoryId: catBySlug['mens-watches'],
              subcategory: 'Chronograph Watches',
              regularPrice: 18500,
              salePrice: 14900,
              costPrice: 8200,
              discountPercent: 19,
              images: [
                '/src/assets/images/product_watch_chronograph_1794663410870.jpg',
                '/src/assets/images/hero_luxury_watches_1794663409281.jpg',
              ],
              colors: ['Obsidian / Gold', 'All Black'],
              sizes: ['42mm'],
              variants: [
                {
                  id: 'v-101-og',
                  name: 'Obsidian / Gold · 42mm',
                  color: 'Obsidian / Gold',
                  size: '42mm',
                  skuSuffix: 'OG',
                  stock: 18,
                  priceAdjust: 0,
                },
                {
                  id: 'v-101-ab',
                  name: 'Stealth Black · 42mm',
                  color: 'All Black',
                  size: '42mm',
                  skuSuffix: 'AB',
                  stock: 9,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 27,
              lowStockThreshold: 5,
              isAvailable: true,
              isFeatured: true,
              isBestSeller: true,
              isNewArrival: true,
              isSpecialOffer: true,
              specifications: [
                { label: 'Case Diameter', value: '42 mm' },
                { label: 'Movement', value: 'Japanese Precision Quartz Chronograph' },
                { label: 'Strap Material', value: '316L Solid Stainless Steel' },
                { label: 'Water Resistance', value: '5 ATM (50 Meters)' },
              ],
              warrantyInfo: '1-Year PRINCE STAR Movement & Plating Warranty',
              shippingInfo: 'Free Cash on Delivery across Pakistan in 2–4 business days.',
              seoTitle: 'Sovereign Obsidian Chronograph | PRINCE STAR Watches',
              seoDescription: 'Shop the Sovereign Obsidian Chronograph men watch in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Aurelia Automatic Skeleton Watch',
              slug: 'aurelia-automatic-skeleton-watch',
              sku: 'PS-WCH-102',
              description:
                'Exposed mechanical architecture housed in a fluted gold-plated steel bezel and paired with a hand-stitched espresso alligator-grain calfskin strap. Self-winding movement with 40-hour power reserve.',
              categoryId: catBySlug['mens-watches'],
              subcategory: 'Automatic Watches',
              regularPrice: 24500,
              salePrice: 19800,
              costPrice: 11200,
              discountPercent: 19,
              images: [
                '/src/assets/images/product_watch_skeleton_1794663410958.jpg',
                '/src/assets/images/hero_luxury_watches_1794663409281.jpg',
              ],
              colors: ['Gold / Espresso Leather', 'Silver / Black Leather'],
              sizes: ['41mm'],
              variants: [
                {
                  id: 'v-102-ge',
                  name: 'Gold / Espresso · 41mm',
                  color: 'Gold / Espresso Leather',
                  size: '41mm',
                  skuSuffix: 'GE',
                  stock: 12,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 12,
              lowStockThreshold: 4,
              isAvailable: true,
              isFeatured: true,
              isBestSeller: false,
              isNewArrival: true,
              isSpecialOffer: false,
              specifications: [
                { label: 'Case Size', value: '41 mm Fluted Bezel' },
                { label: 'Movement', value: 'Automatic Self-Winding Mechanical' },
                { label: 'Strap', value: 'Hand-Stitched Genuine Leather' },
                { label: 'Glass', value: 'Anti-Reflective Sapphire Crystal' },
              ],
              warrantyInfo: '2-Year Official Mechanical Warranty',
              shippingInfo: 'Complimentary insured courier delivery nationwide.',
              seoTitle: 'Aurelia Automatic Skeleton Watch | PRINCE STAR',
              seoDescription: 'Luxury automatic skeleton watch for men in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Titanium Heritage Aviator Sunglasses',
              slug: 'titanium-heritage-aviator-sunglasses',
              sku: 'PS-GLS-201',
              description:
                'Featherweight Japanese titanium wireframes finished in brushed 18k gold with HD polarized UV400 smoke gradient lenses. Engineered for glare-free driving and timeless outdoor elegance.',
              categoryId: catBySlug['premium-glasses'],
              subcategory: 'Polarized Sunglasses',
              regularPrice: 7800,
              salePrice: 5950,
              costPrice: 2600,
              discountPercent: 24,
              images: [
                '/src/assets/images/product_glasses_aviator_1794663411759.jpg',
                '/src/assets/images/hero_eyewear_leather_1794663410087.jpg',
              ],
              colors: ['Brushed Gold / Smoke', 'Gunmetal / Obsidian'],
              sizes: ['58mm Standard'],
              variants: [
                {
                  id: 'v-201-gs',
                  name: 'Brushed Gold / Smoke',
                  color: 'Brushed Gold / Smoke',
                  size: '58mm Standard',
                  skuSuffix: 'GS',
                  stock: 34,
                  priceAdjust: 0,
                },
                {
                  id: 'v-201-go',
                  name: 'Gunmetal / Obsidian',
                  color: 'Gunmetal / Obsidian',
                  size: '58mm Standard',
                  skuSuffix: 'GO',
                  stock: 16,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 50,
              lowStockThreshold: 8,
              isAvailable: true,
              isFeatured: true,
              isBestSeller: true,
              isNewArrival: false,
              isSpecialOffer: true,
              specifications: [
                { label: 'Frame Material', value: 'Hypoallergenic Beta-Titanium' },
                { label: 'Lens Tech', value: 'UV400 Polarized Anti-Glare' },
                { label: 'Bridge / Temple', value: '14mm / 145mm' },
                { label: 'Included', value: 'Signature Leather Hard Case & Microfiber' },
              ],
              warrantyInfo: '6-Month Frame & Hinge Warranty',
              shippingInfo: 'Dispatched same day before 4 PM PKT.',
              seoTitle: 'Titanium Heritage Aviator Sunglasses | PRINCE STAR',
              seoDescription: 'Polarized titanium aviator sunglasses in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Milano Pebble Full-Grain Bifold Wallet',
              slug: 'milano-pebble-full-grain-bifold-wallet',
              sku: 'PS-WLT-301',
              description:
                'Cut from supple vegetable-tanned full-grain pebble calfskin with hand-painted edges and embedded RFID blocking weave. Holds 8 cards, full Pakistani currency notes, and discreet receipt pockets.',
              categoryId: catBySlug['mens-wallets'],
              subcategory: 'Leather Bifolds',
              regularPrice: 5500,
              salePrice: 4200,
              costPrice: 1750,
              discountPercent: 24,
              images: [
                '/src/assets/images/product_wallet_leather_1794663412724.jpg',
                '/src/assets/images/hero_eyewear_leather_1794663410087.jpg',
              ],
              colors: ['Obsidian Black', 'Dark Espresso'],
              sizes: ['Slim Standard'],
              variants: [
                {
                  id: 'v-301-ob',
                  name: 'Obsidian Black',
                  color: 'Obsidian Black',
                  size: 'Slim Standard',
                  skuSuffix: 'OB',
                  stock: 42,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 42,
              lowStockThreshold: 10,
              isAvailable: true,
              isFeatured: false,
              isBestSeller: true,
              isNewArrival: true,
              isSpecialOffer: false,
              specifications: [
                { label: 'Leather Grade', value: '100% Full-Grain Pebble Calfskin' },
                { label: 'Security', value: 'Integrated RFID Blocking Layer' },
                { label: 'Capacity', value: '8 Card Slots + Dual Note Compartments' },
                { label: 'Packaging', value: 'PRINCE STAR Velvet Presentation Box' },
              ],
              warrantyInfo: '1-Year Leather & Stitching Guarantee',
              shippingInfo: 'Ships nationwide in signature gift packaging.',
              seoTitle: 'Milano Pebble Full-Grain Leather Wallet | PRINCE STAR',
              seoDescription: 'Genuine full-grain leather men wallet in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Gujrat Heritage Hand-Welted Penny Loafer',
              slug: 'gujrat-heritage-hand-welted-penny-loafer',
              sku: 'PS-SHO-401',
              description:
                'Bench-crafted hand-burnished cognac and espresso calfskin penny loafers built on a breathable leather lining and stacked Goodyear-welted outsole for effortless boardroom-to-evening elegance.',
              categoryId: catBySlug['shoes'],
              subcategory: 'Formal Loafers',
              regularPrice: 16500,
              salePrice: 13800,
              costPrice: 7400,
              discountPercent: 16,
              images: [
                '/src/assets/images/product_shoes_loafer_1794663413173.jpg',
                '/src/assets/images/hero_menswear_footwear_1794663410443.jpg',
              ],
              colors: ['Burnished Cognac', 'Deep Espresso'],
              sizes: ['40', '41', '42', '43', '44'],
              variants: [
                {
                  id: 'v-401-41',
                  name: 'Burnished Cognac · EU 41',
                  color: 'Burnished Cognac',
                  size: '41',
                  skuSuffix: 'C41',
                  stock: 8,
                  priceAdjust: 0,
                },
                {
                  id: 'v-401-42',
                  name: 'Burnished Cognac · EU 42',
                  color: 'Burnished Cognac',
                  size: '42',
                  skuSuffix: 'C42',
                  stock: 11,
                  priceAdjust: 0,
                },
                {
                  id: 'v-401-43',
                  name: 'Burnished Cognac · EU 43',
                  color: 'Burnished Cognac',
                  size: '43',
                  skuSuffix: 'C43',
                  stock: 4,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 23,
              lowStockThreshold: 5,
              isAvailable: true,
              isFeatured: true,
              isBestSeller: true,
              isNewArrival: false,
              isSpecialOffer: true,
              specifications: [
                { label: 'Upper', value: 'Hand-Patina Full-Grain Cowhide' },
                { label: 'Construction', value: 'Blake & Welted Leather Sole' },
                { label: 'Insole', value: 'Cushioned Vegetable-Tanned Footbed' },
                { label: 'Fit Note', value: 'True to European Dress Shoe Sizing' },
              ],
              warrantyInfo: '1-Year Sole & Craftsmanship Guarantee',
              shippingInfo: 'Complimentary size exchange within 7 days.',
              seoTitle: 'Hand-Welted Leather Penny Loafer | PRINCE STAR Shoes',
              seoDescription: 'Handcrafted leather loafers for men in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Nawab Merino Mandarin-Collar Jacket',
              slug: 'nawab-merino-mandarin-collar-jacket',
              sku: 'PS-CLT-501',
              description:
                'An architectural fusion of classic Pakistani band-collar tailoring and modern European minimalism. Cut from breathable Super-120s merino wool blend with horn-finish concealed buttons and Bemberg silk lining.',
              categoryId: catBySlug['mens-clothing'],
              subcategory: 'Tailored Outerwear',
              regularPrice: 21000,
              salePrice: 17500,
              costPrice: 9600,
              discountPercent: 17,
              images: [
                '/src/assets/images/product_clothing_jacket_1794663413323.jpg',
                '/src/assets/images/hero_menswear_footwear_1794663410443.jpg',
              ],
              colors: ['Charcoal Obsidian', 'Midnight Navy'],
              sizes: ['S', 'M', 'L', 'XL'],
              variants: [
                {
                  id: 'v-501-m',
                  name: 'Charcoal Obsidian · M',
                  color: 'Charcoal Obsidian',
                  size: 'M',
                  skuSuffix: 'CM',
                  stock: 10,
                  priceAdjust: 0,
                },
                {
                  id: 'v-501-l',
                  name: 'Charcoal Obsidian · L',
                  color: 'Charcoal Obsidian',
                  size: 'L',
                  skuSuffix: 'CL',
                  stock: 14,
                  priceAdjust: 0,
                },
                {
                  id: 'v-501-xl',
                  name: 'Charcoal Obsidian · XL',
                  color: 'Charcoal Obsidian',
                  size: 'XL',
                  skuSuffix: 'CXL',
                  stock: 6,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 30,
              lowStockThreshold: 6,
              isAvailable: true,
              isFeatured: true,
              isBestSeller: false,
              isNewArrival: true,
              isSpecialOffer: false,
              specifications: [
                { label: 'Fabric', value: '85% Fine Merino Wool, 15% Silk Blend' },
                { label: 'Collar', value: 'Structured Band / Mandarin Collar' },
                { label: 'Lining', value: 'Breathable Satin Bemberg' },
                { label: 'Care', value: 'Dry Clean Only' },
              ],
              warrantyInfo: 'Complimentary Tailoring Adjustment Support',
              shippingInfo: 'Delivered on structured garment hanger & dust bag.',
              seoTitle: 'Nawab Merino Mandarin Jacket | PRINCE STAR Menswear',
              seoDescription: 'Luxury men mandarin collar wool jacket in Pakistan.',
              isDemo: true,
            },
            {
              name: 'Onyx & Brass Executive Belt & Cufflink Set',
              slug: 'onyx-brass-executive-belt-cufflink-set',
              sku: 'PS-ACC-601',
              description:
                'Curated executive pairing combining solid brushed brass buckle full-grain belt with matching 18k gold-plated genuine black onyx cufflinks. Presented in a signature keepsake gift box.',
              categoryId: catBySlug['fashion-accessories'],
              subcategory: 'Gift Sets',
              regularPrice: 9200,
              salePrice: 7400,
              costPrice: 3400,
              discountPercent: 20,
              images: [
                '/src/assets/images/product_accessory_cufflinks_1794663414081.jpg',
              ],
              colors: ['Black Leather / Brushed Gold'],
              sizes: ['32-34', '36-38', '40-42'],
              variants: [
                {
                  id: 'v-601-32',
                  name: 'Waist 32-34 · Gift Set',
                  color: 'Black Leather / Brushed Gold',
                  size: '32-34',
                  skuSuffix: '32',
                  stock: 15,
                  priceAdjust: 0,
                },
                {
                  id: 'v-601-36',
                  name: 'Waist 36-38 · Gift Set',
                  color: 'Black Leather / Brushed Gold',
                  size: '36-38',
                  skuSuffix: '36',
                  stock: 3,
                  priceAdjust: 0,
                },
              ],
              stockQuantity: 18,
              lowStockThreshold: 5,
              isAvailable: true,
              isFeatured: false,
              isBestSeller: true,
              isNewArrival: true,
              isSpecialOffer: true,
              specifications: [
                { label: 'Belt Strap', value: '35mm Full-Grain Italian Leather' },
                { label: 'Hardware', value: 'Solid Brushed Brass & 18K Gold-Plated Steel' },
                { label: 'Inlay', value: 'Natural Polished Black Onyx' },
              ],
              warrantyInfo: '1-Year Hardware & Finish Warranty',
              shippingInfo: 'Gift-ready luxury box included.',
              seoTitle: 'Onyx & Brass Executive Gift Set | PRINCE STAR',
              seoDescription: 'Luxury men belt and cufflinks gift set in Pakistan.',
              isDemo: true,
            },
          ])
          .returning();

        // 5. Seed banners
        await db.insert(banners).values([
          {
            kicker: 'PRINCE STAR · HOROLOGY 2026',
            title: 'Precision Meets Obsidian Gold',
            subtitle:
              'Explore limited-run mechanical skeletons and Swiss-inspired chronographs built for enduring presence.',
            ctaText: 'Explore Timepieces',
            ctaLink: '/category/mens-watches',
            imageUrl: '/src/assets/images/hero_luxury_watches_1794663409281.jpg',
            placement: 'hero',
            sortOrder: 1,
            isActive: true,
          },
          {
            kicker: 'EYEWEAR & FULL-GRAIN LEATHER',
            title: 'Crafted Essentials for Every Journey',
            subtitle:
              'Beta-titanium polarized aviators and vegetable-tanned Italian calfskin wallets.',
            ctaText: 'Shop Accessories',
            ctaLink: '/category/premium-glasses',
            imageUrl: '/src/assets/images/hero_eyewear_leather_1794663410087.jpg',
            placement: 'hero',
            sortOrder: 2,
            isActive: true,
          },
          {
            kicker: 'TAILORING & BENCH-MADE FOOTWEAR',
            title: 'Architectural Menswear & Patina Shoes',
            subtitle:
              'Merino mandarin coats and hand-welted leather loafers dispatched from Karianwala, Gujrat.',
            ctaText: 'View New Arrivals',
            ctaLink: '/new-arrivals',
            imageUrl: '/src/assets/images/hero_menswear_footwear_1794663410443.jpg',
            placement: 'hero',
            sortOrder: 3,
            isActive: true,
          },
        ]);

        // 6. Seed verified reviews
        if (seededProducts.length > 0) {
          await db.insert(reviews).values([
            {
              productId: seededProducts[0].id,
              customerName: 'Hamza Tariq · Lahore',
              rating: 5,
              title: 'Heirloom weight and flawless gold finish',
              comment:
                'Delivered to DHA Lahore in 48 hours. The brushed gold bezel looks extraordinary in person and the packaging rivals international watch houses.',
              isVerifiedPurchase: true,
              isApproved: true,
            },
            {
              productId: seededProducts[2].id,
              customerName: 'Usman Gondal · Islamabad',
              rating: 5,
              title: 'Zero glare on motorway drives',
              comment:
                'Lightest titanium frames I have owned. Polarized clarity is genuine and the hard leather case is a refined touch.',
              isVerifiedPurchase: true,
              isApproved: true,
            },
            {
              productId: seededProducts[4].id,
              customerName: 'Bilal Chaudhry · Gujrat',
              rating: 5,
              title: 'Superb craftsmanship from our own region',
              comment:
                'Visited their Karianwala dispatch studio and ordered the cognac loafers. Comfortable from day one and the patina is rich.',
              isVerifiedPurchase: true,
              isApproved: true,
            },
          ]);
        }

        // 7. Seed sample demo coupon
        await db
          .insert(coupons)
          .values({
            code: 'PRINCESTAR10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 4000,
            maxUses: 100,
            usedCount: 2,
            isActive: true,
            source: 'admin',
          })
          .onConflictDoNothing();

        // 8. Seed sample demo orders & financial expenses so admin dashboard has realistic demo records
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date(Date.now() - 86400000);
        const twoDaysAgoDate = new Date(Date.now() - 2 * 86400000);

        const [order1] = await db
          .insert(orders)
          .values({
            orderNumber: 'PS-2026-1001',
            customerName: 'Hamza Tariq (Demo)',
            customerPhone: '03001234567',
            customerEmail: 'hamza.demo@example.com',
            deliveryAddress: 'House 44, Street 6, DHA Phase 5',
            city: 'Lahore',
            province: 'Punjab',
            postalCode: '54000',
            paymentMethod: 'cod',
            paymentStatus: 'paid',
            orderStatus: 'Delivered',
            trackingNumber: 'TCS-99812034',
            courierName: 'TCS Express',
            subtotal: 14900,
            discountAmount: 0,
            shippingCost: 0,
            totalAmount: 14900,
            totalCost: 8200,
            isDemo: true,
            createdAt: twoDaysAgoDate,
            updatedAt: yesterdayDate,
          })
          .returning();

        await db.insert(orderItems).values({
          orderId: order1.id,
          productId: seededProducts[0].id,
          productName: seededProducts[0].name,
          sku: seededProducts[0].sku,
          variantLabel: 'Obsidian / Gold · 42mm',
          quantity: 1,
          unitPrice: 14900,
          unitCost: 8200,
          lineTotal: 14900,
        });

        await db.insert(orderStatusHistory).values([
          {
            orderId: order1.id,
            status: 'Pending',
            note: 'Order placed via storefront checkout.',
            changedBy: 'Customer',
            createdAt: twoDaysAgoDate,
          },
          {
            orderId: order1.id,
            status: 'Shipped',
            note: 'Dispatched via TCS Express (TCS-99812034).',
            changedBy: 'Admin',
            createdAt: yesterdayDate,
          },
          {
            orderId: order1.id,
            status: 'Delivered',
            note: 'COD payment collected and verified.',
            changedBy: 'Admin',
            createdAt: yesterdayDate,
          },
        ]);

        const [order2] = await db
          .insert(orders)
          .values({
            orderNumber: 'PS-2026-1002',
            customerName: 'Saad Malik (Demo)',
            customerPhone: '03219876543',
            customerEmail: 'saad.demo@example.com',
            deliveryAddress: 'Sector F-7/2, Street 19',
            city: 'Islamabad',
            province: 'Islamabad Capital Territory',
            postalCode: '44000',
            paymentMethod: 'easypaisa',
            paymentStatus: 'awaiting_verification',
            paymentReference: 'EP-TXN-884129',
            orderStatus: 'Pending',
            subtotal: 19750,
            discountAmount: 1975,
            couponCode: 'PRINCESTAR10',
            shippingCost: 0,
            totalAmount: 17775,
            totalCost: 10000,
            isDemo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        await db.insert(orderItems).values([
          {
            orderId: order2.id,
            productId: seededProducts[2].id,
            productName: seededProducts[2].name,
            sku: seededProducts[2].sku,
            variantLabel: 'Brushed Gold / Smoke',
            quantity: 1,
            unitPrice: 5950,
            unitCost: 2600,
            lineTotal: 5950,
          },
          {
            orderId: order2.id,
            productId: seededProducts[4].id,
            productName: seededProducts[4].name,
            sku: seededProducts[4].sku,
            variantLabel: 'Burnished Cognac · EU 42',
            quantity: 1,
            unitPrice: 13800,
            unitCost: 7400,
            lineTotal: 13800,
          },
        ]);

        await db.insert(orderStatusHistory).values({
          orderId: order2.id,
          status: 'Pending',
          note: 'Easypaisa reference EP-TXN-884129 submitted; awaiting admin verification.',
          changedBy: 'Customer',
        });

        await db.insert(expenses).values([
          {
            date: todayStr,
            category: 'advertising',
            amount: 2500,
            notes: 'Meta & TikTok campaign boost (Demo Expense)',
            recordedBy: 'System Demo',
            isDemo: true,
          },
          {
            date: todayStr,
            category: 'packaging',
            amount: 1200,
            notes: 'Velvet boxes & gold-foil gift bags (Demo Expense)',
            recordedBy: 'System Demo',
            isDemo: true,
          },
        ]);

        await db.insert(socialVerifications).values({
          platform: 'instagram',
          username: '@lahore_gentleman_demo',
          customerName: 'Zain Abbas (Demo)',
          customerEmail: 'zain.demo@example.com',
          customerPhone: '03331122334',
          proofNote: 'Followed @prince_star_0617 on Instagram and liked latest reel.',
          status: 'pending',
        });
      }
    }

    bootstrapped = true;
  } catch (err) {
    bootstrapPromise = null;
    throw err;
  }
}

export async function ensureBootstrapData(): Promise<void> {
  if (bootstrapped) return;
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap();
  }
  await bootstrapPromise;
}

export async function getSettingValue<T extends Record<string, unknown>>(
  key: string
): Promise<T> {
  await ensureBootstrapData();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  return ((row?.value as T) || (DEFAULT_SETTINGS[key] as T) || {}) as T;
}
