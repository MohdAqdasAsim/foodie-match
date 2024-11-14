// src/App.tsx
import { Route, Routes, Navigate } from "react-router-dom";
import { Home, Dashboard, Room } from "./pages";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./services/firebaseConfig";
import { Loader, ProtectedRoute } from "./components";

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <Loader />;
  }

  return (
    <section className="w-screen min-h-screen flex items-center justify-center bg-bg-pattern bg-center bg-no-repeat bg-cover">
      <div className="w-[90vw] h-[90vh] bg-[#b2724c] rounded-2xl border-0 shadow-lg shadow-black overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" /> : <Home />}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<Dashboard />} />}
          />
          <Route
            path="/dashboard/:roomId"
            element={<ProtectedRoute element={<Room />} />}
          />
          <Route path="*" element={<Navigate to="/" />} />{" "}
          {/* Redirect all other routes to Home */}
        </Routes>
      </div>
    </section>
  );
}

export default App;
