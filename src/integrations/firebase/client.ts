import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { parseFirebaseEnvironment } from "./environment";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let services: FirebaseServices | null = null;
let emulatorsConnected = false;

/** Initializes the public Firebase client once for each extension iframe. */
export function getFirebaseServices(): FirebaseServices {
  if (services) return services;

  const environment = parseFirebaseEnvironment();
  const app = getApps().length > 0 ? getApp() : initializeApp(environment.options);
  const auth = getAuth(app);
  const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  if (environment.useEmulators && !emulatorsConnected) {
    connectAuthEmulator(auth, environment.authEmulatorUrl, { disableWarnings: true });
    connectFirestoreEmulator(
      firestore,
      environment.firestoreEmulatorHost,
      environment.firestoreEmulatorPort
    );
    emulatorsConnected = true;
  }

  services = { app, auth, firestore };
  return services;
}

export function timestampToIso(value: unknown): string {
  if (!(value instanceof Timestamp)) {
    throw new Error("Timestamp do Firestore ausente ou inválido.");
  }
  return value.toDate().toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { serverTimestamp };
