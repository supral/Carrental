import { Service, WhyChooseItem } from "@/types";

export const services: Service[] = [
  {
    id: "car-rental",
    title: "Car Rental",
    description:
      "Affordable daily, weekly, and monthly rentals. Perfect for visitors and locals alike.",
    icon: "rental",
    href: "/car-rental",
  },
];

export const whyChooseItems: WhyChooseItem[] = [
  {
    id: "1",
    title: "Car Insurance",
    description:
      "Travel safely and drive with confidence — all of our cars have valid insurance policies.",
    icon: "trust",
  },
  {
    id: "2",
    title: "Assistance on the Road",
    description:
      "Something happened on the road? Contact us and our team will come to help you along the way.",
    icon: "service",
  },
  {
    id: "3",
    title: "Best Cost",
    description:
      "Never overpay for your rental again — competitive pricing in the Northern Territory.",
    icon: "price",
  },
  {
    id: "4",
    title: "Wide Vehicle Range",
    description:
      "From economy sedans to SUVs and utes — find the right vehicle for your trip.",
    icon: "quality",
  },
];

export const siteConfig = {
  name: "Everest Car Rental",
  shortName: "Everest Rental",
  tagline: "Hassle-free car rental in Darwin",
  phone: "0411 528 466",
  email: "reservations@everestcarrental.com",
  address: "482 Stuart Highway, Winnellie NT 0820",
  mapQuery: "482 Stuart Highway, Winnellie NT 0820",
  hours: {
    weekdays: "Mon–Fri: 8:00 AM – 5:30 PM",
    saturday: "Sat: 8:00 AM – 2:00 PM",
    sunday: "Sun: Closed",
    utilityBar: "Mon–Sat 8:00 AM – 6:00 PM",
  },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100084775911939",
    instagram: "https://www.instagram.com/everestrental.au",
    linkedin: "https://everestcarrental.com",
  },
  logo: {
    horizontal: "/images/everest-logo-horizontal.png",
    stacked: "/images/everest-logo-stacked.png",
    favicon: "/images/everest-favicon-32.png",
    appleTouchIcon: "/images/everest-favicon-192.png",
    horizontalWidth: 945,
    horizontalHeight: 140,
    stackedWidth: 1024,
    stackedHeight: 1024,
  },
};
