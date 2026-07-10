export type FleetStockImage = {
  id: string;
  url: string;
  label: string;
};

export const FLEET_STOCK_IMAGES: FleetStockImage[] = [
  {
    id: "mg-zs",
    url: "/images/fleet/mg-zs.png",
    label: "MG ZS",
  },
  {
    id: "toyota-prado-gx",
    url: "/images/fleet/toyota-prado-gx.png",
    label: "Toyota Prado GX",
  },
  {
    id: "toyota-prado-gxl",
    url: "/images/fleet/toyota-prado-gxl.png",
    label: "Toyota Prado GXL",
  },
  {
    id: "gwm-haval",
    url: "/images/fleet/gwm-haval.png",
    label: "GWM Haval",
  },
];

export const FLEET_STOCK_IMAGE_URLS = Object.fromEntries(
  FLEET_STOCK_IMAGES.map((image) => [image.id, image.url])
) as Record<(typeof FLEET_STOCK_IMAGES)[number]["id"], string>;
