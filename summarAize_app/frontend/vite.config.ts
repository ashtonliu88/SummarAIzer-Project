import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Anything that starts with /summarize, /generate-audio or /audio
      // will be sent straight to your backend container.
      "/summarize":             "http://localhost:8000",
      "/generate-audio":        "http://localhost:8000",
      "/generate-visuals-video": "http://localhost:8000",
      "/audio":                 "http://localhost:8000",
      "/video":                 "http://localhost:8000"
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
}));
