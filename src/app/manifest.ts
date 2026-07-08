import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "썰거래소 SSULEX",
    short_name: "썰거래소",
    description: "이야기를 주식처럼 거래하는 썰 거래소",
    start_url: "/",
    display: "standalone",
    theme_color: "#6C3CE9",
    background_color: "#FFFFFF",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
