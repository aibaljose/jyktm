// src/Home.js
import React, { useState, useMemo, useEffect } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake } from "lucide-react";
import bg from "./assets/bg.png";
import bgg from "./assets/bgg.png";
import { auth } from "./firebase";
import { db } from "./firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useLocation } from "react-router-dom";

const ANIMATION = {
  santaEnter: {
    initial: { y: 180, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -180, opacity: 0 },
    transition: { duration: 1.1, ease: "easeOut" },
  },
  revealCard: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

const Home = ({ user }) => {
  const location = useLocation();
  console.log("Query string:", location.search);

  // STATE DECLARATIONS
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [currentTask, setCurrentTask] = useState("Call a friend you haven't spoken to in a while");
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [customTask, setCustomTask] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [assignedFriend, setAssignedFriend] = useState(null);
  const [loadingFriend, setLoadingFriend] = useState(false);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // SNOWFLAKES MEMOIZATION
  const snowflakes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * viewport.width,
        duration: 10 + Math.random() * 6,
      })),
    [viewport.width]
  );

  const storeAccessLog = async () => {
    try {
      const accessLogRef = doc(db, "accessLogs", Date.now().toString());
      await setDoc(accessLogRef, {
        queryString: location.search,
        pathname: location.pathname,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || "direct"
      });
      console.log("Access log stored successfully");
    } catch (error) {
      console.error("Error storing access log:", error);
    }
  };

  React.useEffect(() => {
    // storeAccessLog();
  }, [location.search]);

  useEffect(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // Check if logged-in user has complete registration
  React.useEffect(() => {
    if (user) {
      setIsCheckingRegistration(true);
      const checkUserRegistration = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.phone && userData.name) {
              setIsRegistrationComplete(true);
              setShowAdditionalFields(false);
              setTempUser(null);
              setShowInstructionsModal(true); // Show instructions modal for returning users
              // Load today's task and assigned friend
              setTimeout(() => {
                loadTodayTask();
                loadAssignedFriend();
              }, 1000);
            } else {
              // User missing data - show additional fields
              setTempUser(user);
              setShowAdditionalFields(true);
              setIsRegistrationComplete(false);
            }
          } else {
            // User doc doesn't exist - show additional fields
            setTempUser(user);
            setShowAdditionalFields(true);
            setIsRegistrationComplete(false);
          }
        } catch (error) {
          console.error("Error checking user registration:", error);
        } finally {
          setIsCheckingRegistration(false);
        }
      };
      checkUserRegistration();
    } else {
      // Reset states when user logs out
      setIsRegistrationComplete(false);
      setShowAdditionalFields(false);
      setTempUser(null);
      setIsCheckingRegistration(false);
    }
  }, [user]);


  // TASK MANAGEMENT FUNCTIONS
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  const saveTaskCompletion = async (taskText, completed) => {
    if (!user) return;
    
    try {
      const todayDate = getTodayDateString();
      const taskDocRef = doc(db, "tasks", `${user.uid}_${todayDate}`);
      
      await setDoc(taskDocRef, {
        userId: user.uid,
        userName: user.displayName,
        date: todayDate,
        task: taskText,
        completed: completed,
        completedAt: completed ? new Date() : null,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log("Task completion saved successfully");
    } catch (error) {
      console.error("Error saving task completion:", error);
    }
  };

  const loadTodayTask = async () => {
    if (!user) return;
    
    try {
      const todayDate = getTodayDateString();
      const taskDocRef = doc(db, "tasks", `${user.uid}_${todayDate}`);
      const taskDoc = await getDoc(taskDocRef);
      
      if (taskDoc.exists()) {
        const taskData = taskDoc.data();
        setCurrentTask(taskData.task || "Call a friend you haven’t spoken to in a while");
        setIsTaskCompleted(taskData.completed || false);
      } else {
        // No task for today, use default
        setCurrentTask("Call a friend you haven’t spoken to in a while");
        setIsTaskCompleted(false);
      }
    } catch (error) {
      console.error("Error loading today's task:", error);
    }
  };

  const loadAssignedFriend = async () => {
    if (!user) return;
    
    try {
      setLoadingFriend(true);
      // Get current user's document to find assigned_id
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const assignedId = userData.assigned_id;
        
        if (assignedId) {
          // Fetch the assigned friend's details
          const friendDoc = await getDoc(doc(db, "users", assignedId));
          
          if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            setAssignedFriend({
              name: friendData.name || "Your Friend",
              mobile: friendData.mobile || ""
            });
          } else {
            console.log("Assigned friend not found");
            setAssignedFriend(null);
          }
        }
      }
    } catch (error) {
      console.error("Error loading assigned friend:", error);
    } finally {
      setLoadingFriend(false);
    }
  };

  // GOOGLE SIGN IN
  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // New user - show additional fields for phone and name
        setTempUser(user);
        setShowAdditionalFields(true);
        setIsRegistrationComplete(false);
      } else {
        // User already exists in database - proceed regardless of complete data
        setIsRegistrationComplete(true);
        setShowAdditionalFields(false);
        setTempUser(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // CHECK UNIQUENESS
  async function checkUniqueness(phone, name) {
    try {
      // Check phone number uniqueness
      const phoneQuery = query(
        collection(db, "users"),
        where("phone", "==", phone)
      );
      const phoneSnapshot = await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        return { isUnique: false, error: "Phone number is already registered" };
      }

      return { isUnique: true, error: null };
    } catch (error) {
      console.error("Error checking uniqueness:", error);
      return { isUnique: false, error: "Error validating data. Please try again." };
    }
  }

  // COMPLETE REGISTRATION
  async function handleCompleteRegistration(e) {
    e.preventDefault();
    setError("");

    if (!tempUser) {
      setError("Please sign in with Google first");
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10 || cleanPhone.length > 15) {
      return setError("Please enter a valid phone number (10-15 digits)");
    }

    // Validate name (basic validation)
    if (!name.trim()) {
      return setError("Please enter your name");
    }

    try {
      setLoading(true);
      setError("Checking if phone number is available...");

      // Check uniqueness
      const uniquenessCheck = await checkUniqueness(cleanPhone, name.trim());

      if (!uniquenessCheck.isUnique) {
        return setError(uniquenessCheck.error);
      }

      setError("Creating your account...");

      // Save user data to Firestore
      await setDoc(doc(db, "users", tempUser.uid), {
        uid: tempUser.uid,
        email: tempUser.email,
        phone: cleanPhone,
        name: name.trim(),
        createdAt: new Date()
      });

      // Clear form and state - user will be automatically logged in
      setShowAdditionalFields(false);
      setTempUser(null);
      setPhone("");
      setName("");
      setError(""); // Clear any loading messages
      setIsRegistrationComplete(true); // Mark registration as complete
      setShowInstructionsModal(true); // Show instructions modal for new users
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // LOGOUT
  async function handleLogout() {
    try {
      await signOut(auth);
      // Reset all states
      setIsRegistrationComplete(false);
      setShowAdditionalFields(false);
      setTempUser(null);
      setPhone("");
      setName("");
      setError("");
      setIsCheckingRegistration(false);
      setShowInstructionsModal(false);
      setCurrentTask("Call a friend you haven’t spoken to in a while");
      setIsTaskCompleted(false);
      setCustomTask("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (user && isCheckingRegistration) {
    return (
      <div className="min-h-screen flex justify-center items-center p-3 sm:p-6 bg-gradient-to-b from-red-600 via-rose-600 to-red-700">
        <div className="relative bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md border border-red-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-red-700 font-semibold text-sm sm:text-base">Checking your registration...</p>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED-IN SCREEN - Only show if user is authenticated AND has completed registration
  if (user && isRegistrationComplete) {
    return (
      <section
        aria-label="Santa Christmas Friend Reveal"
        className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#0b1d3a] via-[#12345f] to-[#1b5e20] flex items-center justify-center"
      >
        {/* Snow Layer */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {snowflakes.map((flake) => (
            <motion.div
              key={flake.id}
              className="absolute text-white/60"
              initial={{ y: -20, x: flake.x }}
              animate={{ y: viewport.height + 40 }}
              transition={{ duration: flake.duration, repeat: Infinity }}
            >
              <Snowflake size={14} />
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="santa"
              {...ANIMATION.santaEnter}
              className="relative z-10 text-center bg-white/15 backdrop-blur-xl px-4 sm:px-8 md:px-10 py-8 sm:py-12 md:py-14 rounded-xl sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-[90%] sm:max-w-sm md:max-w-md border border-white/20"
            >
              <motion.img
                src={bgg}
                alt="Santa Claus illustration"
                className="mx-auto w-24 sm:w-28 md:w-36 mb-4 sm:mb-5 md:mb-6"
                initial={{ scale: 0.9, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-lg mb-2">
                  Ho Ho Ho! 🎅
                </h1>
                <div className="h-1 w-12 sm:w-14 md:w-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full mx-auto mb-4 sm:mb-5 md:mb-6"></div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-xs sm:text-sm md:text-base leading-relaxed font-medium px-2"
              >
                Santa has arrived with a special Christmas assignment just for you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2 sm:space-y-3 mt-6 sm:mt-8 md:mt-10"
              >
                <motion.button
                  aria-label="Reveal Christmas Friend"
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(220, 38, 38, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRevealed(true)}
                  className="w-full px-5 sm:px-8 py-2 sm:py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base min-h-[44px]"
                >
                  🎁 Reveal My Friend
                </motion.button>

                <motion.button
                  aria-label="Logout"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-full px-5 sm:px-8 py-2 sm:py-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50 text-xs sm:text-sm md:text-base min-h-[44px]"
                >
                  🚪 Logout
                </motion.button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              {...ANIMATION.revealCard}
              className="relative z-10 bg-gradient-to-br from-white via-white to-gray-50 px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 rounded-xl sm:rounded-2xl shadow-2xl text-center max-w-[90%] sm:max-w-sm md:max-w-md border border-gray-200"
            >
              {/* Header Section */}
              <div className="mb-6 sm:mb-7 md:mb-8 pb-4 sm:pb-5 md:pb-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-xl font-bold text-gray-900 tracking-tight px-2">
                Your Christmas Friend
                </h2>
              </div>

              {/* Content Section */}
              {loadingFriend ? (
                <div className="mt-6 sm:mt-8 text-center py-8 sm:py-10 md:py-12">
                  <div className="animate-spin rounded-full h-8 sm:h-10 w-8 sm:w-10 border-2 border-red-600 border-t-red-300 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Loading friend details...</p>
                </div>
              ) : assignedFriend ? (
                <>
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 0.3 }}
                    className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6"
                  >
                    <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-700 break-words leading-tight">
                      {assignedFriend.name}
                    </p>
                  </motion.div>

                  {assignedFriend.mobile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gray-100 rounded-lg p-3 sm:p-4 md:p-4 mb-4 sm:mb-5 md:mb-6"
                    >
                      <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2">Contact</p>
                      <p className="text-base sm:text-lg font-semibold text-gray-900">
                        📞 {assignedFriend.mobile}
                      </p>
                    </motion.div>
                  )}

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-700 text-xs sm:text-sm md:text-sm leading-relaxed font-medium mb-6 sm:mb-7 md:mb-8 px-2"
                  >
                    Santa has chosen this special friend for you. Spread kindness, joy, and a little magic this season.
                  </motion.p>
                </>
              ) : (
                <div className="py-8 sm:py-10 md:py-12">
                  <p className="text-gray-500 text-sm sm:text-base font-medium">
                    ❌ No friend assigned yet
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3 mt-6 sm:mt-7 md:mt-8">
                <motion.button
                  aria-label="Return to Santa"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRevealed(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]"
                >
                  ⬅️ Back to Santa
                </motion.button>

                <motion.button
                  aria-label="Logout"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 sm:py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm min-h-[44px]"
                >
                  🚪 Logout
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  // LOGIN / REGISTER SCREEN
  return (
    <div className="min-h-screen flex justify-center items-center p-6 bg-gradient-to-b from-red-600 via-rose-600 to-red-700 relative overflow-hidden">

      {/* ❄ Snowfall */}
      <div className="snow">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: Math.random() * 100 + "vw",
              animationDuration: 2 + Math.random() * 5 + "s",
              animationDelay: Math.random() * 5 + "s",
              opacity: 0.5 + Math.random() * 0.5
            }}
          ></span>
        ))}
      </div>

      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607796991940-53331d31ee6d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] opacity-20"></div>

      <div className="relative bg-white backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-red-300">
        <img src={bg} alt="Background" />


        <h1 className="text-[18px] font-extrabold text-center text-red-700  drop-shadow-lg mb-2">
          JY Christmas Friend
        </h1>

        {!showAdditionalFields ? (
          <>

            <h2 className="text-2xl font-extrabold text-center text-red-400 mb-4">
              Welcome!
            </h2>

            {error && (
              <p className="text-red-600 text-sm text-center mt-2 font-semibold">{error}</p>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white border-2 border-red-300 text-gray-700 p-3 rounded-lg mt-6 shadow-lg hover:bg-gray-50 transition-all font-semibold flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl text-center text-dark-700 mb-4">
              Complete Your Registration
            </h2>

            {error && (
              <p className="text-red-600 text-sm text-center mt-2 font-semibold">{error}</p>
            )}

            <form onSubmit={handleCompleteRegistration}>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 mt-4 rounded-lg border-2 border-red-300 bg-white/70"
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-3 mt-4 rounded-lg border-2 border-red-300 bg-white/70"
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-red-600 text-white p-3 rounded-lg mt-6 shadow-lg hover:scale-[1.02]"
              >
                {loading ? "Completing..." : "Complete Registration"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
