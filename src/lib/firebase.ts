
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // For later use (e.g., saving diagnosis history)
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

let firebaseMisconfigured = false;

if (!apiKey) {
  console.error(
    `🟥 CRITICAL FIREBASE CONFIGURATION ERROR 🟥
    ------------------------------------------------------------------------------------
    Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or UNDETECTED.
    Firebase services (like Authentication) WILL NOT WORK.

    TO FIX THIS:
    1. Ensure you have a file named '.env' in the ROOT directory of your project.
       (This is the same level as your 'package.json' file).
    2. Inside the '.env' file, add the following line (replace with YOUR actual key):
       NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_ACTUAL_API_KEY_FROM_FIREBASE_CONSOLE
    3. **VERY IMPORTANT**: You MUST RESTART your Next.js development server
       (e.g., stop the server with Ctrl+C and re-run 'npm run dev' or 'yarn dev')
       after creating or modifying the .env file for changes to take effect.
    ------------------------------------------------------------------------------------`
  );
  firebaseMisconfigured = true;
}

if (!authDomain) {
  console.warn(
    `🟧 FIREBASE CONFIGURATION WARNING 🟧
    Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing from your .env file.
    Authentication functionalities might not work as expected. Please add it to your .env file
    and RESTART your Next.js server.`
  );
  firebaseMisconfigured = true;
}

if (!projectId) {
  console.warn(
    `🟧 FIREBASE CONFIGURATION WARNING 🟧
    Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing from your .env file.
    This is crucial for Firebase services. Please add it to your .env file
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

let app: FirebaseApp;
let auth: Auth;
// let db: Firestore; // For later use
// let analytics: Analytics; // Optional

// Attempt to initialize Firebase only if not critically misconfigured,
// though Firebase SDK might still throw its own errors for incomplete configs.
// The main goal of the checks above is to provide clear user guidance.
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
// db = getFirestore(app); // For later use
// if (typeof window !== 'undefined' && !firebaseMisconfigured) { // Ensure analytics only run on client and if base config seems okay
//   try {
//     analytics = getAnalytics(app); // Optional
//   } catch (e) {
//     console.warn("Firebase Analytics initialization failed. This is optional.", e);
//   }
// }

if (firebaseMisconfigured) {
    console.warn("🚨 Due to the Firebase configuration errors/warnings above, HealthAssist AI's features relying on Firebase (like login, signup, data storage) may not work correctly or at all. Please check your .env file and restart the server. 🚨");
}

export { app, auth /*, db, analytics */ };
