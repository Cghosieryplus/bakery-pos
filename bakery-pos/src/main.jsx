import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Order from "./Order.jsx";

const isOrderPage = window.location.pathname === "/order";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isOrderPage ? <Order /> : <App />}
  </StrictMode>
);
