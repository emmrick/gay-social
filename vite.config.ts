import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Calcule un hash stable basé sur le contenu de src/ + package.json.
// La version ne change QUE si le code source change réellement,
// pas à chaque rebuild. Évite les fausses notifications de mise à jour.
const computeSourceHash = (): string => {
  const hash = crypto.createHash("sha256");
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        hash.update(entry.name);
        hash.update(fs.readFileSync(full));
      }
    }
  };
  walk(path.resolve(__dirname, "src"));
  const pkg = path.resolve(__dirname, "package.json");
  if (fs.existsSync(pkg)) hash.update(fs.readFileSync(pkg));
  const idx = path.resolve(__dirname, "index.html");
  if (fs.existsSync(idx)) hash.update(fs.readFileSync(idx));
  return hash.digest("hex").slice(0, 16);
};

// Plugin: génère public/version.json (utilisé par UpdateDetector).
// La version est un hash du code source — stable tant que rien ne change.
const versionJsonPlugin = (): Plugin => {
  const version = computeSourceHash();
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
