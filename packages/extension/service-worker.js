import { db, auth } from './firebase-config.js';
// Add doc and updateDoc to the imports
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"; 
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";

// --- AUTHENTICATION LOGIC (NO CHANGES) ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Hunt Navigator extension installed.');
  authenticateUser();
});

async function authenticateUser() {
    try {
        console.log('Attempting to authenticate user...');
        const tokenResponse = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ 'interactive': true }, (token) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(token);
            });
        });
        if (!tokenResponse) throw new Error('Could not retrieve auth token.');
        const credential = GoogleAuthProvider.credential(null, tokenResponse);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        console.log('Authentication successful!', { displayName: user.displayName, email: user.email, uid: user.uid });
    } catch (error) {
        console.error("Authentication failed:", error.code, error.message);
    }
}

// --- MODIFIED SCRAPING AND SAVING LOGIC ---
chrome.action.onClicked.addListener(async (tab) => {
    if (!auth.currentUser || !tab.id) {
        console.error('User not authenticated or tab ID is missing.');
        return;
    }

    try {
        // Programmatically inject the UI injector script into the page
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/ui-injector.js'],
        });

        // The debugger-based scraping logic remains the same
        const debuggee = { tabId: tab.id };
        await new Promise(resolve => chrome.debugger.attach(debuggee, "1.3", resolve));
        
        const scraperScript = await fetch(chrome.runtime.getURL('content-scripts/scraper.js')).then(r => r.text());
        
        const [result] = await new Promise(resolve => {
            chrome.debugger.sendCommand(debuggee, "Runtime.evaluate", {
                expression: `(${scraperScript})()`,
                awaitPromise: true,
                returnByValue: true
            }, (res) => resolve([res.result.value]));
        });

        await new Promise(resolve => chrome.debugger.detach(debuggee, resolve));

        if (result.error) throw new Error(result.error);
        
        const jobData = result;
        jobData.userId = auth.currentUser.uid;
        jobData.dateSaved = serverTimestamp();

        const docRef = await addDoc(collection(db, "jobs"), jobData);
        console.log("Job saved with ID: ", docRef.id);

        // *** NEW: Send message to the tab to show the modal ***
        chrome.tabs.sendMessage(tab.id, {
            action: 'SHOW_NOTES_MODAL',
            jobId: docRef.id 
        });

    } catch (error) {
        console.error("Error during scraping or saving:", error.message);
        // Ensure debugger is detached even if there's an error
        chrome.debugger.getTargets((targets) => {
            const target = targets.find(t => t.tabId === tab.id && t.attached);
            if (target) {
                chrome.debugger.detach({ tabId: tab.id }, () => console.log('Debugger detached on error.'));
            }
        });
    }
});

// *** NEW: Listen for messages from content scripts (i.e., the modal) ***
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SAVE_NOTE') {
        const { jobId, noteText } = request.payload;
        if (!jobId || !noteText) {
            console.error('Missing jobId or noteText for SAVE_NOTE action');
            return;
        }

        const jobRef = doc(db, 'jobs', jobId);
        updateDoc(jobRef, {
            quickNotes: noteText
        })
        .then(() => {
            console.log(`Note added to job ${jobId}`);
        })
        .catch((error) => {
            console.error(`Failed to add note to job ${jobId}:`, error);
        });
    }
    // Return true to indicate you wish to send a response asynchronously
    // This is good practice for runtime message listeners.
    return true; 
});
