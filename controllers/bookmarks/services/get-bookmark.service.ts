import { Request, Response } from "express";

import {
  TweetBookmarksTimelineV2Paginator,
  TweetV2,
  TwitterApi,
  TwitterV2IncludesHelper,
} from "twitter-api-v2";
import { Reference } from "@firebase/database-types";
import { refreshToken, ResponseHandler } from "../../../services";

async function getUserBookmarks(client: TwitterApi, user: User) {
  let bookmarksPaginatorArray: TweetBookmarksTimelineV2Paginator[] = [];

  const bookmarks = await client.v2.bookmarks({
    "tweet.fields": ["attachments", "entities", "created_at"],
    "user.fields": ["profile_image_url", "username", "verified"],
    expansions: ["author_id"],
  });
  bookmarksPaginatorArray.push(bookmarks);
  // retrieve all bookmarks with pagination
  let page = bookmarks;
  while (true) {
    const newBookmarks = await client.v2.bookmarks({
      pagination_token: page.meta.next_token,
      "tweet.fields": ["attachments", "entities", "created_at"],
      "user.fields": ["profile_image_url", "username", "verified"],
      expansions: ["author_id"],
    });
    bookmarksPaginatorArray.push(newBookmarks);
    page = newBookmarks;
    if (!page.meta.next_token) {
      break;
    }
  }
  return bookmarksPaginatorArray;
}
function extractBookmarkTweets(
  bookmarksPaginatorArray: TweetBookmarksTimelineV2Paginator[]
) {
  const tweetsArray: TweetV2[] = [];
  bookmarksPaginatorArray?.forEach((bookmarkPaginator) => {
    const tweets = bookmarkPaginator?.data?.data;
    tweets?.forEach((tweet) => {
      const author = TwitterV2IncludesHelper.author(bookmarkPaginator, tweet);
      tweet.author_pfp = author?.profile_image_url;
      tweet.author_verified = author?.verified;
      tweet.author_name = author?.name;
      tweet.author_username = author?.username;
      tweetsArray.push(tweet);
    });
  });
  return tweetsArray;
}

async function refreshAndReturnBookmarks(
  currentTime: number,
  expiresIn: number,
  userRef: Reference,
  user: User
) {
  let client: TwitterApi = new TwitterApi();

  let bookmarksPaginatorArray: TweetBookmarksTimelineV2Paginator[];

  if (currentTime >= expiresIn) {
    client = await refreshToken(userRef, user);
    bookmarksPaginatorArray = await getUserBookmarks(client, user);
  } else {
    client = new TwitterApi(user.accessToken);
    bookmarksPaginatorArray = await getUserBookmarks(client, user);
  }
  return bookmarksPaginatorArray;
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
          const bookmarksPaginatorArray = await refreshAndReturnBookmarks(
            currentTime,
            expiresIn,
            userRef,
            user
          );
          const tweets: TweetV2[] = extractBookmarkTweets(
            bookmarksPaginatorArray
          );

          return ResponseHandler.requestSuccessful({
            res,
            payload: { data: tweets },
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

