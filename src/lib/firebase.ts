
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// import { getAuth, type Auth } from 'firebase/auth'; // Commented out: Auth is mocked for prototype
// import { getFirestore, type Firestore } from 'firebase/firestore'; // For later use (e.g., saving diagnosis history)
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

// --- PROTOTYPE NOTICE ---
// Firebase Authentication is currently mocked in src/context/AuthContext.tsx
// for prototype purposes to avoid API key requirements for login/signup.
// If you intend to use real Firebase services (Firestore, Storage, etc.),
// ensure your .env file is correctly configured with the necessary API keys.
// The checks below are for general Firebase initialization, not specific to auth in this prototype version.
// --- END PROTOTYPE NOTICE ---

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

let firebaseMisconfigured = false;

if (!apiKey) {
  console.warn(
    `🟧 FIREBASE CONFIGURATION WARNING (API Key) 🟧
    ------------------------------------------------------------------------------------
    Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or UNDETECTED.
    While authentication is mocked for this prototype, other Firebase services (if used) WILL NOT WORK.

    TO FIX THIS (for other Firebase services):
    1. Ensure you have a file named '.env' in the ROOT directory of your project.
    2. Inside the '.env' file, add: NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_ACTUAL_API_KEY
    3. **IMPORTANT**: RESTART your Next.js development server.
    ------------------------------------------------------------------------------------`
  );
  firebaseMisconfigured = true;
}

if (!authDomain) {
  console.warn(
    `🟧 FIREBASE CONFIGURATION WARNING (Auth Domain) 🟧
    Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing.
    Needed if you enable real Firebase Auth later. Please add it to your .env file
    and RESTART your Next.js server.`
  );
  firebaseMisconfigured = true;
}

if (!projectId) {
  console.warn(
    `🟧 FIREBASE CONFIGURATION WARNING (Project ID) 🟧
    Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing.
    Crucial for any Firebase services. Please add it to your .env file
    and RESTART your Next.js server.`
  );
  firebaseMisconfigured = true;
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId, // Optional
};

let app: FirebaseApp | null = null;
// let auth: Auth; // Commented out: Auth is mocked for prototype
// let db: Firestore; // For later use
// let analytics: Analytics; // Optional

if (!firebaseMisconfigured) {
  if (getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization failed despite config values being present. Error:", e);
      firebaseMisconfigured = true;
    }
  } else {
    app = getApps()[0];
  }
}


// auth = app ? getAuth(app) : null; // Commented out: Auth is mocked
// if (app) {
//   db = getFirestore(app); // For later use
//   if (typeof window !== 'undefined' && !firebaseMisconfigured) {
//     try {
//       analytics = getAnalytics(app); // Optional
//     } catch (e) {
//       console.warn("Firebase Analytics initialization failed. This is optional.", e);
//     }
//   }
// }


if (firebaseMisconfigured) {
    console.warn("🚨 Due to Firebase configuration warnings above, any non-mocked Firebase features may not work correctly. Authentication is currently mocked for this prototype. 🚨");
}

export { app /*, auth , db, analytics */ }; // Auth is not exported
