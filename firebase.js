import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyC0vmB4UpXMGTj__T7lGUdQIBGfcH_2bJY",
  authDomain: "accessu-e7bd4.firebaseapp.com",
  projectId: "accessu-e7bd4",
  storageBucket: "accessu-e7bd4.firebasestorage.app",
  messagingSenderId: "336518154309",
  appId: "1:336518154309:web:56dea3ac0324a44f8bbb2c",
};

const app = initializeApp(firebaseConfig);

// ✅ بيحفظ الـ auth state حتى لو أقفلت الـ app
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
