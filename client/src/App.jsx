import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/index.js";
import { AppRoutes } from "./routes/AppRoutes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
