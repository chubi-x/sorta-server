import firebase from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

export const firebaseAdmin = firebase.initializeApp({
  credential: firebase.credential.cert(
    JSON.parse(process.env.GOOGLE_APPLICATIONS_CREDENTIALS!)
  ),
  databaseURL:
    "https://sorta-twitter-app-default-rtdb.europe-west1.firebasedatabase.app",
});
