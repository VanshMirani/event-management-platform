import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const INDIA_TIME_OFFSET_MINUTES = 330;

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to seed the database.`);
  }

  return value;
}

function daysFromNowInIndia(days, hour, minute = 0) {
  const nowInIndia = new Date(Date.now() + INDIA_TIME_OFFSET_MINUTES * 60 * 1000);
  const utcTimeForIndia = Date.UTC(
    nowInIndia.getUTCFullYear(),
    nowInIndia.getUTCMonth(),
    nowInIndia.getUTCDate() + days,
    hour,
    minute
  );

  return new Date(utcTimeForIndia - INDIA_TIME_OFFSET_MINUTES * 60 * 1000);
}

const categories = [
  {
    name: "Technology",
    slug: "technology",
    description: "Developer conferences, product gatherings, and practical workshops."
  },
  {
    name: "Music",
    slug: "music",
    description: "Concerts, live performances, and festival experiences."
  },
  {
    name: "Business",
    slug: "business",
    description: "Networking events, founder sessions, and leadership forums."
  },
  {
    name: "Arts & Culture",
    slug: "arts-culture",
    description: "Exhibitions, performances, design gatherings, and cultural programmes."
  },
  {
    name: "Food & Lifestyle",
    slug: "food-lifestyle",
    description: "Food festivals, tastings, markets, and lifestyle experiences."
  },
  {
    name: "Sports & Wellness",
    slug: "sports-wellness",
    description: "Runs, fitness events, outdoor activities, and wellbeing sessions."
  }
];

const sampleUsers = [
  {
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 01428"
  },
  {
    name: "Nisha Kapoor",
    email: "nisha.kapoor@example.com",
    phone: "+91 98110 67342"
  },
  {
    name: "Dev Malhotra",
    email: "dev.malhotra@example.com",
    phone: "+91 99203 48156"
  }
];

const sampleEvents = [
  {
    categorySlug: "technology",
    title: "Cloud Builders Summit",
    slug: "cloud-builders-summit",
    shortDescription: "A full-day conference for cloud engineers and product builders.",
    description:
      "Meet engineering leaders for architecture talks, hands-on deployment clinics, and practical sessions on building dependable cloud products.",
    imageUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=85",
    type: "HYBRID",
    venueName: "NESCO Convention Centre",
    address: "Western Express Highway, Goregaon East",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    onlineUrl: "https://meet.jit.si/EventFlow-Cloud-Builders",
    capacity: 500,
    startsAt: daysFromNowInIndia(21, 10),
    endsAt: daysFromNowInIndia(21, 18),
    isFeatured: true,
    ticketTypes: [
      {
        name: "Early Bird",
        description: "Full-day access at an early registration price.",
        price: "1499.00",
        totalQuantity: 150,
        maxPerBooking: 4
      },
      {
        name: "Standard",
        description: "Conference sessions, expo access, and lunch.",
        price: "2499.00",
        totalQuantity: 350,
        maxPerBooking: 6
      }
    ]
  },
  {
    categorySlug: "music",
    title: "Indie Night Live",
    slug: "indie-night-live",
    shortDescription: "An evening of independent artists, acoustic sets, and local food.",
    description:
      "Spend an evening with a curated lineup of independent bands and singer-songwriters, alongside food pop-ups from Mumbai favourites.",
    imageUrl:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=85",
    type: "OFFLINE",
    venueName: "Phoenix Marketcity Courtyard",
    address: "LBS Marg, Kurla West",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    capacity: 800,
    startsAt: daysFromNowInIndia(35, 18),
    endsAt: daysFromNowInIndia(35, 23),
    isFeatured: true,
    ticketTypes: [
      {
        name: "General Entry",
        description: "Standing access to the main performance area.",
        price: "999.00",
        totalQuantity: 600,
        maxPerBooking: 8
      },
      {
        name: "VIP Lounge",
        description: "Premium viewing area with dedicated lounge access.",
        price: "2999.00",
        totalQuantity: 200,
        maxPerBooking: 4
      }
    ]
  },
  {
    categorySlug: "business",
    title: "Startup Growth Workshop",
    slug: "startup-growth-workshop",
    shortDescription: "A practical online workshop for founders building repeatable growth.",
    description:
      "Work through positioning, early analytics, fundraising readiness, and first-team hiring with experienced founders and operators.",
    imageUrl:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=85",
    type: "ONLINE",
    country: "India",
    onlineUrl: "https://meet.jit.si/EventFlow-Startup-Growth",
    capacity: 300,
    startsAt: daysFromNowInIndia(14, 14),
    endsAt: daysFromNowInIndia(14, 17),
    isFeatured: false,
    ticketTypes: [
      {
        name: "Workshop Pass",
        description: "Live workshop access and a post-event resource pack.",
        price: "799.00",
        totalQuantity: 300,
        maxPerBooking: 5
      }
    ]
  },
  {
    categorySlug: "arts-culture",
    title: "Product Design Forum Bengaluru",
    slug: "product-design-forum-bengaluru",
    shortDescription: "An afternoon of product critique, craft, and design leadership.",
    description:
      "Join product designers, researchers, and design leaders for case studies, portfolio conversations, and a live interface critique.",
    imageUrl:
      "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85",
    type: "OFFLINE",
    venueName: "Bangalore International Centre",
    address: "7, 4th Main Road, Domlur II Stage",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    capacity: 280,
    startsAt: daysFromNowInIndia(28, 13),
    endsAt: daysFromNowInIndia(28, 18, 30),
    isFeatured: true,
    ticketTypes: [
      {
        name: "Forum Pass",
        description: "Access to every talk, critique, and networking session.",
        price: "1200.00",
        totalQuantity: 220,
        maxPerBooking: 4
      },
      {
        name: "Student Pass",
        description: "Reduced-price entry with a valid student identity card.",
        price: "600.00",
        totalQuantity: 60,
        maxPerBooking: 2
      }
    ]
  },
  {
    categorySlug: "food-lifestyle",
    title: "Delhi Food & Culture Festival",
    slug: "delhi-food-culture-festival",
    shortDescription: "Two days of regional food, live performances, and maker markets.",
    description:
      "Taste regional menus from independent kitchens, meet homegrown makers, and enjoy folk and contemporary performances across two stages.",
    imageUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85",
    type: "OFFLINE",
    venueName: "Jawaharlal Nehru Stadium Grounds",
    address: "Lodhi Road",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    capacity: 1800,
    startsAt: daysFromNowInIndia(42, 11),
    endsAt: daysFromNowInIndia(43, 22),
    isFeatured: true,
    ticketTypes: [
      {
        name: "Festival Entry",
        description: "Single-day festival access; food is purchased separately.",
        price: "499.00",
        totalQuantity: 1400,
        maxPerBooking: 8
      },
      {
        name: "Tasting Trail",
        description: "Entry plus a curated set of six tasting portions.",
        price: "1199.00",
        totalQuantity: 400,
        maxPerBooking: 4
      }
    ]
  },
  {
    categorySlug: "sports-wellness",
    title: "Pune City Run 10K",
    slug: "pune-city-run-10k",
    shortDescription: "A timed city run with a beginner-friendly route and finish-line village.",
    description:
      "Run a certified 10K route through central Pune with hydration support, timing, a finisher medal, and a community breakfast at the finish.",
    imageUrl:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=85",
    type: "OFFLINE",
    venueName: "BMCC Ground",
    address: "Fergusson College Road, Shivajinagar",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    capacity: 1200,
    startsAt: daysFromNowInIndia(49, 6),
    endsAt: daysFromNowInIndia(49, 10),
    isFeatured: false,
    ticketTypes: [
      {
        name: "10K Runner",
        description: "Race entry, timing bib, finisher medal, and breakfast.",
        price: "899.00",
        totalQuantity: 1000,
        maxPerBooking: 6
      },
      {
        name: "Supporter Pass",
        description: "Finish-line village entry and breakfast for friends and family.",
        price: "299.00",
        totalQuantity: 200,
        maxPerBooking: 6
      }
    ]
  },
  {
    categorySlug: "business",
    title: "Founders' Finance Office Hours",
    slug: "founders-finance-office-hours",
    shortDescription: "A free live session on cash flow, runway, and investor reporting.",
    description:
      "Bring practical finance questions to an interactive session led by startup finance operators, with templates shared after the event.",
    imageUrl:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85",
    type: "ONLINE",
    country: "India",
    onlineUrl: "https://meet.jit.si/EventFlow-Founder-Finance",
    capacity: 180,
    startsAt: daysFromNowInIndia(10, 17),
    endsAt: daysFromNowInIndia(10, 18, 30),
    isFeatured: false,
    ticketTypes: [
      {
        name: "Online Access",
        description: "Live session access and the finance template pack.",
        price: "0.00",
        totalQuantity: 180,
        maxPerBooking: 3
      }
    ]
  }
];

async function seedAdmin() {
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const existingAdmin = await prisma.user.findUnique({ where: { email } });

  if (existingAdmin) {
    return existingAdmin;
  }

  const passwordHash = await bcrypt.hash(requiredEnv("ADMIN_PASSWORD"), 12);

  return prisma.user.create({
    data: {
      name: "EventFlow Admin",
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
}

async function seedSampleUsers() {
  for (const user of sampleUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (existingUser) {
      continue;
    }

    await prisma.user.create({
      data: {
        ...user,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role: "USER",
        status: "ACTIVE"
      }
    });
  }
}

async function seedCategories() {
  const records = {};

  for (const category of categories) {
    records[category.slug] = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    });
  }

  return records;
}

async function seedEvents(admin, categoryBySlug) {
  for (const event of sampleEvents) {
    const { categorySlug, ticketTypes, ...eventData } = event;
    const category = categoryBySlug[categorySlug];

    const existingEvent = await prisma.event.findUnique({
      where: { slug: eventData.slug },
      select: {
        id: true,
        imageUrl: true,
        shortDescription: true,
        description: true
      }
    });
    let savedEvent = existingEvent;

    if (!existingEvent) {
      savedEvent = await prisma.event.create({
        data: {
          ...eventData,
          status: "PUBLISHED",
          categoryId: category.id,
          organizerId: admin.id
        }
      });
    } else {
      const missingPresentationFields = {
        ...(!existingEvent.imageUrl ? { imageUrl: eventData.imageUrl } : {}),
        ...(!existingEvent.shortDescription
          ? { shortDescription: eventData.shortDescription }
          : {}),
        ...(!existingEvent.description ? { description: eventData.description } : {})
      };

      if (Object.keys(missingPresentationFields).length > 0) {
        savedEvent = await prisma.event.update({
          where: { id: existingEvent.id },
          data: missingPresentationFields
        });
      }
    }

    for (const ticketType of ticketTypes) {
      await prisma.ticketType.upsert({
        where: {
          eventId_name: {
            eventId: savedEvent.id,
            name: ticketType.name
          }
        },
        update: {},
        create: {
          ...ticketType,
          availableQuantity: ticketType.totalQuantity,
          eventId: savedEvent.id
        }
      });
    }
  }
}

async function main() {
  const admin = await seedAdmin();
  await seedSampleUsers();
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
