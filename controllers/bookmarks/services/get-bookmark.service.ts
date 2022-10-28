import { Request, Response } from "express";
import { TweetBookmarksTimelineV2Paginator, TwitterApi } from "twitter-api-v2";
import { Reference } from "@firebase/database-types";
import { refreshToken, ResponseHandler } from "../../../services";

export default async function getBookmarks(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId;
    const userRef = usersRef.child(userId);
    await userRef.once(
      "value",
      async (snapshot) => {
        // get user access token
        const user = snapshot.val();
        // check if token has expired and refresh it
        const expiresIn = user.tokenExpiresIn;
        const currentTime = new Date().getTime();

        let client: TwitterApi = new TwitterApi();
        try {
          let bookmarks: TweetBookmarksTimelineV2Paginator;
          if (currentTime >= expiresIn) {
            client = await refreshToken(userRef, user);
            bookmarks = await client.v2.bookmarks();
          } else {
            client = new TwitterApi(user.accessToken);
            bookmarks = await client.v2.bookmarks();
          }
          // save meta data to object
          const meta = bookmarks.meta;
          // TODO: retrieve all twitter bookmarks with their pagination
          // implement pagination in this api to return them.
          // TODO: cache all responses from twitter
          // get tweet ids from bookmarks and save to a new array
          const bookmarkData = bookmarks.data.data;
          const bookmarkIds = bookmarkData.map((bookmark) => bookmark.id);
          // get each tweet
          const bookmarkTweets = await client.v2.tweets(bookmarkIds, {
            "tweet.fields": ["attachments", "author_id", "entities"],
            // "media.fields": ["url"]
          });
          // retrieve complete tweet info
          const completeTweetInfo = await Promise.allSettled(
            bookmarkTweets.data.map(
              async ({ author_id, text, id, entities, attachments }) => {
                // get the user info of each author
                const author = (
                  await client.v2.user(author_id!, {
                    "user.fields": ["profile_image_url", "verified"],
                  })
                ).data;
                // retrieve name, username, and pfp of tweet author
                if (author_id === author.id) {
                  // get tweet url and attachments
                  const urls = entities?.urls;
                  const attachmentIds = attachments?.media_keys;
                  return {
                    id,
                    authorName: author.name,
                    authorUsername: author.username,
                    authorPfp: author.profile_image_url,
                    authorId: author.id,
                    verified: author.verified,
                    text,
                    urls,
                    attachmentIds,
                  };
                }
              }
            )
          );
          console.log();

          return ResponseHandler.requestSuccessful({
            res,
            payload: { data: completeTweetInfo, meta },
            message: "Bookmarks retrieved successfully",
          });
        } catch (err) {
          console.log(
            "Error getting bookmarks from twitter. see below\n " + err
          );
          return ResponseHandler.serverError(
            res,
            "Error getting bookmarks from twitter. Try reloading the page."
          );
        }
      },
      (errorObject) => {
        // TODO: log error to logging service
        console.log(
          "couldn't retrieve the data \n" +
            errorObject.name +
            errorObject.message
        );
        return ResponseHandler.serverError(
          res,
          "Error. could not retrieve your data. please try again."
        );
      }
    );
  } catch (err) {
    // TODO: log to logging service
    console.log(`Error accessing get bookmarks endpoint. see below \n ${err}`);
    return ResponseHandler.serverError(
      res,
      "Could not fetch bookmarks. please try again."
    );
  }
}

