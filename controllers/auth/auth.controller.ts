import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import NodeCache from "node-cache";
import { TwitterApi, UserV2Result } from "twitter-api-v2";
import { ResponseHandler } from "../../services";
import { usersRef } from "../../db/firebase";
import { userClient } from "../../TwitterClient";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";

// initialize user cache
const userCache = new NodeCache();
const authRouter: Router = express.Router();

// configure env variable
dotenv.config();

async function getUser(loggedClient: TwitterApi) {
  let user: UserV2Result;

  const cachedUser: UserV2Result = userCache.get("user")!;
  if (cachedUser) {
    user = cachedUser;
  } else {
    user = await loggedClient.v2.me({
      "user.fields": ["profile_image_url", "verified", "name"],
    });
    //  set in cache
    userCache.set("user", user, 3600); //cache lives for an hour
  }
  return user;
}
authRouter.get("/", (req: Request, res: Response) => {
  return res.redirect("/authorize");
});

authRouter.get("/authorize", async (req: Request, res: Response) => {
  try {
    const authLink: IOAuth2RequestTokenResult =
      userClient.generateOAuth2AuthLink(
        "http://127.0.0.1:5173/oauth/callback/url",
        {
          scope: [
            "tweet.read",
            "users.read",
            "bookmark.read",
            "bookmark.write",
            "offline.access",
          ],
        }
      );
    req.session.oAuth = {
      ...authLink,
    };
    return ResponseHandler.requestSuccessful({
      res,
      payload: { oauth: authLink },
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
      redirectUri: "http://127.0.0.1:5173/oauth/callback/url",
    });

    // convert token expiration time to actual date
    const tokenExpiresIn = new Date().getTime() + expiresIn * 1000;

    // get user from cache
    const user = await getUser(loggedClient);
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
    console.log(
      `Error accessing /oauth/complete endpoint. see below: \n ${err}`
    );
    return ResponseHandler.serverError(
      res,
      "An error occurred while logging you in. Please try again."
    );
  }
});

export { authRouter };

