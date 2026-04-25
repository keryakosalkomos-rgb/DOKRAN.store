const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

console.log("Applying clock skew patch (-1 hr) before anything...");
const originalDateNow = Date.now;
Date.now = function () { return originalDateNow() - 14400000; };

const admin = require("firebase-admin");

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "dr-factor-4a824",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  admin.firestore().collection("settings").doc("payment").get()
    .then(snap => {
      console.log("Success with -1 hr patch! Document exists:", snap.exists);
      process.exit(0);
    })
    .catch(err => {
      console.error("Error with -1 hr patch:", err.message);
      process.exit(1);
    });

} catch (e) {
  console.error("Init error:", e);
  process.exit(1);
}
