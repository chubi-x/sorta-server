import firebase from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

try {
  firebase.initializeApp({
    credential: firebase.credential.cert(
      JSON.parse(process.env.GOOGLE_APPLICATIONS_CREDENTIALS!)
    ),
    databaseURL:
      "https://sorta-twitter-app-default-rtdb.europe-west1.firebasedatabase.app",
  });
} catch (err) {
  //  TODO: return the error to a loggin service
  console.log(err);
}
export const firebaseDb = firebase.database();
