import express, { Request, Response } from "express";
import { Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
import dotenv from "dotenv";

import session from "express-session";
import cookieParser from "cookie-parser";

import { userClient } from "../TwitterClient.js";
import { firebaseDb } from "../auth/firebase";

// TODO: render error html before redirecting
const router: Router = express.Router();
// initialize firebase db
const usersRef = firebaseDb.ref("sorta").child("users");

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
      httpOnly: false,
    },
    resave: false,
  })
);
// set cookie parser
router.use(cookieParser());

router.get("/", (req: Request, res: Response) => {
  res.redirect("/authorize");
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
    res.status(200).send({ url: req.session.oAuth.url });
  } catch (err) {
    //  TODO:  return the error to a logging service
    res.status(400).send("could not generate auth link");
    console.log("could not generate auth link" + err);
  }
});

router.get("/me", async (req: Request, res: Response) => {
  if (req.session.oAuth) {
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
      const user = await loggedClient.v2.me({
        "user.fields": ["profile_image_url"],
      });
      // store access token and refresh token in firestore
      const userIdRef = usersRef.child(user.data.id);
      // ONLY CREATE USER IF THEY DON'T EXIST
      userIdRef.once("value").then((snapshot) => {
        if (snapshot.exists()) {
          res.send("user already exists in db.");
        } else {
          userIdRef.set(
            {
              username: user.data.username,
              pfp: user.data.profile_image_url,
              accessToken,
              refreshToken,
              tokenExpiresIn: expiresIn,
            },
            (err) => {
              if (err) {
                // TODO: log user data to logging service
                console.log("Error saving new user" + err);
                res.status(400).redirect("/authorize");
              }
              //TODO: log new user created to logging service
              console.log("successfully created new user!");

              // save the user id to the session store
              req.session.userId = user.data.id;
              res.redirect(201, "/bookmarks");
            }
          );
        }
      });
    } catch (err) {
      //  TODO:  return this to a logging service
      console.log(err);
      res
        .status(400)
        .send("An error occured while logging you in. please try again. ");
    }
  } else {
    res.redirect(400, "/authorize");
  }
});

// get bookmark
router.get("/bookmarks", async (req: Request, res: Response) => {
  // route only works if user has a session
  if (req.session.userId) {
    // retrieve the user username from the session store
    const userId = req.session.userId;
    // get a db ref
    const userRef = firebaseDb.ref(`sorta/users/${userId}`);
    userRef.on(
      "value",
      async (snapshot) => {
        const accessToken = snapshot.val().accessToken;
        const newTwitterClient = new TwitterApi(accessToken);
        // get and return the users bookmarks
        const bookmarks = await newTwitterClient.v2.bookmarks();
        res.status(200).send(bookmarks);
      },
      (errorObj) => {
        // TODO: log error to logging serivce
        console.log(
          "couldn't retrieve the data" + errorObj.name + errorObj.message
        );
        res.send("error could not retrieve your data. please try again.");
      }
    );
  } else {
    res.redirect(400, "/authorize");
  }
});
// route to remove a bookmark
router.delete("/bookmarks/:tweet_id", (req: Request, res: Response) => {
  // check if user has a session
  if (req.session.userId) {
    const tweetId = req.params.tweet_id;
    const userId = req.session.userId;
    // get a db ref
    const userRef = firebaseDb.ref(`sorta/users/${userId}`);
    userRef.on(
      "value",
      (snapshot) => {
        const accessToken = snapshot.val().accessToken;
        const newTwitterClient = new TwitterApi(accessToken);
        newTwitterClient.v2.deleteBookmark(tweetId);
        console.log("bookmark deleted successfully");
        res.status(200).send({ message: "bookmark deleted successfully!" });
      },
      (errorObject) => {
        //TODO : send errors to logging service
        console.log(
          `an error occured while deleting a bookmark. \n${errorObject.name} \n ${errorObject.message}`
        );
        res
          .status(400)
          .send("an error occured while deleting for your bookmark.");
      }
    );
  } else {
    console.log("no session detected");
    res.redirect(400, "/bookmarks");
  }
});

// route to create a category
// route to update a category (including adding a bookmark to it)
// route to delete a category
export { router };
