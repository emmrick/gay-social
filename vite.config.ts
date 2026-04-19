import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Plugin: génère public/version.json à chaque build (utilisé par UpdateDetector)
const versionJsonPlugin = (): Plugin => {
  const version = Date.now().toString();
  return {
    name: "version-json",
    buildStart() {
      const dir = path.resolve(__dirname, "public");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "version.json"),
        JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2)
      );
    },
    config() {
      return { define: { __APP_VERSION__: JSON.stringify(version) } };
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Gay Social - Rencontres & Chat",
        short_name: "Gay Social",
        description: "Rejoins la communauté gay de ta région. Chat, échanges de photos et vidéos en groupe ou en privé.",
        theme_color: "#9b5de5",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        categories: ["social", "lifestyle"],
        screenshots: [],
        shortcuts: [
          {
            name: "Groupes",
            url: "/?tab=groups",
            description: "Accéder aux groupes régionaux"
          },
          {
            name: "Messages",
            url: "/?tab=messages",
            description: "Voir mes messages privés"
          }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
