import express, { Express, Request, Response } from "express";
import { TwitterApi } from "twitter-api-v2";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";

import dotenv from "dotenv";

import session from "express-session";
import cookieParser from "cookie-parser";

import { userClient } from "./TwitterClient.js";

const app: Express = express();
dotenv.config();
const oneDay = 1000 * 60 * 60 * 24;
// session middleware
app.use(
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
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("landing page");
});

app.get("/authorize", async (req: Request, res: Response) => {
  const authLink: IOAuth2RequestTokenResult = userClient.generateOAuth2AuthLink(
    "http://localhost:3000/me",
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
  res.send(req.session);
});
app.get("/me", async (req: Request, res: Response) => {
  // get oauth token and verifier
  const { state, code } = req.query;
  // retrieve oath_token_secret from session store
  const { codeVerifier, state: sessionState } = req.session.oAuth;

  // check if request was denied and do something
  if (!codeVerifier || !state || !sessionState || !code) {
    return res.status(400).send("You denied the app or your session expired!");
  }
  if (state !== sessionState) {
    return res.status(400).send("Stored tokens didnt match!");
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
    // store access token and refresh token in firestore
    res.send(await loggedClient.v2.me());
  } catch (err) {
    console.log(err);
    res.status(403).send("invalid verifier or access tokens!");
  }
});

app.get("/bookmarks", async (req: Request, res: Response) => {
  //   const newClient = new TwitterApi(access);
  //   console.log(await newClient.v2.me());
  res.send("hi");
});

// PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
