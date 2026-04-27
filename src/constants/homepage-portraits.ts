/**
 * Decorative portrait URLs (Unsplash) for marketing homepage only.
 * All images: images.unsplash.com — allowlisted in next.config.ts
 */
export const HOMEPAGE_PORTRAITS = {
  /** Floating social proof row (3 customers) */
  socialProof: [
    {
      src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80",
      alt: "LocalPro customer",
    },
    {
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
      alt: "LocalPro customer",
    },
    {
      src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80",
      alt: "LocalPro customer",
    },
  ],
  /** Featured quote — Maria S. */
  mariaTestimonial: {
    src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=320&h=320&q=80",
    alt: "Maria S., homeowner",
  },
  /** Customer testimonial cards */
  testimonials: [
    {
      src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&h=128&q=80",
      alt: "John D.",
    },
    {
      src: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=128&h=128&q=80",
      alt: "Miguel A.",
    },
    {
      src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=128&h=128&q=80",
      alt: "Carla P.",
    },
  ],
  /** Hero right column — tradesperson / tools (verified 200 from images.unsplash.com) */
  heroPro: {
    src: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1400&h=1600&q=82",
    alt: "Verified LocalPro service professional",
  },
} as const;
