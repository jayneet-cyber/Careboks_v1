import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",//localhost
    port: 8080,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("pdfjs-dist")) {
            return "vendor-pdf";
          }

          if (id.includes("@tiptap")) {
            return "vendor-editor";
          }

          if (id.includes("@supabase/supabase-js")) {
            return "vendor-supabase";
          }

          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }

          if (id.includes("react-markdown")) {
            return "vendor-markdown";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
