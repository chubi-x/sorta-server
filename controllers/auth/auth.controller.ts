import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
import { ResponseHandler } from "../../services";
import { usersRef } from "../../db/firebase";
import { userClient } from "../../TwitterClient";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";

const authRouter: Router = express.Router();

// configure env variable
dotenv.config();

authRouter.get("/", (req: Request, res: Response) => {
  return res.redirect("/authorize");
});

authRouter.get("/authorize", async (req: Request, res: Response) => {
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
    ResponseHandler.requestSuccessful({
      res,
      payload: { url: req.session.oAuth.url },
    });
  } catch (err) {
    ResponseHandler.serverError(res, "could not generate auth link");
    console.log("could not generate auth link \n" + err);
  }
});

authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    if (req.session.oAuth) {
      // get oauth token and verifier
      const { state, code } = req.query;
      // retrieve oath_token_secret from session store
      const { codeVerifier, state: sessionState } = req.session.oAuth;

      // check if request was denied and do something
      if (!codeVerifier || !state || !sessionState || !code) {
        ResponseHandler.serverError(
          res,
          "You denied the connection or your session expired! Try logging in again."
        );
      }
      if (state !== sessionState) {
        ResponseHandler.serverError(
          res,
          "Stored tokens didn't match! Try logging in again."
        );
      }
      // get persistent access tokens
      // create a client from temporary tokens
      const client = new TwitterApi({
        clientId: process.env.CLIENT_ID!,
        clientSecret: process.env.CLIENT_SECRET!,
      });

      const {
          client: loggedClient,
          accessToken,
          refreshToken,
          expiresIn,
        } = await client.loginWithOAuth2({
          code,
          codeVerifier,
          redirectUri: "http://localhost:3000/me",
        }),
        user = await loggedClient.v2.me({
          "user.fields": ["profile_image_url"],
        }),
        // store access token and refresh token in firestore
        userRef = usersRef.child(user.data.id);
      // ONLY CREATE USER IF THEY DON'T EXIST
      await userRef.once("value").then(async (userSnapshot) => {
        if (userSnapshot.exists()) {
          // update their access and refresh tokens in the db
          await userRef.update({
            accessToken,
            refreshToken,
            tokenExpiresIn: expiresIn,
          });
          // save the user id to the session store and redirect to user
          req.session.userId = user.data.id;
          return res.redirect("/user");
        } else {
          await userRef.set(
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
    } else {
      return res.redirect(303, "/authorize");
    }
  } catch (err) {
    console.log(`Error accessing /me endpoint. see below: \n ${err}`);
    ResponseHandler.serverError(
      res,
      "An error occured while logging you in. Please try again."
    );
  }
});

export { authRouter };
