import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseServices } from "./client";

export interface FirebaseSession {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
}

export type SessionListener = (session: FirebaseSession | null) => void;

export function sessionIdentityChanged(
  previous: FirebaseSession | null,
  next: FirebaseSession | null
): boolean {
  return previous?.uid !== next?.uid;
}

function toSession(user: User | null): FirebaseSession | null {
  if (!user) return null;
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName,
    email: user.email,
  };
}

export class FirebaseAuthSessionService {
  constructor(private readonly auth: Auth = getFirebaseServices().auth) {}

  current(): FirebaseSession | null {
    return toSession(this.auth.currentUser);
  }

  waitForInitialState(): Promise<FirebaseSession | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => {
          unsubscribe();
          resolve(toSession(user));
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  subscribe(listener: SessionListener, onError?: (error: Error) => void): () => void {
    return onAuthStateChanged(
      this.auth,
      (user) => listener(toSession(user)),
      (error) => onError?.(error)
    );
  }

  async ensureAnonymousPlayer(): Promise<FirebaseSession> {
    const current = this.auth.currentUser;
    if (current) return toSession(current) as FirebaseSession;

    const credential = await signInAnonymously(this.auth);
    return toSession(credential.user) as FirebaseSession;
  }

  async signInDurableGm(): Promise<FirebaseSession> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(this.auth, provider);
    const session = toSession(credential.user) as FirebaseSession;
    if (session.isAnonymous) {
      throw new Error("O login do proprietário precisa usar uma conta permanente.");
    }
    return session;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
