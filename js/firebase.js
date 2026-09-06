import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKxEADoLyo6e4MfNyVbkRo3UpnKrkdW8M",
  authDomain: "cloudstock-1811a.firebaseapp.com",
  projectId: "cloudstock-1811a",
  storageBucket: "cloudstock-1811a.firebasestorage.app",
  messagingSenderId: "355087932",
  appId: "1:355087932:web:31c55cc112d57168083539"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };