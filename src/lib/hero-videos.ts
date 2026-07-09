export type HeroVideoVariant =
  | "home"
  | "sale"
  | "rental"
  | "maintenance"
  | "autoParts"
  | "detailing";

export const heroVideos: Record<HeroVideoVariant, { video: string; poster: string }> = {
  home: {
    video: "/videos/hero-car.mp4",
    poster: "/videos/hero-car-poster.jpg",
  },
  sale: {
    video: "/videos/hero-sale.mp4",
    poster: "/videos/hero-sale-poster.jpg",
  },
  rental: {
    video: "/videos/hero-rental.mp4",
    poster: "/videos/hero-rental-poster.jpg",
  },
  maintenance: {
    video: "/videos/hero-maintenance.mp4",
    poster: "/videos/hero-maintenance-poster.jpg",
  },
  autoParts: {
    video: "/videos/hero-auto-parts.mp4",
    poster: "/videos/hero-auto-parts-poster.jpg",
  },
  detailing: {
    video: "/videos/hero-detailing.mp4",
    poster: "/videos/hero-detailing-poster.jpg",
  },
};
