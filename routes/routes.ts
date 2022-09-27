import express, { Request, Response, Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from "cookie-parser";

import { userClient } from "../TwitterClient.js";
import { firebaseDb } from "../auth/firebase";

// error variable
const NO_SESSION_ID = "User does not have a session.";
// require nanoid cause of typescript wahala
const nanoid = require("nanoid");
const router: Router = express.Router();
// initialize firebase db
const usersRef = firebaseDb.ref("sorta").child("users");

// configure env variable
dotenv.config();

// cookie age
const threeDays = 1000 * 60 * 60 * 72;
// session middleware
router.use(
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: true,
    cookie: {
      maxAge: threeDays,
      httpOnly: false,
    },
    resave: true,
  })
);
// set cookie parser
router.use(cookieParser());

router.get("/", (req: Request, res: Response) => {
  return res.redirect("/authorize");
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
    return res.status(200).json({ url: req.session.oAuth.url });
  } catch (err) {
    //  TODO:  return the error to a logging service
    res.status(400).end("could not generate auth link");
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
        .end(
          "You denied the connection or your session expired! Try logging in again."
        );
    }
    if (state !== sessionState) {
      return res
        .status(400)
        .end("Stored tokens didn't match! Try logging in again.");
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
      userIdRef.once("value").then(async (snapshot) => {
        if (snapshot.exists()) {
          // update their access and refresh tokens in the db
          await userIdRef.update({
            accessToken,
            refreshToken,
            tokenExpiresIn: expiresIn,
          });
          // save the user id to the session store and redirect to bookmarks
          req.session.userId = user.data.id;
          return res.redirect("/user");
        } else {
          await userIdRef.set(
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
                return res.status(400).redirect("/authorize");
              }
            }
          );
          //TODO: log new user created to logging service
          console.log("successfully created new user!");
          // save the user id to the session store
          req.session.userId = user.data.id;
          return res.redirect(201, "/user");
        }
      });
    } catch (err) {
      //  TODO:  return this to a logging service
      console.log(err);
      return res
        .status(400)
        .send("An error occured while logging you in. please try again. ");
    }
  } else {
    return res.redirect(303, "/authorize");
  }
});

// get user info
router.get("/user", (req: Request, res: Response) => {
  try {
    // user must have session
    if (req.session.userId) {
      const userId = req.session.userId,
        // retrieve user from db
        userRef = usersRef.child(userId);
      userRef.once("value", (snapshot) => {
        const userData = snapshot.val();
        return res.json({
          user: { username: userData.username, pfp: userData.pfp },
        });
      });
    } else {
      return res.redirect("/authorize");
    }
  } catch (err) {
    console.log(
      `There was an error accessing this endpoint. see below\n ${err}`
    );
  }
});
// get bookmarks
router.get("/bookmarks", async (req: Request, res: Response) => {
  // route only works if user has a session
  if (req.session.userId) {
    console.log("a session was found!");
    // retrieve the user username from the session store
    const userId = req.session.userId;
    // get a db ref
    const userIdRef = usersRef.child(userId);
    userIdRef.once(
      "value",
      async (snapshot) => {
        try {
          // get user access token
          const user = snapshot.val();
          const accessToken = user.accessToken;
          const newTwitterClient = new TwitterApi(accessToken);
          // get and return the users bookmarks
          const bookmarks = await newTwitterClient.v2.bookmarks();
          return res.status(200).json({ bookmarks });
        } catch (err) {
          // TODO: log error to logging service
          console.error("the error: " + err);
          // redirect to authorize
          return res.redirect(303, "/authorize");
        }
      },
      (errorObj) => {
        // TODO: log error to logging serivce
        console.log(
          "couldn't retrieve the data \n" + errorObj.name + errorObj.message
        );
        return res.end("error could not retrieve your data. please try again.");
      }
    );
  } else {
    return res.redirect(303, "/authorize");
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
    userRef.once(
      "value",
      async (snapshot) => {
        const accessToken = snapshot.val().accessToken;
        try {
          const newTwitterClient = new TwitterApi(accessToken);
          await newTwitterClient.v2.deleteBookmark(tweetId);
          console.log("bookmark deleted successfully");
          return res
            .status(200)
            .json({ message: "bookmark deleted successfully!" });
        } catch (err) {
          // TODO: log error to logging service
          console.log(err);
          // redirect to authorize
          return res.redirect(303, "/authorize");
        }
      },
      (errorObject) => {
        //TODO : send errors to logging service
        console.log(
          `an error occured while deleting a bookmark. \n${errorObject.name} \n ${errorObject.message}`
        );
        return res
          .status(400)
          .end("an error occured while deleting for your bookmark.");
      }
    );
  } else {
    return res.redirect(303, "/authorize");
  }
});

// route to create a category
router.post("/category", async (req: Request, res: Response) => {
  try {
    //check for a session
    if (req.session.userId) {
      const userId = req.session.userId;
      // retrieve user from db
      const categoryRef = usersRef.child(userId).child("categories");
      // request body should contain name, description, image link (user will upload to firestore from FE), and object of tweet IDs.
      const categoryId = nanoid();
      const category = categoryRef.child(categoryId);
      await category.set(
        {
          name: req.body.name,
          description: req.body.description,
          image: req.body.image,
        },
        (err) => {
          if (err) {
            //TODO: Log to logging service
            console.log(`error creating category \n ${err}`);
            return res.status(409).send("error creating category");
          }
        }
      );
      categoryRef.child(categoryId!).once(
        "value",
        (snapshot) => {
          return res.status(201).json({ id: categoryId, data: snapshot.val() });
        },
        (errObject) => {
          // TODO: log to logging service
          console.log(
            `error retrieving the new category \n ${errObject.name} : ${errObject.message}`
          );
          return res.status(409).send("error retrieving the new category");
        }
      );
    } else {
      return res.redirect(303, "/authorize");
    }
  } catch (err) {
    console.log(`request error ${err}`);
  }
});
// route to update a category (including adding a bookmark to it)
// route to delete a category
export { router };

