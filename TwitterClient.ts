import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";

dotenv.config();
export const userClient = new TwitterApi({
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
});
