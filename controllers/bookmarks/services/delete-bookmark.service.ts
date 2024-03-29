import { Request, Response } from "express";
import { TwitterApi } from "twitter-api-v2";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
import { bookmarkCache } from "../..";

export default async function deleteBookmark(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const bookmarkedTweetId = req.params.bookmarkedTweetId;
    const userId = req.session.userId;
    // get a db ref
    const userRef = usersRef.child(userId);
    await userRef.once(
      "value",
      async (snapshot) => {
        const accessToken = snapshot.val().accessToken;
        const newTwitterClient = new TwitterApi(accessToken);
        await newTwitterClient.v2.deleteBookmark(bookmarkedTweetId);
        bookmarkCache.del(`${userId}-bookmarks`);
        return ResponseHandler.requestSuccessful({
          res,
          message: "Bookmark deleted successfully",
        });
      },
      (errorObject) => {
        //TODO : send errors to logging service
        console.log(
          `an error occured while deleting a bookmark. \n${errorObject.name} \n ${errorObject.message}`
        );
        return ResponseHandler.serverError(
          res,
          "an error occured while deleting your bookmark. please try again."
        );
      }
    );
  } catch (err) {
    console.log(
      `Error accessing delete bookmarks ednpoint. see below : \n ${err}`
    );
    return ResponseHandler.serverError(
      res,
      "Error. could not access this endpoint. Please try again."
    );
  }
}

