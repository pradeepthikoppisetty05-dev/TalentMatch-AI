import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          if (id.includes("node_modules/motion") ||
              id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }

          if (id.includes("node_modules/react-markdown") ||
              id.includes("node_modules/remark") ||
              id.includes("node_modules/rehype") ||
              id.includes("node_modules/unified") ||
              id.includes("node_modules/hast") ||
              id.includes("node_modules/mdast") ||
              id.includes("node_modules/micromark") ||
              id.includes("node_modules/vfile")) {
            return "vendor-markdown";
          }

          if (id.includes("node_modules/pdfjs-dist")) {
            return "vendor-pdfjs";
          }

          if (id.includes("node_modules/mammoth")) {
            return "vendor-mammoth";
          }

          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
});