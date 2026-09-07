import type { BusinessCategory } from "./api";

// Expanded 2026-09-08 from the original 13 (a Bangladesh-market trial
// list) to 18, aimed at Punqle's real US/EU/AU target market. Informed by
// a real competitor's own published taxonomy (MakeUGC), not guessed.
// fashion_apparel/beauty_skincare is a real split (was one "Health/Beauty"
// entry) — this is what actually determines whether Try-On is relevant to
// a given business, not just a relabel.
export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  retail: "Retail",
  ecommerce: "Ecommerce",
  fashion_apparel: "Fashion & Apparel",
  beauty_skincare: "Beauty & Skincare",
  home_living: "Home & Living",
  pet_care: "Pet Care",
  baby_parenting: "Baby & Parenting",
  restaurant_cafe: "Restaurant/Cafe",
  food_beverage: "Food & Beverage",
  fitness_sports: "Fitness & Sports",
  professional_services: "Professional Services",
  home_services: "Home Services",
  real_estate: "Real Estate",
  automotive: "Automotive",
  education_coaching: "Education & Coaching",
  events_entertainment: "Events & Entertainment",
  tech_gaming: "Tech & Gaming",
  other: "Other",
};

export const CATEGORY_OPTIONS: BusinessCategory[] = [
  "retail",
  "ecommerce",
  "fashion_apparel",
  "beauty_skincare",
  "home_living",
  "pet_care",
  "baby_parenting",
  "restaurant_cafe",
  "food_beverage",
  "fitness_sports",
  "professional_services",
  "home_services",
  "real_estate",
  "automotive",
  "education_coaching",
  "events_entertainment",
  "tech_gaming",
  "other",
];

// Categories where Try-On is directly relevant — used only to decide the
// home screen's Try-On card default emphasis, never to hide the feature
// from anyone else.
export const TRYON_RELEVANT_CATEGORIES: BusinessCategory[] = [
  "fashion_apparel",
  "beauty_skincare",
  "home_living",
];
