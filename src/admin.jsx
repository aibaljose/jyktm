import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');
  const [assignments, setAssignments] = useState({});

  // Fetch all users on component mount
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
      
      // Create a map of current assignments for display
      const currentAssignments = {};
      usersList.forEach((user) => {
        if (user.assigned_id) {
          const assignedUser = usersList.find((u) => u.id === user.assigned_id);
          if (assignedUser) {
            currentAssignments[user.id] = assignedUser;
          }
        }
      });
      setAssignments(currentAssignments);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage('❌ Error loading users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const shuffleAndAssign = async () => {
    if (users.length < 2) {
      setMessage('⚠️ Need at least 2 users to assign friends');
      return;
    }

    try {
      setAssigning(true);
      setMessage('🎅 Shuffling friends...');

      // Create a shuffled array
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

      // Assign each user to the next user in shuffled array (circular)
      const updatePromises = shuffledUsers.map((user, index) => {
        const assignedFriend = shuffledUsers[(index + 1) % shuffledUsers.length];
        return setDoc(
          doc(db, 'users', user.id),
          { assigned_id: assignedFriend.id },
          { merge: true }
        );
      });

      await Promise.all(updatePromises);

      // Update local assignments display
      const newAssignments = {};
      shuffledUsers.forEach((user, index) => {
        const assignedFriend = shuffledUsers[(index + 1) % shuffledUsers.length];
        newAssignments[user.id] = assignedFriend;
      });
      setAssignments(newAssignments);

      setMessage('✅ Friends shuffled and assigned successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error shuffling friends:', error);
      setMessage('❌ Error assigning friends: ' + error.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-600 via-rose-600 to-red-700 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-extrabold text-white drop-shadow-lg mb-2">
            🎅 Christmas Friend Admin
          </h1>
          <p className="text-white/90 text-lg">Manage and assign Christmas friends</p>
        </motion.div>

        {/* Message Alert */}
        {message && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/20 backdrop-blur-xl border border-white/30 text-white p-4 rounded-lg mb-6 text-center font-semibold"
          >
            {message}
          </motion.div>
        )}

        {/* Shuffle Button */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <button
            onClick={shuffleAndAssign}
            disabled={loading || assigning}
            className="px-8 py-3 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-lg"
          >
            {assigning ? '🔄 Shuffling...' : '🎁 Shuffle & Assign Friends'}
          </button>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
            <h2 className="text-xl font-bold text-white">
              Members & Assignments ({users.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-red-300 mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading members...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 font-semibold">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-800">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-800">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-800">Assigned Friend</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-800">Friend Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const assignedFriend = assignments[user.id];
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-gray-900 font-semibold">{user.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-700">📞 {user.phone || 'N/A'}</td>
                        <td className="px-6 py-4">
                          {assignedFriend ? (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold text-sm">
                              🎄 {assignedFriend.name}
                            </span>
                          ) : (
                            <span className="text-gray-500">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {assignedFriend ? `📞 ${assignedFriend.phone || 'N/A'}` : '-'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-white/20 backdrop-blur-xl border border-white/30 text-white p-6 rounded-lg text-center"
        >
          <p className="font-semibold mb-2">ℹ️ How it works:</p>
          <p className="text-white/90">
            Click the "Shuffle & Assign Friends" button to randomly assign each member a friend. 
            Each member will be assigned to a different friend, and the assignments will be saved to the database.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
