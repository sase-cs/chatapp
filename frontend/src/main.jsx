import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ClerkProvider } from "@clerk/react";
import { MotionConfig } from "motion/react";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <BrowserRouter>
        {/* respects the OS "reduce motion" setting for every animation in the app */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
);
