import { Request, Response } from "express";
import { TwitterApi } from "twitter-api-v2";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services/index";

export default async function getBookmarks(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId,
      userRef = usersRef.child(userId);
    await userRef.once(
      "value",
      async (snapshot) => {
        // get user access token
        const user = snapshot.val(),
          accessToken = user.accessToken,
          newTwitterClient = new TwitterApi(accessToken),
          bookmarks = await newTwitterClient.v2.bookmarks();
        return ResponseHandler.requestSuccessful({
          res,
          payload: { bookmarks },
          message: "Bookmarks retrieved successfully",
        });
      },
      (errorObject) => {
        // TODO: log error to logging serivce
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
      "Error. could not access this endpoint. please try again."
    );
  }
}

