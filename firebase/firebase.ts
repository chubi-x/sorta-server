import firebase from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";
dotenv.config();
const app = firebase.initializeApp({
  credential: firebase.credential.cert(
    JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS!)
  ),
  databaseURL: process.env.DATABASE_URL!,
});

const cloudStorage = getStorage(app);
export const cloudStorageBucket = cloudStorage.bucket(
  `${process.env.GOOGLE_CLOUD_BUCKET!}`
);

export const usersRef = firebase.database(app).ref("sorta/users");

