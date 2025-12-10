import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDS3qMVjUiJo7xWGMNnPD24g39o5_Xf84U",
  authDomain: "smartcal-4ddce.firebaseapp.com",
  projectId: "smartcal-4ddce",
  storageBucket: "smartcal-4ddce.firebasestorage.app",
  messagingSenderId: "335166793360",
  appId: "1:335166793360:web:c8bba7acfd3617d8bb1a15",
  measurementId: "G-5P4MQ8TPYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);