import { HashRouter, Navigate, Routes, Route } from "react-router-dom"
import { UpdateBanner } from "./components/update-banner"
import { Home } from "./routes/home"

export function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <UpdateBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
