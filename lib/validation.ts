import { z } from "zod";

// ---- Public lead ----------------------------------------------------------

export const attributionSchema = z.object({
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  gclid: z.string().max(500).optional().nullable(),
  gbraid: z.string().max(500).optional().nullable(),
  wbraid: z.string().max(500).optional().nullable(),
  fbclid: z.string().max(500).optional().nullable(),
  campaignId: z.string().max(200).optional().nullable(),
  adGroupId: z.string().max(200).optional().nullable(),
  keyword: z.string().max(200).optional().nullable(),
  creativeId: z.string().max(200).optional().nullable(),
  device: z.string().max(60).optional().nullable(),
  browser: z.string().max(120).optional().nullable(),
  referrer: z.string().max(1000).optional().nullable(),
  landingPage: z.string().max(1000).optional().nullable(),
  firstPage: z.string().max(1000).optional().nullable(),
  lastPage: z.string().max(1000).optional().nullable(),
});

export const leadSchema = z
  .object({
    customerName: z.string().trim().min(2, "Please enter your name").max(120),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .regex(/^\+?[\d\s-]+$/, "Enter a valid phone number")
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      }, "Enter a valid phone number"),
    email: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")),
    destinationText: z.string().trim().min(2, "Where do you want to go?").max(160),
    departureCity: z.string().trim().max(120).optional().or(z.literal("")),
    travelDate: z.string().optional().nullable(),
    travelDateText: z.string().max(120).optional().or(z.literal("")),
    travelers: z.coerce.number().int().min(1).max(999).optional().nullable(),
    budget: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
    tripType: z.string().max(60).optional().or(z.literal("")),
    requirements: z.array(z.string().max(60)).max(20).optional().default([]),
    nights: z.coerce.number().int().min(1).max(60).optional().nullable(),
    leadFormType: z.enum(["landing-popup"]).optional(),
    message: z.string().max(2000).optional().or(z.literal("")),
    destinationId: z.string().optional().nullable(),
    packageId: z.string().optional().nullable(),
    attribution: attributionSchema.optional(),
  });

export type LeadInput = z.infer<typeof leadSchema>;

// ---- Admin manual lead (create / edit details) ----------------------------

export const adminLeadSchema = z.object({
  customerName: z.string().trim().min(2, "Name is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  email: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")),
  destinationText: z.string().trim().min(2, "Destination is required").max(160),
  departureCity: z.string().trim().max(120).optional().or(z.literal("")),
  travelDate: z.string().optional().nullable(),
  travelers: z.coerce.number().int().min(1).max(999).optional().nullable(),
  budget: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  tripType: z.string().max(60).optional().or(z.literal("")),
  requirements: z.array(z.string().max(60)).max(20).optional().default([]),
  message: z.string().max(2000).optional().or(z.literal("")),
  destinationId: z.string().optional().nullable(),
  // create-only extras
  status: z.string().optional(),
  price: z.coerce.number().int().min(0).optional().nullable(),
  source: z.string().max(60).optional().or(z.literal("")),
});

// ---- Vendor profile (self-service) ----------------------------------------

const optStr = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const agentProfileSchema = z.object({
  // personal
  firstName: optStr(80),
  lastName: optStr(80),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  personalEmail: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")),
  profileImage: optStr(500),
  // company
  companyName: z.string().trim().min(2, "Company name is required").max(160),
  state: optStr(80),
  city: optStr(80),
  companyAddress: optStr(300),
  companyEmail: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")),
  contactPerson: optStr(120),
  contactNo: optStr(20),
  website: optStr(200),
  socials: z.object({
    facebook: optStr(200), twitter: optStr(200), youtube: optStr(200),
    linkedin: optStr(200), googleBusiness: optStr(200),
  }).partial().optional(),
  lowWalletThreshold: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

// ---- Auth -----------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const agentSignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  companyName: z.string().trim().min(2, "Company name is required").max(160),
  phone: z.string().trim().min(7).max(20),
  city: z.string().trim().max(120).optional().or(z.literal("")),
});

// ---- CMS: destinations ----------------------------------------------------

export const destinationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(160),
  shortDescription: z.string().max(400).optional().or(z.literal("")),
  longDescription: z.string().max(8000).optional().or(z.literal("")),
  heroImage: z.string().max(1000).optional().or(z.literal("")),
  gallery: z.array(z.string()).optional().default([]),
  startingPrice: z.coerce.number().int().min(0).optional().nullable(),
  bestTime: z.string().max(160).optional().or(z.literal("")),
  tripTypes: z.array(z.string()).optional().default([]),
  highlights: z.array(z.string()).optional().default([]),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional().default([]),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(400).optional().or(z.literal("")),
  noindex: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
});

// ---- CMS: packages / tours ------------------------------------------------

export const packageSchema = z.object({
  kind: z.enum(["PACKAGE", "TOUR"]).default("PACKAGE"),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200),
  destinationId: z.string().optional().nullable(),
  shortDescription: z.string().max(400).optional().or(z.literal("")),
  longDescription: z.string().max(10000).optional().or(z.literal("")),
  heroImage: z.string().max(1000).optional().or(z.literal("")),
  gallery: z.array(z.string()).optional().default([]),
  durationDays: z.coerce.number().int().min(0).optional().nullable(),
  durationNights: z.coerce.number().int().min(0).optional().nullable(),
  startingPrice: z.coerce.number().int().min(0).optional().nullable(),
  offerPrice: z.coerce.number().int().min(0).optional().nullable(),
  priceLabel: z.string().max(120).optional().or(z.literal("")),
  hotelCategory: z.string().max(120).optional().or(z.literal("")),
  accommodation: z.string().max(2000).optional().or(z.literal("")),
  transport: z.string().max(2000).optional().or(z.literal("")),
  activities: z.array(z.string()).optional().default([]),
  tripType: z.string().max(60).optional().or(z.literal("")),
  difficulty: z.string().max(60).optional().or(z.literal("")),
  itinerary: z
    .array(z.object({ day: z.coerce.number().int(), title: z.string(), description: z.string().optional() }))
    .optional()
    .default([]),
  inclusions: z.array(z.string()).optional().default([]),
  exclusions: z.array(z.string()).optional().default([]),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional().default([]),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(400).optional().or(z.literal("")),
  noindex: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
});

// ---- Settings -------------------------------------------------------------

export const settingsSchema = z.object({
  brandName: z.string().min(1).max(120),
  tagline: z.string().max(200).optional().or(z.literal("")),
  logoUrl: z.string().max(1000).optional().or(z.literal("")),
  faviconUrl: z.string().max(1000).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  whatsapp: z.string().max(40).optional().or(z.literal("")),
  email: z.string().max(160).optional().or(z.literal("")),
  address: z.string().max(400).optional().or(z.literal("")),
  socials: z.object({
    facebook: z.string().optional().or(z.literal("")),
    instagram: z.string().optional().or(z.literal("")),
    twitter: z.string().optional().or(z.literal("")),
    youtube: z.string().optional().or(z.literal("")),
  }).optional(),
  defaultLeadPrice: z.coerce.number().int().min(0),
  leadMaxAgents: z.coerce.number().int().min(1).max(10),
  leadExpiryHours: z.coerce.number().int().min(1),
  footerText: z.string().max(500).optional().or(z.literal("")),
  defaultSeoTitle: z.string().max(200).optional().or(z.literal("")),
  defaultSeoDescription: z.string().max(400).optional().or(z.literal("")),
  gaId: z.string().max(60).optional().or(z.literal("")),
  metaPixelId: z.string().max(60).optional().or(z.literal("")),
  googleAdsId: z.string().max(60).optional().or(z.literal("")),
});
