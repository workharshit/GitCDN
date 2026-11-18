import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { OperationType, FirestoreErrorInfo } from "./types";

let app: any = null;
let auth: any = null;
let db: any = null;
let rtdb: any = null;

const storedConfig = typeof window !== "undefined" ? localStorage.getItem("GIT_CDN_FIREBASE_CONFIG") : null;

if (storedConfig) {
  try {
    const config = JSON.parse(storedConfig);
    if (config.apiKey && config.projectId) {
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      auth = getAuth(app);
      db = getFirestore(app);
      if (config.databaseURL && config.databaseURL.trim().length > 0) {
        rtdb = getDatabase(app, config.databaseURL.trim());
      }
    }
  } catch (err) {
    console.error("Failed to initialize dynamic Firebase connection:", err);
  }
}

export { app, auth, db, rtdb };

// Helper is initialized check
export function isFirebaseConfigured(): boolean {
  return !!auth;
}

// Persist user firebase credentials
export function saveFirebaseConfig(config: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("GIT_CDN_FIREBASE_CONFIG", JSON.stringify(config));
    window.location.reload();
  }
}

// Log out and clear local definitions
export function clearFirebaseConfig() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GIT_CDN_FIREBASE_CONFIG");
    localStorage.removeItem("GIT_CDN_SYSTEM_SETTINGS");
    window.location.reload();
  }
}

// Custom Firestore error handler that converts errors to rich, serializable debug JSON
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error("Firebase Custom Error Triggered:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, "test_connection", "connection_status"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Dynamic Firebase connection diagnostics offline.");
    }
  }
}
