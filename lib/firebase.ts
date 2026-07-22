import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth"; 
import { getStorage } from "firebase/storage";

console.log("=== DEBUG FIREBASE CONFIG ===");
console.log("API KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("PROJECT ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("=============================");

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicialização segura para servidor e cliente
const db = !getApps().length 
  ? initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
  : getFirestore(app);

export { db };
export const auth = getAuth(app);
export const storage = getStorage(app);

// Persistência de auth apenas no cliente
if (typeof window !== "undefined") {
  setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error("Erro ao definir persistência de sessão:", error);
  });
}