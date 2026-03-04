import { createRoot } from "react-dom/client";
import "./lib/safeStoragePatch";
import { initGlobalErrorCapture } from "./services/errorLogService";
import App from "./App.tsx";
import "./index.css";

// Start capturing errors immediately
initGlobalErrorCapture();

createRoot(document.getElementById("root")!).render(<App />);
