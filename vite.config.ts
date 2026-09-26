import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the build works both at a domain root and under
  // a sub-path like GitHub Pages' https://<user>.github.io/mech-arena-game/.
  base: "./",
  // Use the port the preview tool assigns (PORT), else Vite's default 5173.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {},
});
