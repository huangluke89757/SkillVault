import { createRoot } from "react-dom/client"
import { App } from "./app"
import { LocalizationProvider } from "./lib/localization"
import "./app.css"

// SkillVault defaults to the Morandi dark theme (see .dark vars in app.css).
document.documentElement.classList.add("dark")

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <LocalizationProvider>
    <App />
  </LocalizationProvider>,
)
