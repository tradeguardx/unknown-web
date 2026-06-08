// Server-side fetch of the public testimonials (curated 4-5★ reviews) for the
// landing page. The /testimonials endpoint is intentionally public (no key), so
// this is safe to call without any secret. Cached for 10 min via Next ISR.

export interface Testimonial {
  id?: string;
  rating: number;
  text: string;
  intent: string;
  country?: string;
  ts: number;
}

export interface TestimonialsData {
  avgRating: number;
  count: number;
  reviews: Testimonial[];
}

// Derive the API base from the ingest URL (…/ingest → …).
const BASE = process.env.ANALYTICS_INGEST_URL?.replace(/\/ingest\/?$/, "");

export async function getTestimonials(): Promise<TestimonialsData | null> {
  return fetchData("/testimonials");
}

// All public 4-5★ reviews, for the dedicated /reviews page.
export async function getAllReviews(): Promise<TestimonialsData | null> {
  return fetchData("/reviews");
}

async function fetchData(path: string): Promise<TestimonialsData | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { success?: boolean; data?: TestimonialsData };
    return j?.data ?? null;
  } catch {
    return null;
  }
}
