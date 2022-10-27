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

        try {
          let bookmarks: TweetBookmarksTimelineV2Paginator;
          if (currentTime >= expiresIn) {
            const { client } = await refreshToken(userRef, user);
            bookmarks = await client.v2.bookmarks();
          } else {
            const newTwitterClient = new TwitterApi(user.accessToken);
            bookmarks = await newTwitterClient.v2.bookmarks();
          }
          return ResponseHandler.requestSuccessful({
            res,
            payload: { ...bookmarks.data },
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

