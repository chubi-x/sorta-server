import { Request, Response } from "express";
import NodeCache from "node-cache";

import {
  TweetBookmarksTimelineV2Paginator,
  TweetV2LookupResult,
  TwitterApi,
  UserV2,
} from "twitter-api-v2";
import { Reference } from "@firebase/database-types";
import { refreshToken, ResponseHandler } from "../../../services";

// TODO: figure out caching bug for different user on one session
// initialize bookmarks cache
const bookmarkCache = new NodeCache();

async function getUserBookmarks(client: TwitterApi, user: User) {
  let bookmarks: TweetBookmarksTimelineV2Paginator;
  // check if bookmarks is in cache
  const cachedBookmarks: TweetBookmarksTimelineV2Paginator = bookmarkCache.get(
    `${(user.name, ":", user.id)}- bookmarks`
  )!;
  if (cachedBookmarks) {
    bookmarks = cachedBookmarks;
  } else {
    // retrieve value and set to cache
    bookmarks = await client.v2.bookmarks();
    bookmarkCache.set(
      `${(user.name, ":", user.id)}- bookmarks`,
      bookmarks,
      3600
    ); //cache to live for an hour
  }
  return bookmarks;
}
async function getUserBookmarkTweets(
  client: TwitterApi,
  bookmarkIds: string[],
  user: User
) {
  let bookmarkTweets: TweetV2LookupResult;
  // check if bookmark tweets exist in cache
  const cachedBookmarkTweets: TweetV2LookupResult = bookmarkCache.get(
    `${(user.name, ":", user.id)}- bookmarkTweets`
  )!;
  if (cachedBookmarkTweets) {
    bookmarkTweets = cachedBookmarkTweets;
  } else {
    // get each tweet
    bookmarkTweets = await client.v2.tweets(bookmarkIds, {
      "tweet.fields": ["attachments", "author_id", "entities", "created_at"],
      // "media.fields": ["url"]
    });
    // set in cache
    bookmarkCache.set(
      `${(user.name, ":", user.id)}- bookmarkTweets`,
      bookmarkTweets,
      3600
    ); //cache lives for an hour
  }
  return bookmarkTweets;
}

async function getUserBookmarkTweetAuthorInfo(
  client: TwitterApi,
  author_id: string
) {
  let author: UserV2;

  // check cache for author info
  const cachedAuthor: UserV2 = bookmarkCache.get(
    `bookmarkTweetAuthor-${author_id}`
  )!;
  if (cachedAuthor) {
    author = cachedAuthor;
  } else {
    author = (
      await client.v2.user(author_id!, {
        "user.fields": ["profile_image_url", "verified"],
      })
    ).data;
    // set cache
    bookmarkCache.set(`bookmarkTweetAuthor-${author_id}`, author, 3600); //cache lives for an hour
  }
  return author;
}
async function checkExpiredAndRefresh(
  currentTime: number,
  expiresIn: number,
  userRef: Reference,
  user: User
) {
  let client: TwitterApi = new TwitterApi();

  let bookmarks: TweetBookmarksTimelineV2Paginator;

  if (currentTime >= expiresIn) {
    client = await refreshToken(userRef, user);
    bookmarks = await getUserBookmarks(client, user);
  } else {
    client = new TwitterApi(user.accessToken);
    bookmarks = await getUserBookmarks(client, user);
  }
  return { bookmarks, client };
}

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
        const user: User = snapshot.val();
        // check if token has expired and refresh it
        const expiresIn: number = user.tokenExpiresIn;
        const currentTime = new Date().getTime();

        try {
          const { bookmarks, client } = await checkExpiredAndRefresh(
            currentTime,
            expiresIn,
            userRef,
            user
          );
          // save meta data to object
          const meta = bookmarks.meta;
          // TODO: retrieve all twitter bookmarks with their pagination
          // implement pagination in this api to return them.
          const bookmarkData = bookmarks.data.data;
          const bookmarkIds = bookmarkData.map((bookmark) => bookmark.id);

          const bookmarkTweets = await getUserBookmarkTweets(
            client,
            bookmarkIds,
            user
          );
          // retrieve complete tweet info
          const completeTweetInfo = await Promise.allSettled(
            bookmarkTweets.data.map(
              async ({
                author_id,
                text,
                id,
                entities,
                attachments,
                created_at,
              }) => {
                // get the user info of each author
                const author = await getUserBookmarkTweetAuthorInfo(
                  client,
                  author_id!
                );
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
                    authorVerified: author.verified,
                    text,
                    createdAt: created_at,
                    urls,
                    attachmentIds,
                  };
                }
              }
            )
          );

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

