import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const BACKEND_URL = "http://localhost:3000"; // PORT in backend/.env

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    // same-origin requests in dev: no CORS setup, and matches the Docker build where Express serves the app
    proxy: {
      "/api": BACKEND_URL,
      "/socket.io": { target: BACKEND_URL, ws: true },
    },
  },
});
