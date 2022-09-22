import express, { Request, Response } from "express";
import { Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
import dotenv from "dotenv";

import session from "express-session";
import cookieParser from "cookie-parser";

import { userClient } from "../TwitterClient.js";
import { firebaseDb } from "../auth/firebase";

const router: Router = express.Router();
// initialize firebase db
const dbRef = firebaseDb.ref("sorta");
const usersRef = dbRef.child("users");

// const newUser = usersRef.set({
//   name: "user",
//   age: 23,
// });

// const userKey = newUser.key;
// usersRef.child(userKey!).update({
//   key: userKey,
// });

// configure env variable
dotenv.config();

// cookie age
const oneDay = 1000 * 60 * 60 * 24;
// session middleware
router.use(
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: true,
    cookie: {
      maxAge: oneDay,
    },
    resave: false,
  })
);
// set cookie parser
router.use(cookieParser());

router.get("/", (req: Request, res: Response) => {
  res.send("landing page");
});

router.get("/authorize", async (req: Request, res: Response) => {
  try {
    const authLink: IOAuth2RequestTokenResult =
      userClient.generateOAuth2AuthLink("http://localhost:3000/me", {
        scope: [
          "tweet.read",
          "users.read",
          "bookmark.read",
          "bookmark.write",
          "offline.access",
        ],
      });
    req.session.oAuth = {
      ...authLink,
    };
    res.send(req.session);
  } catch (err) {
    //  TODO:  return the error to a logging service
    console.log("could not generate auth link" + err);
  }
});
router.get("/me", async (req: Request, res: Response) => {
  // get oauth token and verifier
  const { state, code } = req.query;
  // retrieve oath_token_secret from session store
  const { codeVerifier, state: sessionState } = req.session.oAuth;

  // check if request was denied and do something
  if (!codeVerifier || !state || !sessionState || !code) {
    return res
      .status(400)
      .send(
        "You denied the router or your session expired! Try logging in again."
      );
  }
  if (state !== sessionState) {
    return res
      .status(400)
      .send("Stored tokens didn't match! Try logging in again.");
  }
  //get persistent access tokens
  // create a client from temporary tokens
  const client = new TwitterApi({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
  });

  try {
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: "http://localhost:3000/me",
    });
    const user = await loggedClient.v2.me();
    // store access token and refresh token in firestore
    const newUser = usersRef.push({
      ...user.data,
      accessToken,
      refreshToken,
    });
    res.send({ user: user.data });
  } catch (err) {
    //  TODO:  return this to a logging service
    console.log(err);
    res.status(403).send("invalid verifier or access tokens!");
  }
});

router.get("/bookmarks", async (req: Request, res: Response) => {
  //   const newClient = new TwitterApi(access);
  //   console.log(await newClient.v2.me());
  res.send("hi");
});

export { router };
