import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to seed the database.`);
  }

  return value;
}

function daysFromNow(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

const categories = [
  {
    name: "Technology",
    slug: "technology",
    description: "Developer conferences, product launches, and technical workshops."
  },
  {
    name: "Music",
    slug: "music",
    description: "Concerts, live performances, and festival experiences."
  },
  {
    name: "Business",
    slug: "business",
    description: "Networking events, startup sessions, and leadership summits."
  }
];

const sampleEvents = [
  {
    categorySlug: "technology",
    title: "Cloud Builders Summit",
    slug: "cloud-builders-summit",
    shortDescription: "A full-day conference for cloud engineers and product builders.",
    description:
      "Hands-on talks, architecture panels, and deployment clinics for modern cloud teams.",
    type: "HYBRID",
    venueName: "NESCO Convention Centre",
    address: "Western Express Highway, Goregaon East",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    onlineUrl: "https://events.example.com/cloud-builders-summit",
    capacity: 500,
    startsAt: daysFromNow(21, 10),
    endsAt: daysFromNow(21, 18),
    isFeatured: true,
    ticketTypes: [
      {
        name: "Early Bird",
        description: "Discounted access for early registrants.",
        price: "1499.00",
        totalQuantity: 150,
        availableQuantity: 150,
        maxPerBooking: 4
      },
      {
        name: "Standard",
        description: "General admission ticket.",
        price: "2499.00",
        totalQuantity: 350,
        availableQuantity: 350,
        maxPerBooking: 6
      }
    ]
  },
  {
    categorySlug: "music",
    title: "Indie Night Live",
    slug: "indie-night-live",
    shortDescription: "An evening of independent artists and acoustic sets.",
    description: "A curated lineup of independent bands, singer-songwriters, and food pop-ups.",
    type: "OFFLINE",
    venueName: "Phoenix Marketcity Courtyard",
    address: "LBS Marg, Kurla West",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    capacity: 800,
    startsAt: daysFromNow(35, 18),
    endsAt: daysFromNow(35, 23),
    isFeatured: true,
    ticketTypes: [
      {
        name: "General Entry",
        description: "Standing access to the live music area.",
        price: "999.00",
        totalQuantity: 600,
        availableQuantity: 600,
        maxPerBooking: 8
      },
      {
        name: "VIP Lounge",
        description: "Premium viewing area with lounge access.",
        price: "2999.00",
        totalQuantity: 200,
        availableQuantity: 200,
        maxPerBooking: 4
      }
    ]
  },
  {
    categorySlug: "business",
    title: "Startup Growth Workshop",
    slug: "startup-growth-workshop",
    shortDescription: "A practical workshop for founders scaling their first go-to-market motion.",
    description:
      "Founder-led sessions on positioning, analytics, fundraising readiness, and hiring.",
    type: "ONLINE",
    city: "Online",
    country: "India",
    onlineUrl: "https://events.example.com/startup-growth-workshop",
    capacity: 300,
    startsAt: daysFromNow(14, 14),
    endsAt: daysFromNow(14, 17),
    ticketTypes: [
      {
        name: "Workshop Pass",
        description: "Live workshop access and replay link.",
        price: "799.00",
        totalQuantity: 300,
        availableQuantity: 300,
        maxPerBooking: 5
      }
    ]
  }
];

async function seedAdmin() {
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const password = requiredEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME ?? "Platform Admin";
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE"
    },
    create: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
}

async function seedCategories() {
  const records = {};

  for (const category of categories) {
    records[category.slug] = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description
      },
      create: category
    });
  }

  return records;
}

async function seedEvents(admin, categoryBySlug) {
  for (const event of sampleEvents) {
    const { categorySlug, ticketTypes, ...eventData } = event;
    const category = categoryBySlug[categorySlug];

    const savedEvent = await prisma.event.upsert({
      where: { slug: eventData.slug },
      update: {
        ...eventData,
        status: "PUBLISHED",
        categoryId: category.id,
        organizerId: admin.id
      },
      create: {
        ...eventData,
        status: "PUBLISHED",
        categoryId: category.id,
        organizerId: admin.id
      }
    });

    for (const ticketType of ticketTypes) {
      await prisma.ticketType.upsert({
        where: {
          eventId_name: {
            eventId: savedEvent.id,
            name: ticketType.name
          }
        },
        update: ticketType,
        create: {
          ...ticketType,
          eventId: savedEvent.id
        }
      });
    }
  }
}

async function main() {
  const admin = await seedAdmin();
  const categoryBySlug = await seedCategories();
  await seedEvents(admin, categoryBySlug);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
