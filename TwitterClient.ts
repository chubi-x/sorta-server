import {
  TwitterApi
} from "twitter-api-v2";

import {
  config
} from './config.js'

export const userClient = new TwitterApi({
  clientId: config.clientId,
  clientSecret: config.clientSecret
});