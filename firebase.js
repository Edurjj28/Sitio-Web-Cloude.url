// Inicialización de Firebase y referencias a colecciones
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, APP_ID } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const base = ["artifacts", APP_ID, "public", "data"];
export const projectsCol = collection(db, ...base, "projects");
export const votesCol = collection(db, ...base, "votes");
export const rutRegistryCol = collection(db, ...base, "rut_votes");
export const metaDocRef = doc(db, ...base, "meta", "config");

// Re-exportamos lo que usan los demás módulos
export { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
export {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  onSnapshot, runTransaction, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
