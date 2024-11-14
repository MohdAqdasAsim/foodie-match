// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../services/firebaseConfig";

const ProtectedRoute: React.FC<{ element: JSX.Element }> = ({ element }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    // Optionally render a loading indicator while checking auth state
    return <div>Loading...</div>;
  }

  return user ? element : <Navigate to="/" />;
};

export default ProtectedRoute;
