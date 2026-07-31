import type { FirebaseOptions } from "firebase/app";
import { z } from "zod";

const hostSchema = z.string().regex(/^[a-zA-Z0-9.-]+:\d+$/, "deve usar o formato host:porta");

const firebaseEnvironmentSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_FIREBASE_USE_EMULATORS: z.enum(["true", "false"]).optional().default("false"),
  VITE_FIREBASE_AUTH_EMULATOR_HOST: hostSchema.optional().default("127.0.0.1:9099"),
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: hostSchema.optional().default("127.0.0.1:8080"),
});

export interface FirebaseEnvironment {
  options: FirebaseOptions;
  useEmulators: boolean;
  authEmulatorUrl: string;
  firestoreEmulatorHost: string;
  firestoreEmulatorPort: number;
}

/**
 * Valida somente a configuração pública do Firebase Web App. Os valores não
 * são incluídos em mensagens de erro para evitar vazamento acidental em logs.
 */
export function parseFirebaseEnvironment(
  env: Record<string, string | boolean | undefined> = import.meta.env
): FirebaseEnvironment {
  const result = firebaseEnvironmentSchema.safeParse(env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Configuração pública do Firebase inválida: ${fields.join(", ")}.`);
  }

  const authEmulatorUrl = `http://${result.data.VITE_FIREBASE_AUTH_EMULATOR_HOST}`;
  const [firestoreEmulatorHost, firestorePort] =
    result.data.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST.split(":");

  return {
    options: {
      apiKey: result.data.VITE_FIREBASE_API_KEY,
      authDomain: result.data.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: result.data.VITE_FIREBASE_PROJECT_ID,
      storageBucket: result.data.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: result.data.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: result.data.VITE_FIREBASE_APP_ID,
    },
    useEmulators: result.data.VITE_FIREBASE_USE_EMULATORS === "true",
    authEmulatorUrl,
    firestoreEmulatorHost,
    firestoreEmulatorPort: Number(firestorePort),
  };
}
