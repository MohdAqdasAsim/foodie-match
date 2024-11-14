import React, { useState, useEffect } from "react";
import TinderCard from "react-tinder-card";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { Link, useParams } from "react-router-dom";

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [user] = useAuthState(auth);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [swiped, setSwiped] = useState<string[]>([]);
  const [matchedRestaurant, setMatchedRestaurant] = useState<string | null>(
    null
  );
  const [progress, setProgress] = useState(0);
  const [roomUserCount, setRoomUserCount] = useState(1);
  const [showPopup, setShowPopup] = useState(false);

  // State to hold restaurants fetched from Firestore
  const [restaurants, setRestaurants] = useState<{ name: string }[]>([]);

  const onSwipe = async (direction: string, restaurantName: string) => {
    if (direction === "right" && user) {
      setSwiped((prev) => [...prev, restaurantName]);
      const restaurantDocRef = doc(
        db,
        "rooms",
        roomId as string,
        "restaurants",
        restaurantName
      );
      await setDoc(restaurantDocRef, {}, { merge: true });
      await updateDoc(restaurantDocRef, { likedBy: arrayUnion(user.uid) });

      const restaurantSnapshot = await getDoc(restaurantDocRef);
      const likedBy = restaurantSnapshot.data()?.likedBy || [];
      const roomRef = doc(db, "rooms", roomId as string);
      const roomDoc = await getDoc(roomRef);
      const roomData = roomDoc.data();
      const roomUserIds = roomData?.userIds || [];

      if (likedBy.length === roomUserIds.length) {
        const sortedLikedBy = likedBy.sort();
        const sortedRoomUserIds = roomUserIds.sort();
        if (
          JSON.stringify(sortedLikedBy) === JSON.stringify(sortedRoomUserIds)
        ) {
          setMatchedRestaurant(restaurantName);
          setShowPopup(true);

          // Clear the restaurant list by deleting all restaurants in this room
          const restaurantsRef = collection(
            db,
            "rooms",
            roomId as string,
            "restaurants"
          );
          const restaurantSnapshot = await getDocs(restaurantsRef);
          restaurantSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
        }
      }

      setProgress((swiped.length / restaurants.length) * 100);
    }
  };

  useEffect(() => {
    if (!roomId || !user) return;

    const roomRef = doc(db, "rooms", roomId as string);

    const joinRoom = async () => {
      await updateDoc(roomRef, { userIds: arrayUnion(user.uid) });
    };

    const leaveRoom = async () => {
      await updateDoc(roomRef, { userIds: arrayRemove(user.uid) });

      const roomDoc = await getDoc(roomRef);
      const roomData = roomDoc.data();
      const remainingUsers = roomData?.userIds || [];

      if (remainingUsers.length === 0) {
        const restaurantsRef = collection(
          db,
          "rooms",
          roomId as string,
          "restaurants"
        );
        const restaurantsSnapshot = await getDocs(restaurantsRef);
        restaurantsSnapshot.forEach(async (restaurantDoc: any) => {
          await deleteDoc(restaurantDoc.ref);
        });
      }
    };

    joinRoom();

    const fetchRoomData = async () => {
      onSnapshot(roomRef, async (roomSnapshot) => {
        const roomData = roomSnapshot.data();
        if (roomData) {
          setRoomName(roomData.displayName || "Unnamed Room");
          setCity(roomData.city || "City Not Chosen");
          setOwnerId(roomData.createdBy || "");

          const userProfiles = await Promise.all(
            (roomData.userIds || []).map(async (userId: string) => {
              const userRef = doc(db, "users", userId);
              const userSnapshot = await getDoc(userRef);

              return {
                id: userId,
                name: userSnapshot.data()?.displayName || "Unknown",
              };
            })
          );
          setUsers(userProfiles);
        }
      });
    };

    fetchRoomData();

    // Fetch restaurants from Firestore
    const fetchRestaurants = async () => {
      if (!roomId) return;

      try {
        const roomRef = doc(db, "rooms", roomId as string);
        const roomSnapshot = await getDoc(roomRef);

        if (roomSnapshot.exists()) {
          const roomData = roomSnapshot.data();

          // Assuming `restaurants` is an array of restaurant names stored in the document
          const fetchedRestaurants = (roomData.restaurants || []).map(
            (restaurantName: string) => ({
              name: restaurantName,
            })
          );

          setRestaurants(fetchedRestaurants);
        } else {
          console.log("Room does not exist");
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();

    const handleBeforeUnload = () => leaveRoom();
    window.addEventListener("beforeunload", handleBeforeUnload);

    const roomDocRef = doc(db, "rooms", roomId as string);
    const unsubscribeRoom = onSnapshot(roomDocRef, (snapshot) => {
      const roomData = snapshot.data();
      const userIds = roomData?.userIds || [];
      setRoomUserCount(userIds.length);
    });

    const restaurantsRef = collection(
      db,
      "rooms",
      roomId as string,
      "restaurants"
    );
    const unsubscribeRestaurants = onSnapshot(
      restaurantsRef,
      async (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.likedBy?.length === roomUserCount) {
            setMatchedRestaurant(doc.id);
          }
        });
      }
    );

    return () => {
      leaveRoom();
      unsubscribeRoom();
      unsubscribeRestaurants();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, user]);

  const closePopup = () => {
    setShowPopup(false);
    setMatchedRestaurant(null);
  };

  return (
    <>
      <div className="p-2 bg-[#bb7246] text-white">
        <span className="pb-1 w-full items-center justify-between flex flex-row border-b-2 border-[#ffffff85]">
          <Link to="/dashboard">
            <span>
              <img
                src="../src/assets/back.svg"
                alt="back"
                className="w-4 h-4"
              />
            </span>
          </Link>
          <h2 className="text-lg font-semibold">
            {roomName || "Unnamed Room"}
          </h2>
          <h2 className="text-lg font-semibold">{city || "City Not Chosen"}</h2>
        </span>
        <div className="p-2 flex flex-row flex-wrap justify-between items-center">
          <span>
            {users.length > 0 ? (
              users.map((user) => (
                <span
                  key={user.id}
                  className={`p-2 bg-darkAccent-light rounded-2xl ${
                    user.id === ownerId ? "font-bold" : ""
                  }`}
                >
                  {user.name} {user.id === ownerId && "(Host)"}
                </span>
              ))
            ) : (
              <li className="p-2">No users found in this room.</li>
            )}
          </span>
          <span className="flex flex-row gap-1 rounded-2xl bg-[#f2ab27] px-3 py-1">
            <h2 className="text-lg font-semibold">Invite</h2>
            <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full">
              <img
                src="../src/assets/invite.svg"
                alt="invite"
                className="w-4 h-4"
              />
            </span>
          </span>
        </div>
      </div>

      {showPopup && (
        <div className="fixed top-0 left-0 w-full h-full bg-[#76482b] bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-darkAccent-light p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-xl font-bold text-center mb-4">Match Found!</h3>
            <p className="text-center">
              You all agreed on <strong>{matchedRestaurant}</strong>!
            </p>
            <button
              onClick={closePopup}
              className="mt-4 bg-[#bb7246] text-white px-4 py-2 rounded-full w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="p-6 bg-[#ea8444db] min-h-screen text-white flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Swipe Restaurants</h1>
        <div className="w-full max-w-md bg-[#bb7246] h-2 rounded mb-4">
          <div
            className="bg-[#ff9d00] h-full rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="w-full max-w-md relative">
          {restaurants.map((restaurant, index) => (
            <TinderCard
              key={index}
              className={`absolute w-full h-[300px] flex justify-center z-10`}
              onSwipe={(dir) => onSwipe(dir, restaurant.name)}
            >
              <div className="flex justify-center items-center w-full h-full bg-[#bb7246] rounded-lg">
                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
              </div>
            </TinderCard>
          ))}
        </div>
      </div>
    </>
  );
};

export default Room;
