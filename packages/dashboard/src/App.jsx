import React, { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // If no user, sign in anonymously for this session
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return; // Don't fetch jobs if there's no user

    setLoading(true);
    // Create a query to get jobs for the current user
    const q = query(collection(db, "jobs"), where("userId", "==", user.uid));

    // Listen for real-time updates
    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const jobsData = [];
      querySnapshot.forEach((doc) => {
        jobsData.push({ id: doc.id, ...doc.data() });
      });
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]); // Re-run this effect when the user changes

  // Helper to format Firestore Timestamps
  const formatDate = (timestamp) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    return 'Invalid Date';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Job Hunt Navigator</h1>
          <p className="text-lg text-gray-400 mt-1">Your saved job applications.</p>
        </header>
        
        <main>
          <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Job Title</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date Saved</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-gray-400">Loading jobs...</td>
                    </tr>
                  ) : jobs.length > 0 ? (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold">{job.title}</a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{job.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{job.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">{formatDate(job.dateSaved)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-gray-400">
                        No jobs saved yet. Try saving a job from Indeed.com!
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
  );
}

export default App;
