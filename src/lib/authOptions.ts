import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import { IUser } from "@/models/User";
import fs from "fs";
import path from "path";

function logToFile(msg: string) {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'nextauth-debug.log'), new Date().toISOString() + ': ' + msg + '\n');
  } catch(e) {}
}


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      checks: ["pkce", "state"],
      client: {
        clockTolerance: 10800 // 3 hours in seconds
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }
        const db = adminDb();
        const usersRef = db.collection("users");
        const querySnapshot = await usersRef.where("email", "==", credentials.email).limit(1).get();

        if (querySnapshot.empty) {
          throw new Error("Invalid credentials");
        }

        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data() as IUser;

        if (!user.password) {
          throw new Error("Invalid credentials");
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password);

        if (!isMatch) {
          throw new Error("Invalid credentials");
        }

        return {
          id: userDoc.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      logToFile(`signIn callback invoked. Provider: ${account?.provider}, User Email: ${user?.email}`);
      // For OAuth providers (Google), auto-create user in Firebase if not exists
      if (account?.provider === "google") {
        try {
          if (!user.email) {
            logToFile(`Error: No email provided by ${account?.provider}. User object: ${JSON.stringify(user)}`);
            // We usually require an email to link them
            return false;
          }

          const db = adminDb();
          const usersRef = db.collection("users");
          const querySnapshot = await usersRef.where("email", "==", user.email).limit(1).get();

          if (querySnapshot.empty) {
            logToFile(`User not found in DB. Creating new user for ${user.email}`);
            // Create a new user document in Firebase
            await usersRef.add({
              name: user.name || "",
              email: user.email,
              password: "", // OAuth users don't have a password
              role: "user",
              provider: account.provider,
              createdAt: new Date(),
            });
            logToFile(`User created successfully for ${user.email}`);
          } else {
            logToFile(`User already exists in DB for ${user.email}`);
          }
        } catch (error: any) {
          logToFile(`Error during OAuth sign-in user creation: ${error.message} - Stack: ${error.stack}`);
          console.error("Error during OAuth sign-in user creation:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        // For OAuth users, look up their Firebase doc ID
        if (account?.provider === "google") {
          try {
            const db = adminDb();
            const usersRef = db.collection("users");
            const querySnapshot = await usersRef.where("email", "==", user.email).limit(1).get();
            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const userData = userDoc.data();
              token.id = userDoc.id;
              token.role = userData.role || "user";
            }
          } catch (error) {
            console.error("Error fetching OAuth user from Firebase:", error);
          }
        } else {
          token.id = user.id;
          token.role = (user as any).role;
        }
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  logger: {
    error(code, metadata) {
      logToFile(`[NextAuth ERROR] ${code} - ${JSON.stringify(metadata)}`);
    },
    warn(code) {
      logToFile(`[NextAuth WARN] ${code}`);
    },
    debug(code, metadata) {
      logToFile(`[NextAuth DEBUG] ${code} - ${JSON.stringify(metadata)}`);
    }
  }
};
