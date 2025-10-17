import { createRoot } from "react-dom/client";
import { initLocalDB } from "./lib/pglite";
// import './index.css'
import App from "./App.jsx";

// Initialize PGlite database before rendering app
initLocalDB()
  .then(() => {
    console.log("✅ Database ready, rendering app...");
    createRoot(document.getElementById("root")).render(<App />);
  })
  .catch((error) => {
    console.error("❌ Failed to initialize database:", error);
    // Still render app, but show error state
    createRoot(document.getElementById("root")).render(
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Database Initialization Error</h2>
        <p>Could not initialize local database: {error.message}</p>
        <p>Please refresh the page to try again.</p>
      </div>
    );
  });
