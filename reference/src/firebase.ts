/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// This file will be populated by the set_up_firebase tool
// We'll use a try-catch to handle cases where the file isn't ready yet
let firebaseConfig = {};

try {
  // @ts-ignore - this file is generated dynamically
  import("./firebase-applet-config.json").then((config) => {
    firebaseConfig = config.default;
  });
} catch (e) {
  console.warn("Firebase config not found. Please complete the setup.");
}

// Default placeholder config to prevent immediate crashes
const defaultConfig = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder"
};

const app = initializeApp(firebaseConfig || defaultConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();
