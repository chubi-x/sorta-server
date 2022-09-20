import {
  TwitterApi
} from "twitter-api-v2";

import {
  appKey,
  appSecret
} from './config.js'
const userClient = new TwitterApi({
  appKey,
  appSecret
});

export const authLink = await userClient.generateAuthLink("http://localhost:3000/callback");