// src/pages/Home.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig"; // Ensure auth and db are imported
import { doc, setDoc } from "firebase/firestore";

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      // Sign in with Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if this is a new user and save profile data to Firestore if needed
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            displayName: user.displayName,
            photoUrl: user.photoURL,
            email: user.email,
          },
          { merge: true }
        ); // Merge in case the document exists

        // Navigate to dashboard after successful signup/login
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(`Google Sign-In Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-2">
      <h1 className="text-6xl font-bold text-[#d4d5aa] mb-4">Foodie Match</h1>
      <p className="text-[#d4d5aa] text-2xl mb-8 text-center">
        Swipe to find the perfect restaurant match with your SO!
      </p>
      <button
        onClick={handleGoogleSignIn}
        className="flex flex-row  gap-2 bg-[#e9801c] rounded-2xl text-xl text-white p-2 mt-1"
      >
        <img      src="./src/assets/google-logo.svg" alt="google" className="w-6 aspect-square" />
        Continue with Google
      </button>
    </div>
  );
};

export default Home;
