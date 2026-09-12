import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/index.js";
import { AppRoutes } from "./routes/AppRoutes.jsx";
import { RouteScrollManager } from "./routes/RouteScrollManager.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <RouteScrollManager />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
