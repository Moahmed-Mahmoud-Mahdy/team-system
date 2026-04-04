// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATKpCYZftbueNBrxIJgVfRxUvv0QF6rOo",
  authDomain: "team-system-b4939.firebaseapp.com",
  projectId: "team-system-b4939",
  storageBucket: "team-system-b4939.firebasestorage.app",
  messagingSenderId: "1078726134264",
  appId: "1:1078726134264:web:4b320b2ddd9eade624ae0d",
  measurementId: "G-WK52NCT97Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
import { getFirestore } from "firebase/firestore";
export const db = getFirestore(app);