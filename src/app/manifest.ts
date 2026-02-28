import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LocalPro — Find Local Service Providers",
    short_name: "LocalPro",
    description:
      "Connect with trusted local service providers. Post jobs, get quotes, and pay securely with escrow protection.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [],
  };
}
