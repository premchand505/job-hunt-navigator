import React, { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, Timestamp, doc, deleteDoc, writeBatch } from 'firebase/firestore';

// A simple confirmation modal component
const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Confirm Action</h3>
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
  const [itemToDelete, setItemToDelete] = useState(null); // Can be a single job or an array for batch
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobs, setSelectedJobs] = useState([]); // <-- NEW: State for selected job IDs

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
      // --- FIX: Robust sorting ---
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
  
  // --- FIX: Implemented Sign-in and Sign-out Handlers ---
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

  // --- MODIFIED: handleDelete can now handle single or batch deletes ---
  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (Array.isArray(itemToDelete)) { // Batch delete
        const batch = writeBatch(db);
        itemToDelete.forEach(jobId => {
          const jobRef = doc(db, 'jobs', jobId);
          batch.delete(jobRef);
        });
        await batch.commit();
        console.log(`${itemToDelete.length} jobs deleted successfully.`);
        setSelectedJobs([]); // Clear selection
      } else { // Single delete
        const jobRef = doc(db, 'jobs', itemToDelete.id);
        await deleteDoc(jobRef);
        console.log(`Job with ID ${itemToDelete.id} deleted successfully.`);
      }
    } catch (error) {
      console.error("Error deleting job(s): ", error);
    } finally {
      setItemToDelete(null);
      setShowConfirmModal(false);
    }
  };
  
  const openConfirmation = (item) => {
    setItemToDelete(item);
    setShowConfirmModal(true);
  };

  const formatDate = (timestamp) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    return 'Invalid Date';
  };

  // --- NEW: Handlers for checkboxes ---
  const handleSelectJob = (jobId) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedJobs(filteredJobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  };


  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) { 
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-xl">Loading...</div>
  }
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
          message={
            Array.isArray(itemToDelete)
              ? `Are you sure you want to delete ${itemToDelete.length} selected jobs? This action cannot be undone.`
              : `Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`
          }
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-center flex-wrap gap-4">
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
          
          <div className="mb-6 flex justify-between items-center gap-4 flex-wrap">
            {/* --- Search Bar --- */}
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search by title, company, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            
            {/* --- NEW: Batch Delete Button --- */}
            {selectedJobs.length > 0 && (
              <button
                onClick={() => openConfirmation(selectedJobs)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-5 rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
                Delete Selected ({selectedJobs.length})
              </button>
            )}
          </div>

          <main>
            <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      {/* --- NEW: Select All Checkbox --- */}
                      <th scope="col" className="p-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                          onChange={handleSelectAll}
                          checked={filteredJobs.length > 0 && selectedJobs.length === filteredJobs.length}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Job Title</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Company</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date Saved</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Notes</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {loading ? ( 
                      <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading jobs...</td></tr>
                    ) : filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => (
                        <tr key={job.id} className={`${selectedJobs.includes(job.id) ? 'bg-gray-700' : ''} hover:bg-gray-700/50 transition-colors duration-200`}>
                          {/* --- NEW: Row Checkbox --- */}
                          <td className="p-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                              checked={selectedJobs.includes(job.id)}
                              onChange={() => handleSelectJob(job.id)}
                            />
                          </td>
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
                        <td colSpan="6" className="text-center py-10 text-gray-400">
                          {searchTerm ? `No jobs found for "${searchTerm}"` : "No jobs saved yet."}
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

