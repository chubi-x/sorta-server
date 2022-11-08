import { TwitterApi } from "twitter-api-v2";
import { Reference } from "@firebase/database-types";

/**
 * Function to refresh twitter access token
 * @param {Reference} userRef reference to firebase user object
 * @param user firebase user snapshot
 * @returns {TwitterApi}  twitter client
 */
export async function refreshToken(userRef: Reference, user: User) {
  // create new client and refresh the token
  const newClient = new TwitterApi({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET,
  });
  const { client, accessToken, refreshToken, expiresIn } =
    await newClient.refreshOAuth2Token(user.refreshToken);
  // convert new expiration to milliseconds
  const tokenExpiresIn = new Date().getTime() + expiresIn * 1000;

  //save new values to db
  await userRef.update({
    accessToken,
    refreshToken,
    tokenExpiresIn,
  });
  return client;
}

