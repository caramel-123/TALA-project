import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Overview } from "./pages/Overview";
import { Diagnose } from "./pages/Diagnose";
import { Advise } from "./pages/Advise";
import { DataManager } from "./pages/DataManager";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Overview },
      { path: "diagnose", Component: Diagnose },
      { path: "advise", Component: Advise },
      { path: "data-manager", Component: DataManager },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
