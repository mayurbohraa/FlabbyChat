import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/chat.css";
import "./styles/interface.css";
import "./styles/workspace.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
