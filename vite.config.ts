import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: [
        "icon.svg",
        "brand/*.svg",
        "icons/*.png",
        "posters/*.webp",
        "fonts/*.{ttf,otf,txt}",
      ],
      manifest: {
        name: "Klocky — a little time, beautifully spent",
        short_name: "Klocky",
        description: "An ambient clock for your space.",
        theme_color: "#f6f5f1",
        background_color: "#f6f5f1",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2,ttf,otf}"],
        maximumFileSizeToCacheInBytes: 4000000,
      },
    }),
  ],
});
