// --- CLOCK SKEW PATCH ---
// Monkey-patch Date.now() to subtract 1 hour to fix Firebase Auth UNAUTHENTICATED errors
// caused by the server's time being out of sync with Google's servers.
// This file MUST be imported before firebase-admin.

if (!(global as any).__firebaseClockPatched) {
  const originalDateNow = Date.now;
  Date.now = function () {
    return originalDateNow() - 3600000;
  };
  (global as any).__firebaseClockPatched = true;
  console.log("Applied -1 hr clock skew patch for Firebase Admin Auth");
}

export const __clockPatched = true;
