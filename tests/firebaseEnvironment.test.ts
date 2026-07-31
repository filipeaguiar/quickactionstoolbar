import { describe, expect, it } from "vitest";
import { parseFirebaseEnvironment } from "@/integrations/firebase/environment";

const validEnvironment = {
  VITE_FIREBASE_API_KEY: "public-key",
  VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "example",
  VITE_FIREBASE_APP_ID: "web-app-id",
};

describe("Firebase environment", () => {
  it("maps validated public web configuration", () => {
    const environment = parseFirebaseEnvironment(validEnvironment);

    expect(environment.options.projectId).toBe("example");
    expect(environment.useEmulators).toBe(false);
    expect(environment.authEmulatorUrl).toBe("http://127.0.0.1:9099");
    expect(environment.firestoreEmulatorPort).toBe(8080);
  });

  it("reports invalid field names without echoing values", () => {
    expect(() =>
      parseFirebaseEnvironment({
        ...validEnvironment,
        VITE_FIREBASE_API_KEY: "",
      })
    ).toThrow("VITE_FIREBASE_API_KEY");
  });
});
