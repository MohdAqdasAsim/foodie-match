// src/pages/Dashboard.tsx

import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../services/firebaseConfig";
import {
  doc,
  collection,
  addDoc,
  getDocs,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { deleteDoc } from "firebase/firestore"; // Add deleteDoc import

const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [rooms, setRooms] = useState<any[]>([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomDisplayName, setNewRoomDisplayName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [city, setCity] = useState("");
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState("");
  const [privacySetting, setPrivacySetting] = useState("Public"); // Privacy setting state
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;

      try {
        // Step 1: Fetch the list of room IDs from the user's subcollection
        const userRoomsRef = collection(db, "users", user.uid, "rooms");
        const roomsSnapshot = await getDocs(userRoomsRef);
        const roomIds = roomsSnapshot.docs.map((doc) => doc.id);

        // Step 2: Fetch full room data along with each room's creator's display name
        const roomsData = await Promise.all(
          roomIds.map(async (roomId) => {
            const roomRef = doc(db, "rooms", roomId);
            const roomDoc = await getDoc(roomRef);

            
            if (!roomDoc.exists()) return null; // Skip non-existent rooms

            const roomData = roomDoc.data();
            let createdByDisplayName = "Unknown User";

            // Check if 'createdBy' field exists and fetch user's displayName
            if (roomData?.createdBy) {
              // If the creator is the currently logged-in user, set display name to "You"
              if (roomData.createdBy === user.uid) {
                createdByDisplayName = "You";
              } else {
                const userRef = doc(db, "users", roomData.createdBy);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                  createdByDisplayName =
                    userDoc.data()?.displayName || "Unknown User";
                }
              }
            }

            // Return room data including the creator's display name
            return { id: roomId, ...roomData, createdByDisplayName };
          })
        );

        // Filter out any null values (in case of non-existent room docs)
        const filteredRoomsData = roomsData.filter((room) => room !== null);

        console.log(filteredRoomsData); // Check the fetched room data with creator names

        // Step 3: Set the fetched room data with creator names to state
        setRooms(filteredRoomsData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchRooms();
  }, [user]);

  const handleCreateRoom = async () => {
    // Reset the error message before validating
    setErrorMessage("");

    // Validate that both city and at least two restaurants are provided
    if (!city) {
      setErrorMessage("City is required.");
      return;
    }
    if (restaurants.length < 2) {
      setErrorMessage("At least two restaurants are required.");
      return;
    }

    // Proceed with creating the room if validation passes
    if (!user || !newRoomDisplayName) return;

    try {
      const roomRef = await addDoc(collection(db, "rooms"), {
        createdAt: new Date(),
        createdBy: user.uid,
        users: [user.uid],
        displayName: newRoomDisplayName,
        city,
        restaurants,
        isPrivate: privacySetting === "Private", // Set privacy based on dropdown value
      });

      await setDoc(doc(db, "users", user.uid, "rooms", roomRef.id), {
        roomId: roomRef.id,
        createdAt: new Date(),
        displayName: newRoomDisplayName,
      });

      const link = `${window.location.origin}/dashboard/${roomRef.id}`;
      setInviteLink(link);
      setIsModalOpen(false);
      setNewRoomDisplayName("");
      setCity("");
      setRestaurants([]);
      setPrivacySetting("Public"); // Reset privacy setting

      navigate(`/dashboard/${roomRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const handleAddRestaurant = () => {
    if (newRestaurant) {
      setRestaurants([...restaurants, newRestaurant]);
      setNewRestaurant("");
      setIsRestaurantModalOpen(false);
    }
  };

  const handleRemoveRestaurant = (index: number) => {
    const updatedRestaurants = [...restaurants];
    updatedRestaurants.splice(index, 1);
    setRestaurants(updatedRestaurants);
  };

  const handleJoinRoom = async () => {
    if (!user || !joinRoomId) return;

    try {
      const roomUserRef = doc(db, "rooms", joinRoomId, "users", user.uid);
      await setDoc(roomUserRef, {
        userId: user.uid,
        joinedAt: new Date(),
      });

      await setDoc(doc(db, "users", user.uid, "rooms", joinRoomId), {
        roomId: joinRoomId,
        joinedAt: new Date(),
      });

      navigate(`/dashboard/${joinRoomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Room not found or you may already be a member.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleCopyRoomId = async (roomId: string) => {
    try {
      await navigator.clipboard.writeText(roomId);
      alert("Your room id has been copied");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return;

    try {
      const roomRef = doc(db, "rooms", roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        console.log("Room not found");
        return;
      }

      const roomData = roomDoc.data();

      // If the logged-in user is the creator of the room
      if (roomData?.createdBy === user.uid) {
        const batch = writeBatch(db);

        // Delete the room document itself
        batch.delete(roomRef);

        // Also delete references to this room from all users' data
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        usersSnapshot.forEach((userDoc) => {
          const userRoomRef = doc(db, "users", userDoc.id, "rooms", roomId);
          batch.delete(userRoomRef);
        });

        // Commit the batch
        await batch.commit();

        // Update local state (optional)
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
      } else {
        // If the logged-in user is not the creator, just remove from their own user data
        const userRoomRef = doc(db, "users", user.uid, "rooms", roomId);
        await deleteDoc(userRoomRef);

        // Update local state (optional)
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
      }
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {user && (
        <div className="mb-4 text-center border-b-2 w-full h-16 flex flex-row items-center justify-between">
          <span className="flex flex-row">
            <img
              src={user.photoURL || "./src/assets/default-image.png"}
              alt="User Avatar"
              className="rounded-full w-12 h-12 mb-2"
            />
            <div className="flex flex-col items-start justify-center ml-3">
              <h2 className="text-xl text-[#f4eabf] m-0">
                {user.displayName || "Anonymous"}
              </h2>
              <p className="text-md text-[#f4eabf] m-0">{user.email}</p>
            </div>
          </span>
          <span className="justify-center items-center flex">
            <span
              onClick={handleLogout}
              className="text-[#f4eabf] bg-darkAccent-dark rounded-2xl px-5 py-2 cursor-pointer"
            >
              Log Out
            </span>
          </span>
        </div>
      )}

      <div className="flex flex-row items-center justify-between border-b-2 w-full">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white p-2 rounded mb-4"
        >
          Create Room
        </button>
        <div className="mb-6">
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="border p-2 rounded mr-2 placeholder:text-text-light text-text-dark"
          />
          <button
            onClick={handleJoinRoom}
            className="bg-green-500 text-white p-2 rounded"
          >
            Join Room
          </button>
        </div>
      </div>

      <div className="w-full flex flex-wrap flex-row mb-4 mt-4">
        {rooms.map((room) => (
          <span key={room.id} className="p-2">
            <span className="text-primary-light bg-darkAccent-dark text-lg px-4 py-2 rounded-2xl cursor-pointer flex flex-row gap-2 items-center">
              <span onClick={() => navigate(`/dashboard/${room.id}`)}>
                {room.displayName} (Created by:{" "}
                {room.createdByDisplayName || "You"})
              </span>
              <span
                onClick={() => handleCopyRoomId(room.id)}
                className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center hover:bg-darkAccent-light"
              >
                <img
                  src="./src/assets/invite.svg"
                  alt="invite"
                  className="w-4 h-4"
                />
              </span>

              <span
                onClick={() => handleDeleteRoom(room.id)}
                className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center hover:bg-red-300"
              >
                <img
                  src="./src/assets/delete.svg"
                  alt="delete"
                  className="w-4 h-4"
                />
              </span>
            </span>
          </span>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-primary-light p-6 rounded-2xl shadow-md w-80">
            <h2 className="text-xl font-semibold mb-4 text-text-light">
              Create a Room
            </h2>
            <input
              type="text"
              value={newRoomDisplayName}
              onChange={(e) => setNewRoomDisplayName(e.target.value)}
              placeholder="Room Display Name"
              className="border p-2 rounded-2xl w-full mb-4 placeholder:text-text-light text-text-dark"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter City (Required)"
              className="border p-2 rounded-2xl w-full mb-4 placeholder:text-text-light text-text-dark"
              required
            />
            <div className="w-full h-6 flex flex-row items-center justify-between border-b-2 mb-1">
              <p className="text-text-light text-lg">Restaurants</p>
              <span
                onClick={() => setIsRestaurantModalOpen(true)}
                className="text-green-500 cursor-pointer text-lg"
              >
                +
              </span>
            </div>
            <div className="w-full flex flex-row gap-1 mb-4 overflow-auto">
              {restaurants.length > 0 ? (
                restaurants.map((restaurant, index) => (
                  <p
                    key={index}
                    className="text-sm px-2 flex flex-row items-center gap-2 rounded-lg bg-darkAccent-light text-primary-light"
                  >
                    {restaurant}
                    <span
                      onClick={() => handleRemoveRestaurant(index)}
                      className="text-lg text-red-600 cursor-pointer"
                    >
                      &times;
                    </span>
                  </p>
                ))
              ) : (
                <p className="text-text-dark text-sm leading-none opacity-70">
                  Add the restaurants that you wish to choose from here. (Only these options will be
                  shown and available for selection.)
                </p>
              )}
            </div>
            {errorMessage && (
              <p className="text-red-500 text-sm mb-2">{errorMessage}</p> // Display the error message
            )}

            <label className="text-text-light text-lg mb-2">Privacy</label>
            <select
              value={privacySetting}
              onChange={(e) => setPrivacySetting(e.target.value)}
              className="w-full p-2 rounded-2xl border mb-4 text-text-dark"
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
            <span className="flex flex-row items-center justify-between w-full">
              <button
                onClick={handleCreateRoom}
                className="bg-blue-500 text-white p-2 rounded-2xl w-1/2"
              >
                Create Room
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-red-500 p-2 w-1/3 rounded-2xl"
              >
                Cancel
              </button>
            </span>
          </div>
        </div>
      )}

      {inviteLink && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-primary-light text-darkAccent-dark p-4 rounded-2xl shadow-md">
          <p className="text-lg">Share this invite link:</p>
          <p className="text-sm">{inviteLink}</p>
        </div>
      )}

      {isRestaurantModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-primary-light p-6 rounded-2xl shadow-md w-80">
            <h2 className="text-xl font-semibold mb-4 text-text-light">
              Add a Restaurant
            </h2>
            <input
              type="text"
              value={newRestaurant}
              onChange={(e) => setNewRestaurant(e.target.value)}
              placeholder="Restaurant Name"
              className="border p-2 rounded-2xl w-full mb-4 placeholder:text-text-light text-text-dark"
            />
            <button
              onClick={handleAddRestaurant}
              className="bg-primary-light w-full text-darkAccent-dark p-2 rounded-2xl"
            >
              Add Restaurant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
