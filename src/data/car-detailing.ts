export const detailingServices = [
  {
    id: "exterior-wash",
    title: "Exterior Wash",
    description:
      "Hand wash, foam pre-soak, and spot-free rinse for a streak-free finish that protects your paint in Darwin's harsh climate.",
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d5878c?w=800&q=80",
    icon: "droplets",
  },
  {
    id: "interior-detailing",
    title: "Interior Detailing",
    description:
      "Deep vacuum, steam cleaning, leather conditioning, and odour treatment for a fresh cabin you'll love every drive.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    icon: "sofa",
  },
  {
    id: "cut-polish",
    title: "Cut & Polish",
    description:
      "Remove light scratches, oxidation, and swirl marks with professional machine polishing for a deep, mirror-like shine.",
    image: "https://images.unsplash.com/photo-1520340356584-1fc950effda2?w=800&q=80",
    icon: "sparkles",
  },
  {
    id: "ceramic-coating",
    title: "Ceramic Coating",
    description:
      "Long-lasting paint protection against UV, salt, and road grime — ideal for Northern Territory sun and coastal conditions.",
    image: "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80",
    icon: "shield",
  },
  {
    id: "engine-bay",
    title: "Engine Bay Cleaning",
    description:
      "Safe degreasing and dressing of your engine bay for a showroom finish without compromising electrical components.",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
    icon: "cog",
  },
  {
    id: "headlight-restoration",
    title: "Headlight Restoration",
    description:
      "Restore cloudy, yellowed headlights for improved night visibility and a sharper, newer look at the front of your vehicle.",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
    icon: "lightbulb",
  },
] as const;

export const detailingWhyChoose = [
  {
    title: "Certified Professionals",
    description: "Trained detailers with years of experience on all makes and models.",
    icon: "badge",
  },
  {
    title: "Premium Products",
    description: "Professional-grade cleaners, polishes, and coatings built to last.",
    icon: "star",
  },
  {
    title: "Affordable Packages",
    description: "Transparent pricing with packages for every budget and vehicle type.",
    icon: "wallet",
  },
  {
    title: "Fast Service",
    description: "Efficient workflows so you get your vehicle back looking its best, sooner.",
    icon: "clock",
  },
  {
    title: "Customer Satisfaction",
    description: "We stand behind our work with a commitment to quality you can see and feel.",
    icon: "heart",
  },
  {
    title: "Modern Equipment",
    description: "Latest tools and techniques for superior results on every detail.",
    icon: "wrench",
  },
] as const;

export const detailingBlogs = [
  {
    id: "ceramic-coating-darwin",
    title: "Why Ceramic Coating Is Worth It in Darwin's Climate",
    excerpt:
      "From intense UV to red dust, learn how ceramic coatings protect your paint and keep your car looking newer for longer.",
    date: "2026-03-12",
    image: "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80",
    href: "/contact?subject=detailing",
  },
  {
    id: "interior-detailing-tips",
    title: "5 Signs Your Car Needs a Professional Interior Detail",
    excerpt:
      "Odours, stains, and faded trim don't fix themselves. Here's when to book a deep interior clean at Everest Car Rental.",
    date: "2026-02-28",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    href: "/contact?subject=detailing",
  },
  {
    id: "paint-protection-guide",
    title: "Cut & Polish vs Full Detail: What's Right for Your Car?",
    excerpt:
      "Not sure which package you need? We break down the difference so you can choose the best treatment for your vehicle.",
    date: "2026-01-15",
    image: "https://images.unsplash.com/photo-1520340356584-1fc950effda2?w=800&q=80",
    href: "/contact?subject=detailing",
  },
] as const;

export const DETAILING_HERO_IMAGE =
  "https://images.unsplash.com/photo-1601362840469-51e4d8d5878c?w=1920&q=80";

export const detailingPricing = [
  {
    id: "exterior-only",
    title: "Exterior Only",
    price: 99,
    accentClass: "bg-amber-700",
    features: [
      "Exterior Hand Wash",
      "Engine Bay",
      "Rims & Tire Shine",
      "Interior Vacuum",
    ],
  },
  {
    id: "exterior-basic-interior",
    title: "Exterior and Basic Interior",
    price: 199,
    accentClass: "bg-gray-400",
    features: [
      "Exterior Hand Wash",
      "Engine Bay",
      "Rims & Tire Shine",
      "Interior Vacuum",
      "Wipe all Surfaces",
      "Interior Windows",
      "Clean car headliner",
      "Glow the interior",
    ],
  },
  {
    id: "full-exterior-interior",
    title: "Full Exterior and Interior",
    price: 299,
    accentClass: "bg-amber-500",
    featured: true,
    features: [
      "Exterior Hand Wash",
      "Engine Bay",
      "Rims & Tire Shine",
      "Interior Vacuum",
      "Wipe all Surfaces",
      "Interior Windows",
      "Leather Clean & Condition",
      "Seat and Carpet Shampoo",
      "Interior Glow",
    ],
  },
  {
    id: "extras",
    title: "Extras",
    price: null,
    accentClass: "bg-sky-400",
    features: [
      "Cut and Polish",
      "Headlight Rejuvenation",
      "Window tint removal",
      "Hair Removal",
      "and many more",
    ],
  },
] as const;

export const detailingWorkProcess = [
  {
    step: "01",
    title: "Select your wash day",
    illustration: "wash-day",
  },
  {
    step: "02",
    title: "Select your wash package",
    illustration: "wash-package",
  },
  {
    step: "03",
    title: "Leave car ready for technicians",
    illustration: "ready-for-techs",
  },
  {
    step: "04",
    title: "Enjoy your clean car",
    illustration: "clean-car",
  },
] as const;

export const detailingFeaturedServices = [
  {
    id: "quick-exterior",
    title: "Quick Exterior",
    subtitle: "Car washing",
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d5878c?w=800&q=80",
    icon: "wheel",
    href: "#book-detailing",
  },
  {
    id: "full-exterior-interior",
    title: "Full Exterior and Interior",
    subtitle: "Car washing",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    icon: "spray",
    href: "#book-detailing",
  },
  {
    id: "cut-polish",
    title: "Cut and Polish",
    subtitle: "Car washing",
    image: "https://images.unsplash.com/photo-1520340356584-1fc950effda2?w=800&q=80",
    icon: "car",
    href: "#book-detailing",
  },
] as const;

export const detailingStats = [
  { value: "50", label: "Satisfied Customers" },
  { value: "5+", label: "Technicians & Workers" },
  { value: "99%", label: "Customer Satisfaction" },
] as const;
