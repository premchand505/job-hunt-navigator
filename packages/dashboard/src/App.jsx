import React, { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';

// A simple confirmation modal component
const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
  // ... (This component is unchanged)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); 
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
        setJobs([]);
        return;
    };

    setLoading(true);
    const q = query(collection(db, "jobs"), where("userId", "==", user.uid));

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const jobsData = [];
      querySnapshot.forEach((doc) => {
        jobsData.push({ id: doc.id, ...doc.data() });
      });
      jobsData.sort((a, b) => {
        const dateA = a.dateSaved?.toDate ? a.dateSaved.toDate() : new Date(0);
        const dateB = b.dateSaved?.toDate ? b.dateSaved.toDate() : new Date(0);
        return dateB - dateA;
      });
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]);
  
  // --- NEW: Sign-in and Sign-out Handlers ---
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      const jobRef = doc(db, 'jobs', jobToDelete.id);
      await deleteDoc(jobRef);
      console.log(`Job with ID ${jobToDelete.id} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting job: ", error);
    } finally {
      setJobToDelete(null);
      setShowConfirmModal(false);
    }
  };
  
  const openConfirmation = (job) => {
    setJobToDelete(job);
    setShowConfirmModal(true);
  };

  const formatDate = (timestamp) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    return 'Invalid Date';
  };

  if (loading) {
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-xl">Loading...</div>
  }

  // --- NEW: Conditional rendering for login screen ---
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-5xl font-bold mb-4">Job Hunt Navigator</h1>
        <p className="text-xl text-gray-400 mb-8">Please sign in to view your dashboard.</p>
        <button
          onClick={handleSignIn}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <>
      {showConfirmModal && (
        <ConfirmationModal
          message={`Are you sure you want to delete "${jobToDelete?.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white">Job Hunt Navigator</h1>
              <p className="text-lg text-gray-400 mt-1">Your saved job applications.</p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </header>
          
          <main>
            <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Job Title</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Company</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date Saved</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Notes</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                     {jobs.length > 0 ? (
                      jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-700 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold">{job.title}</a>
                            <p className="text-sm text-gray-400">{job.location}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">{job.company}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">{formatDate(job.dateSaved)}</td>
                          <td className="px-6 py-4 text-gray-300 text-sm max-w-xs truncate">{job.quickNotes || 'No notes'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button 
                              onClick={() => openConfirmation(job)}
                              className="text-red-500 hover:text-red-400 font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-10 text-gray-400">
                          No jobs saved yet. Try saving a job from a supported site!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;

