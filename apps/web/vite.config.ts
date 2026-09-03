import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-16.png", "icons/favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "UniBuzzz",
        short_name: "UniBuzzz",
        description:
          "The university-only social platform — feed, communities, marketplace, and reviews.",
        theme_color: "#F6BA24",
        background_color: "#F6BA24",
        display: "standalone",
        orientation: "portrait",
        lang: "en",
        dir: "ltr",
        categories: ["social", "education", "shopping"],
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Feed",
            url: "/",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Marketplace",
            url: "/marketplace",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Reviews",
            url: "/reviews",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webp}"],
        // The full-res 361x361 bee-logo.png stays in public/ as the
        // AGENTS.md-documented brand-color reference asset, but nothing at
        // runtime fetches it any more (see BrandLogo.tsx) — precaching it
        // would just add 160KB+ to every install for no benefit.
        globIgnores: ["**/brand/bee-logo.png"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Supabase Storage (avatar/post/listing media, public + signed) —
            // content is immutable once uploaded (see AGENTS.md's
            // immutable-content convention), so a stale-while-revalidate cache
            // makes images load instantly on repeat views and still work offline.
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase REST/RPC data calls — network-first so users always get
            // fresh data when online, but a short-lived cache lets an
            // already-visited screen render something instead of erroring
            // outright on a flaky/offline connection.
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.endsWith(".supabase.co") &&
              (url.pathname.includes("/rest/v1/") || url.pathname.includes("/rpc/")),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-data",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.hostname === "fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
