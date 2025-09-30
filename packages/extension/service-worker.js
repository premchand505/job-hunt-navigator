// File: packages/extension/service-worker.js

import { auth } from './firebase-config.js';
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";

// This listener is fired when the extension is first installed,
// when the extension is updated to a new version, and when Chrome is updated to a new version.
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Hunt Navigator extension installed.');
  authenticateUser();
});

async function authenticateUser() {
  try {
    console.log('Attempting to authenticate user...');
    const tokenResponse = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 'interactive': true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!tokenResponse) {
      throw new Error('Could not retrieve auth token.');
    }

    const credential = GoogleAuthProvider.credential(null, tokenResponse);
    const result = await signInWithCredential(auth, credential);

    const user = result.user;
    console.log('Authentication successful!', {
      displayName: user.displayName,
      email: user.email,
      uid: user.uid
    });

  } catch (error) {
    console.error("Authentication failed:", error.code, error.message);
  }
}