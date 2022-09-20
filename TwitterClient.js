import {
  TwitterApi
} from "twitter-api-v2";

import {
  appKey,
  appSecret
} from './config.js'

export const userClient = new TwitterApi({
  appKey,
  appSecret
});