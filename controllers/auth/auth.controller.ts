import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
import { ResponseHandler } from "../../services";
import { usersRef } from "../../db/firebase";
import { userClient } from "../../TwitterClient";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";

const authRouter: Router = express.Router();

const CALLBACK_URL = "http://127.0.0.1:5173/oauth/callback/url";

// configure env variable
dotenv.config();

authRouter.get("/", (req: Request, res: Response) => {
  return res.redirect("/authorize");
});

authRouter.get("/authorize", async (req: Request, res: Response) => {
  try {
    const authLink: IOAuth2RequestTokenResult =
      userClient.generateOAuth2AuthLink(CALLBACK_URL, {
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

    return ResponseHandler.requestSuccessful({
      res,
      payload: { ...authLink },
    });
    // return res.redirect(req.session.oAuth.url);
  } catch (err) {
    console.log("could not generate auth link \n" + err);
    return ResponseHandler.serverError(res, "could not generate auth link");
  }
});

authRouter.post("/oauth/complete", async (req: Request, res: Response) => {
  try {
    const { oauthData, callbackParams } = req.body;
    const { codeVerifier, state } = oauthData;
    const { state: sessionState, code } = callbackParams;

    // check if request was denied and do something
    if (!codeVerifier || !state || !sessionState || !code) {
      return ResponseHandler.serverError(
        res,
        "You denied the connection or your session expired! Try logging in again."
      );
    }
    if (state !== sessionState) {
      return ResponseHandler.serverError(
        res,
        "Stored tokens didn't match! Try logging in again."
      );
    }
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
      redirectUri: CALLBACK_URL,
    });
    // convert token expiration time to actual date
    const tokenExpiresIn = new Date().getTime() + expiresIn * 1000;

    // get user from cache
    const user = await loggedClient.v2.me({
      "user.fields": ["profile_image_url", "verified", "name"],
    });
    const userRef = usersRef.child(user.data.id);
    // ONLY CREATE USER IF THEY DON'T EXIST
    await userRef.once("value").then(async (userSnapshot) => {
      if (!userSnapshot.exists()) {
        await userRef.set(
          {
            username: user.data.username,
            name: user.data.name,
            verified: user.data.verified,
            id: user.data.id,
            pfp: user.data.profile_image_url,
            accessToken,
            refreshToken,
            tokenExpiresIn,
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
      } else {
        // update the user's tokens
        await userRef.update({
          accessToken,
          refreshToken,
          tokenExpiresIn,
        });
      }
      // save the user id to the session store
      req.session.userId = user.data.id;
      return ResponseHandler.requestSuccessful({
        res,
        message: "Authentication Successful!",
      });
    });
  } catch (err) {
    console.log(`error during twitter sign in ${err}`);
    return ResponseHandler.serverError(res, "error during twitter sign in");
  }
});

authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.setHeader("Clear-Site-Data", "*");
  });
});

export { authRouter };

