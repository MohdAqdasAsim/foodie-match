// src/pages/Login.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../services/firebaseConfig"; // Ensure auth is imported

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Initiates Google Sign-In
      await signInWithPopup(auth, provider);
      // Redirect to dashboard after successful login
      navigate("/dashboard");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Failed to sign in with Google. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Login with Google</h1>
      <button onClick={handleGoogleSignIn} className="bg-blue-500 text-white p-2 rounded mt-4">
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;
