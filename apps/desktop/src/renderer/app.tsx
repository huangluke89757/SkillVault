import { Suspense, lazy } from "react"
import { HashRouter, Navigate, Routes, Route } from "react-router-dom"
import { UpdateBanner } from "./components/update-banner"

// 路由级懒加载：Home 体积大（react-window / marked / 编辑器），
// 拆出主包后首屏只需加载框架层，CodeMirror 等重依赖按需再取。
const Home = lazy(() =>
  import("./routes/home").then((module) => ({ default: module.Home })),
)
const Discover = lazy(() =>
  import("./routes/discover").then((module) => ({ default: module.Discover })),
)
function RouteFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
      Loading view...
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <UpdateBanner />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  )
}
