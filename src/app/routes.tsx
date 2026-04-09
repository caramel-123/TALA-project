import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Landing } from "./pages/Landing";
import { Diagnose } from "./pages/Diagnose";
import { Advise } from "./pages/Advise";
import { DataManager } from "./pages/DataManager";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";
import { DiagnoseErrorState } from "./components/error/DiagnoseErrorState";

function RedirectToDiagnose() {
  return <Navigate to="/diagnose" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/",
    Component: MainLayout,
    children: [
      { path: "diagnose", Component: Diagnose, errorElement: <DiagnoseErrorState /> },
      { path: "advise", Component: Advise },
      { path: "data-manager", Component: DataManager },
      { path: "overview", Component: RedirectToDiagnose },
      { path: "reports", Component: RedirectToDiagnose },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
