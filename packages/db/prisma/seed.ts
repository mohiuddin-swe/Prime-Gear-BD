import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src";
import {
  productContentInputSchema,
  type BoxContent,
  type LightMode,
  type ProductFeature,
  type ProductSpec,
} from "@primegear/shared";

const prisma = createPrismaClient();

const img = (label: string) =>
  `https://placehold.co/800x800/f5f7fb/1a56db/png?text=${encodeURIComponent(label)}`;

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

type SeedVariant = {
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  attrs?: [string, string][];
};
type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  brand: string;
  short: string;
  featured?: boolean;
  darkRoom?: boolean;
  variants: SeedVariant[];
  tiers?: { minQty: number; unitPrice: number; label?: string }[];
  subtitle?: string;
  features?: ProductFeature[];
  boxContents?: BoxContent[];
  lightModes?: LightMode[];
  specs?: ProductSpec[];
  /** Sample reviews (name, district, rating, text) */
  reviews?: [string, string, number, string][];
};

/**
 * Product page content columns, shared by create and the backfill of older seeded rows.
 * Parsed with the admin form's schema so seed data can't hold what the API would reject.
 */
const contentData = (p: SeedProduct) =>
  productContentInputSchema.parse({
    subtitle: p.subtitle,
    features: p.features,
    boxContents: p.boxContents,
    lightModes: p.lightModes,
    specs: p.specs,
  });

const categories = [
  { name: "Smart Home", slug: "smart-home" },
  { name: "LED Lighting", slug: "led-lighting" },
  { name: "Gadgets", slug: "gadgets" },
  { name: "Accessories", slug: "accessories" },
];

const brands = ["Prime Gear", "Tuya", "Xiaomi", "Baseus"];

const products: SeedProduct[] = [
  {
    // The product in design/mockups/Product.html
    name: "Rechargeable 360° Magnetic LED Wall Lamp",
    slug: "rechargeable-360-magnetic-led-wall-lamp",
    category: "led-lighting",
    brand: "Prime Gear",
    short: "Dual-sided spotlight and night light with touch and remote control.",
    subtitle: "Dual-sided spotlight and night light",
    featured: true,
    darkRoom: true,
    variants: [
      {
        name: "White",
        sku: "LED-WALL-360-WHT",
        price: 1490,
        comparePrice: 1750,
        stock: 40,
        attrs: [["Body colour", "White"]],
      },
      {
        name: "Black",
        sku: "LED-WALL-360-BLK",
        price: 1490,
        comparePrice: 1750,
        stock: 30,
        attrs: [["Body colour", "Black"]],
      },
    ],
    // 8% and 12% off the single-unit price
    tiers: [
      { minQty: 2, unitPrice: 1371, label: "Most popular" },
      { minQty: 3, unitPrice: 1311 },
    ],
    features: [
      { icon: "rotate", title: "360° rotating head", text: "Point light exactly where you need it." },
      { icon: "remote", title: "Touch + remote", text: "Change modes and brightness from bed." },
      { icon: "battery", title: "1800mAh battery", text: "Up to 4–8 hours. Type-C charging." },
      { icon: "magnet", title: "No drilling", text: "Magnetic base on 3M sticker or screws." },
    ],
    lightModes: [
      { label: "Cold", color: "#dbeafe", text: "Bright cold white for reading and the wardrobe." },
      { label: "Natural", color: "#fef9e7", text: "Neutral white that's easy on the eyes." },
      {
        label: "Warm",
        color: "#ffd27a",
        text: "Front side: 3 spotlight colours. Rear side: 3 night light colours. Adjustable brightness and a 30-minute sleep timer.",
      },
    ],
    specs: [
      { label: "Battery", value: "1800mAh rechargeable" },
      { label: "Backup", value: "4–8 hours" },
      { label: "Charging", value: "Type-C, about 2 hours" },
      { label: "Control", value: "Touch + remote" },
      { label: "Mounting", value: "3M sticker or screws" },
    ],
    boxContents: [
      { qty: 1, item: "Wall lamp" },
      { qty: 1, item: "Remote control" },
      { qty: 2, item: "Remote batteries" },
      { qty: 1, item: "Magnetic base" },
      { qty: 1, item: "3M adhesive sticker" },
      { qty: 2, item: "Mounting screws" },
      { qty: 1, item: "Type-C cable" },
      { qty: 1, item: "User manual" },
    ],
    reviews: [
      ["Farhana A.", "Dhaka", 5, "Using it beside my bed. The warm night light is perfect and the remote is handy."],
      ["Imran H.", "Gazipur", 5, "Stuck it with the 3M sticker, no drilling. Battery lasts about a week for me."],
      ["Rafiq U.", "Chattogram", 5, "Bright spotlight for reading. Ordered 2 more for my parents."],
      ["Shirin S.", "Rajshahi", 5, "Delivered in 2 days, exactly like the photos."],
      ["Kamal P.", "Narayanganj", 5, "Good build quality, rotates smoothly."],
      ["Ayesha M.", "Sylhet", 5, "Love the dark room look. Charging with Type-C is easy."],
    ],
  },
  {
    name: "Smart WiFi Plug 16A",
    slug: "smart-wifi-plug-16a",
    category: "smart-home",
    brand: "Tuya",
    short: "App and voice control with energy monitoring.",
    featured: true,
    subtitle: "Make any appliance smart",
    variants: [{ name: "Default", sku: "SH-PLUG-16A", price: 790, comparePrice: 990, stock: 80 }],
    features: [
      { icon: "smartphone", title: "App control", text: "Switch on and off from anywhere." },
      { icon: "zap", title: "Energy monitor", text: "See how much power each device uses." },
      { icon: "timer", title: "Schedules", text: "Run the geyser or AC on a timer." },
      { icon: "shield", title: "16A rated", text: "Safe for AC, fridge and heaters." },
    ],
    specs: [
      { label: "Rating", value: "16A, 220-240V" },
      { label: "Connection", value: "2.4 GHz WiFi" },
      { label: "App", value: "Tuya / Smart Life" },
      { label: "Voice", value: "Alexa, Google Assistant" },
    ],
    boxContents: [
      { qty: 1, item: "Smart plug" },
      { qty: 1, item: "User manual" },
    ],
    reviews: [
      ["Tanvir H.", "Dhaka", 5, "Setup took two minutes. I schedule my geyser every morning now."],
      ["Nusrat J.", "Chattogram", 4, "Works well with Alexa. The energy graph is handy."],
    ],
    tiers: [
      { minQty: 2, unitPrice: 740, label: "Buy 2" },
      { minQty: 4, unitPrice: 690, label: "Buy 4" },
    ],
  },
  {
    name: "Smart Door Sensor",
    slug: "smart-door-sensor",
    category: "smart-home",
    brand: "Tuya",
    short: "Instant open/close alerts on your phone.",
    variants: [{ name: "Default", sku: "SH-DOOR-01", price: 850, stock: 60 }],
  },
  {
    name: "WiFi Smart Curtain Motor",
    slug: "wifi-smart-curtain-motor",
    category: "smart-home",
    brand: "Tuya",
    short: "Schedule and automate your curtains.",
    variants: [{ name: "Default", sku: "SH-CURT-01", price: 4990, comparePrice: 5990, stock: 25 }],
  },
  {
    name: "Smart IR Remote Hub",
    slug: "smart-ir-remote-hub",
    category: "smart-home",
    brand: "Prime Gear",
    short: "Control AC and TV from one app.",
    featured: true,
    variants: [{ name: "Default", sku: "SH-IRHUB-01", price: 1490, stock: 40 }],
  },
  {
    name: "RGB LED Strip Light",
    slug: "rgb-led-strip-light",
    category: "led-lighting",
    brand: "Prime Gear",
    short: "App-controlled RGB strip with music sync.",
    featured: true,
    darkRoom: true,
    subtitle: "16 million colours that dance to your music",
    features: [
      { icon: "palette", title: "16M colours", text: "Pick any colour or a scene in the app." },
      { icon: "volume", title: "Music sync", text: "Built-in mic pulses the light to the beat." },
      { icon: "remote", title: "Remote + app", text: "24-key remote included, no WiFi needed." },
      { icon: "tool", title: "Cut to fit", text: "Peel-and-stick, cut every 3 LEDs." },
    ],
    lightModes: [
      { label: "Colour", color: "#a855f7", text: "Any of 16 million colours, set from the app or remote." },
      { label: "White", color: "#f1f5ff", text: "Clean white for everyday room light." },
      { label: "Music", color: "#22d3ee", text: "Colours change with the music in the room." },
    ],
    specs: [
      { label: "LED type", value: "5050 RGB" },
      { label: "Power", value: "12V adapter" },
      { label: "Control", value: "App + 24-key remote" },
      { label: "Mounting", value: "3M adhesive backing" },
    ],
    boxContents: [
      { qty: 1, item: "LED strip reel" },
      { qty: 1, item: "Controller" },
      { qty: 1, item: "Remote control" },
      { qty: 1, item: "12V adapter" },
    ],
    reviews: [
      ["Sadia R.", "Dhaka", 5, "My room looks amazing at night. Music mode is the best part."],
      ["Arif K.", "Sylhet", 5, "Bright colours and the adhesive holds well."],
      ["Mehedi H.", "Khulna", 4, "Good strip. The app took a minute to pair."],
    ],
    variants: [
      {
        name: "5m",
        sku: "LED-STRIP-5M",
        price: 1190,
        comparePrice: 1490,
        stock: 100,
        attrs: [["Length", "5m"]],
      },
      {
        name: "10m",
        sku: "LED-STRIP-10M",
        price: 2190,
        comparePrice: 2690,
        stock: 60,
        attrs: [["Length", "10m"]],
      },
    ],
    tiers: [
      { minQty: 2, unitPrice: 1090, label: "Buy 2" },
      { minQty: 3, unitPrice: 990, label: "Buy 3" },
    ],
  },
  {
    name: "Smart LED Bulb 9W",
    slug: "smart-led-bulb-9w",
    category: "led-lighting",
    brand: "Xiaomi",
    short: "16 million colors, dimmable.",
    darkRoom: true,
    subtitle: "Dimmable smart bulb for any E27 holder",
    lightModes: [
      { label: "Cold", color: "#dbeafe", text: "6500K daylight for study and work." },
      { label: "Natural", color: "#fef9e7", text: "4000K neutral light for living rooms." },
      { label: "Warm", color: "#ffd27a", text: "2700K cosy light for bedrooms." },
    ],
    specs: [
      { label: "Power", value: "9W (60W equivalent)" },
      { label: "Base", value: "E27" },
      { label: "Connection", value: "2.4 GHz WiFi" },
    ],
    variants: [
      {
        name: "Warm White",
        sku: "LED-BULB-WW",
        price: 690,
        stock: 120,
        attrs: [["Color", "Warm White"]],
      },
      {
        name: "Cool White",
        sku: "LED-BULB-CW",
        price: 690,
        stock: 90,
        attrs: [["Color", "Cool White"]],
      },
    ],
    tiers: [
      { minQty: 3, unitPrice: 620, label: "Buy 3" },
      { minQty: 6, unitPrice: 570, label: "Buy 6" },
    ],
  },
  {
    name: "Rechargeable Motion Sensor Night Light",
    slug: "motion-sensor-night-light",
    category: "led-lighting",
    brand: "Prime Gear",
    short: "Magnetic stick-anywhere light.",
    darkRoom: true,
    subtitle: "Turns on when you walk by",
    features: [
      { icon: "sparkles", title: "Motion sensor", text: "Lights up as you walk past, off after 20 s." },
      { icon: "magnet", title: "Magnetic", text: "Sticks to wardrobes, stairs and cabinets." },
      { icon: "battery", title: "Rechargeable", text: "Weeks per charge. USB charging." },
    ],
    boxContents: [
      { qty: 1, item: "Night light" },
      { qty: 1, item: "Magnetic strip" },
      { qty: 1, item: "USB cable" },
    ],
    variants: [{ name: "Default", sku: "LED-NIGHT-01", price: 590, stock: 150 }],
  },
  {
    name: "LED Ring Light 10 inch",
    slug: "led-ring-light-10-inch",
    category: "led-lighting",
    brand: "Prime Gear",
    short: "Three tones with phone holder and tripod.",
    darkRoom: true,
    variants: [{ name: "Default", sku: "LED-RING-10", price: 1290, comparePrice: 1590, stock: 45 }],
  },
  {
    name: "Mini Portable Fan",
    slug: "mini-portable-fan",
    category: "gadgets",
    brand: "Xiaomi",
    short: "USB rechargeable handheld fan.",
    variants: [{ name: "Default", sku: "GAD-FAN-01", price: 790, stock: 70 }],
  },
  {
    name: "TWS Wireless Earbuds",
    slug: "tws-wireless-earbuds",
    category: "gadgets",
    brand: "Baseus",
    short: "Bluetooth 5.3 with noise reduction.",
    featured: true,
    subtitle: "All-day battery with a pocket charging case",
    specs: [
      { label: "Bluetooth", value: "5.3" },
      { label: "Battery", value: "6 h (30 h with case)" },
      { label: "Charging", value: "Type-C" },
    ],
    variants: [
      {
        name: "Black",
        sku: "GAD-TWS-BLK",
        price: 1890,
        comparePrice: 2290,
        stock: 55,
        attrs: [["Color", "Black"]],
      },
      {
        name: "White",
        sku: "GAD-TWS-WHT",
        price: 1890,
        comparePrice: 2290,
        stock: 50,
        attrs: [["Color", "White"]],
      },
    ],
  },
  {
    name: "20000mAh Power Bank",
    slug: "20000mah-power-bank",
    category: "accessories",
    brand: "Baseus",
    short: "22.5W fast charging, dual output.",
    variants: [{ name: "Default", sku: "ACC-PB-20K", price: 2490, stock: 35 }],
  },
  {
    name: "65W GaN Fast Charger",
    slug: "65w-gan-fast-charger",
    category: "accessories",
    brand: "Baseus",
    short: "Charges laptop, phone and tablet.",
    variants: [{ name: "Default", sku: "ACC-GAN-65", price: 2190, stock: 40 }],
  },
  {
    name: "20W USB-C Power Adapter",
    slug: "20w-usb-c-power-adapter",
    category: "accessories",
    brand: "Baseus",
    short: "Compact fast charger for smart plugs, lights and phones.",
    variants: [{ name: "Default", sku: "ACC-USBC-20", price: 690, comparePrice: 850, stock: 60 }],
  },
  {
    name: "LED Strip Mounting Kit",
    slug: "led-strip-mounting-kit",
    category: "accessories",
    brand: "Prime Gear",
    short: "Clips, connectors and adhesive pads for a clean install.",
    variants: [{ name: "Default", sku: "ACC-LED-MNT", price: 290, stock: 100 }],
  },
];

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: "primegearbd" },
    update: {},
    create: {
      name: "Prime Gear BD",
      slug: "primegearbd",
      domain: "primegearbd.com",
      currency: "BDT",
    },
  });
  const storeId = store.id;

  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({
      where: { storeId_slug: { storeId, slug: c.slug } },
      update: {},
      create: { storeId, name: c.name, slug: c.slug, sortOrder: i, imageUrl: img(c.name) },
    });
    catIds[c.slug] = row.id;
  }

  const brandIds: Record<string, string> = {};
  for (const name of brands) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const row = await prisma.brand.upsert({
      where: { storeId_slug: { storeId, slug } },
      update: {},
      create: { storeId, name, slug },
    });
    brandIds[name] = row.id;
  }

  // Attributes used by variants
  // Values are [value, swatch?]; the swatch is the product's own colour, shown in the variant chip
  const attrValueIds: Record<string, string> = {};
  for (const [attrName, values] of Object.entries<[string, string?][]>({
    Color: [["Warm White"], ["Cool White"], ["Black"], ["White"]],
    Length: [["5m"], ["10m"]],
    "Body colour": [
      ["White", "#ffffff"],
      ["Black", "#1f2937"],
    ],
  })) {
    const slug = attrName.toLowerCase().replace(/\s+/g, "-");
    const attr = await prisma.attribute.upsert({
      where: { storeId_slug: { storeId, slug } },
      update: {},
      create: { storeId, name: attrName, slug },
    });
    for (const [i, [value, swatch]] of values.entries()) {
      const row = await prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: attr.id, value } },
        update: {},
        create: { storeId, attributeId: attr.id, value, swatch, sortOrder: i },
      });
      attrValueIds[`${attrName}:${value}`] = row.id;
    }
  }

  for (const p of products) {
    const existing = await prisma.product.findUnique({
      where: { storeId_slug: { storeId, slug: p.slug } },
    });
    if (existing) {
      // Seed is create-once so re-runs never overwrite admin edits. Rows seeded before the
      // product page content existed get it filled in while every content field is still empty.
      const untouched =
        existing.subtitle === null &&
        existing.features === null &&
        existing.boxContents === null &&
        existing.lightModes === null &&
        existing.specs === null;
      if (untouched) await prisma.product.update({ where: { id: existing.id }, data: contentData(p) });
      await seedReviews(storeId, existing.id, p);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name: p.name,
        slug: p.slug,
        shortDescription: p.short,
        description: `${p.short} Genuine quality from Prime Gear BD with Cash on Delivery across Bangladesh.`,
        status: "ACTIVE",
        isFeatured: p.featured ?? false,
        categoryId: catIds[p.category],
        brandId: brandIds[p.brand],
        seoTitle: `${p.name} Price in Bangladesh | Prime Gear BD`,
        seoDescription: p.short,
        ...contentData(p),
      },
    });
    await seedReviews(storeId, product.id, p);

    const variantIds: string[] = [];
    for (const [i, v] of p.variants.entries()) {
      const variant = await prisma.productVariant.create({
        data: {
          storeId,
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock ?? 0,
          isDefault: i === 0,
          sortOrder: i,
          attributes: {
            create: (v.attrs ?? []).map(([a, val]) => ({
              storeId,
              attributeValueId: attrValueIds[`${a}:${val}`]!,
            })),
          },
        },
      });
      variantIds.push(variant.id);
    }

    await prisma.productImage.createMany({
      data: [
        { storeId, productId: product.id, url: img(p.name), alt: p.name, sortOrder: 0 },
        {
          storeId,
          productId: product.id,
          url: img(`${p.name} 2`),
          alt: `${p.name} detail`,
          sortOrder: 1,
        },
        ...(p.darkRoom
          ? [
              {
                storeId,
                productId: product.id,
                url: img(`${p.name} dark room`),
                alt: `${p.name} in the dark`,
                kind: "DARK_ROOM" as const,
                sortOrder: 2,
              },
            ]
          : []),
      ],
    });

    if (p.tiers) {
      await prisma.bulkTier.createMany({
        data: p.tiers.map((t) => ({ storeId, productId: product.id, ...t })),
      });
    }
  }

  // Store settings (key/value). update: {} so seed re-runs never overwrite what an admin changed.
  const settings: Record<string, number | string> = {
    "shipping.insideDhaka": 60,
    "shipping.outsideDhaka": 110,
    "shipping.freeDeliveryThreshold": 3000,
    "shipping.insideDhakaEta": "1–2 days",
    "shipping.outsideDhakaEta": "2–4 days",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { storeId_key: { storeId, key } },
      update: {},
      create: { storeId, key, value },
    });
  }

  // Cart upsell offers: trigger = a product or a whole category
  const bySlug = async (slug: string) =>
    (await prisma.product.findUniqueOrThrow({ where: { storeId_slug: { storeId, slug } } })).id;
  const upsells = [
    {
      name: "Add a smart plug",
      trigger: { triggerCategoryId: catIds["led-lighting"] },
      offer: "smart-wifi-plug-16a",
      discountType: "PERCENT",
      discountValue: 10,
      priority: 10,
    },
    {
      name: "Add a night light",
      trigger: { triggerCategoryId: catIds["smart-home"] },
      offer: "motion-sensor-night-light",
      discountType: "FIXED",
      discountValue: 50,
      priority: 5,
    },
    {
      name: "USB power adapter for your lights",
      trigger: { triggerCategoryId: catIds["led-lighting"] },
      offer: "20w-usb-c-power-adapter",
      discountType: "PERCENT",
      discountValue: 10,
      priority: 8,
    },
    {
      name: "Mounting kit for LED lights",
      trigger: { triggerCategoryId: catIds["led-lighting"] },
      offer: "led-strip-mounting-kit",
      discountType: "FIXED",
      discountValue: 30,
      priority: 6,
    },
    {
      name: "Power bank for gadgets",
      trigger: { triggerCategoryId: catIds["gadgets"] },
      offer: "20000mah-power-bank",
      discountType: "FIXED",
      discountValue: 100,
      priority: 10,
    },
    {
      // Product-specific: beats the category rule for the same offer when the strip itself is added
      name: "Mounting kit for your LED strip",
      trigger: { triggerProductId: await bySlug("rgb-led-strip-light") },
      offer: "led-strip-mounting-kit",
      discountType: "FIXED",
      discountValue: 60,
      priority: 20,
    },
    {
      name: "Fast charger for your earbuds",
      trigger: { triggerProductId: await bySlug("tws-wireless-earbuds") },
      offer: "65w-gan-fast-charger",
      discountType: "PERCENT",
      discountValue: 10,
      priority: 10,
    },
    {
      name: "Power bank on the go",
      trigger: { triggerProductId: await bySlug("tws-wireless-earbuds") },
      offer: "20000mah-power-bank",
      discountType: "FIXED",
      discountValue: 100,
      priority: 5,
    },
  ] as const;
  for (const u of upsells) {
    const exists = await prisma.upsellRule.findFirst({ where: { storeId, name: u.name } });
    if (exists) continue;
    await prisma.upsellRule.create({
      data: {
        storeId,
        type: "CART_UPSELL",
        name: u.name,
        offerProductId: await bySlug(u.offer),
        discountType: u.discountType,
        discountValue: u.discountValue,
        priority: u.priority,
        ...u.trigger,
      },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL || "owner@primegearbd.com";
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { storeId_email: { storeId, email } },
  });
  if (!existingAdmin) {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    await prisma.adminUser.create({
      data: { storeId, email, name: "Owner", role: "OWNER", passwordHash: hashPassword(password) },
    });
    console.log(
      `Created OWNER ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : ` with password: ${password} (shown once)`}`,
    );
  }

  console.log("Seed complete.");
  reindexSearch();
}

/** Sample reviews, only for a product that has none yet. */
async function seedReviews(storeId: string, productId: string, p: SeedProduct) {
  if (!p.reviews?.length) return;
  if (await prisma.review.count({ where: { storeId, productId } })) return;
  await prisma.review.createMany({
    data: p.reviews.map(([name, district, rating, text], i) => ({
      storeId,
      productId,
      name,
      district,
      rating,
      text,
      isVerified: true,
      // Spread a few days apart so "latest first" has a stable order
      createdAt: new Date(Date.now() - (i + 1) * 3 * 86_400_000),
    })),
  });
}

/** Keeps Meilisearch in step with the seeded catalog. The DB is already seeded, so a failure only warns. */
function reindexSearch() {
  try {
    execFileSync("pnpm", ["--filter", "@primegear/api", "search:reindex"], {
      cwd: fileURLToPath(new URL("../../..", import.meta.url)),
      stdio: "inherit",
    });
  } catch {
    console.warn(
      "Search reindex failed (is Meilisearch running?). Run `pnpm --filter @primegear/api search:reindex` once it is up.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
