import type { MetadataRoute } from "next";

/**
 * THE APP ON THEIR PHONE. Installed, Sown opens on "Your wallet": the recipient's door, behind
 * their face. Evergreen chrome, the sprout as the icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sown",
    short_name: "Sown",
    description: "Send money home. Part of it stays theirs: US Treasuries in their own wallet, claimed with Face ID, on Stellar.",
    id: "/mine",
    start_url: "/mine?source=home-screen",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b2a1f",
    theme_color: "#0f3f2f",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your wallet", url: "/mine", description: "What you hold, behind your face" },
      { name: "Send home", url: "/#send", description: "Send dollars, keep a slice" },
    ],
  };
}
