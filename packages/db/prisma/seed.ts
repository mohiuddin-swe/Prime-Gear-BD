import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src";

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
  tiers?: { minQty: number; unitPrice: number; label: string }[];
};

const categories = [
  { name: "Smart Home", slug: "smart-home" },
  { name: "LED Lighting", slug: "led-lighting" },
  { name: "Gadgets", slug: "gadgets" },
  { name: "Accessories", slug: "accessories" },
];

const brands = ["Prime Gear", "Tuya", "Xiaomi", "Baseus"];

const products: SeedProduct[] = [
  {
    name: "Smart WiFi Plug 16A",
    slug: "smart-wifi-plug-16a",
    category: "smart-home",
    brand: "Tuya",
    short: "App and voice control with energy monitoring.",
    featured: true,
    variants: [{ name: "Default", sku: "SH-PLUG-16A", price: 790, comparePrice: 990, stock: 80 }],
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
  const attrValueIds: Record<string, string> = {};
  for (const [attrName, values] of Object.entries({
    Color: ["Warm White", "Cool White", "Black", "White"],
    Length: ["5m", "10m"],
  })) {
    const attr = await prisma.attribute.upsert({
      where: { storeId_slug: { storeId, slug: attrName.toLowerCase() } },
      update: {},
      create: { storeId, name: attrName, slug: attrName.toLowerCase() },
    });
    for (const [i, value] of values.entries()) {
      const row = await prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: attr.id, value } },
        update: {},
        create: { storeId, attributeId: attr.id, value, sortOrder: i },
      });
      attrValueIds[`${attrName}:${value}`] = row.id;
    }
  }

  for (const p of products) {
    const existing = await prisma.product.findUnique({
      where: { storeId_slug: { storeId, slug: p.slug } },
    });
    if (existing) continue; // seed is create-once so re-runs never overwrite admin edits

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
      },
    });

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
