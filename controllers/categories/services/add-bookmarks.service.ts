import { Request, Response } from "express";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
export async function addBookmarksToCategory(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    // user must have a session
    const userId = req.session.userId;
    const categoryId = req.params.categoryId;
    const bookmarksToUpdate: Bookmark[] = req.body.bookmarks;
    // get a ref to the bookmarks object
    const bookmarksRef = usersRef.child(`${userId}/bookmarks`);
    // Category must exist before any operations
    await usersRef
      .child(`${userId}/categories/${categoryId}`)
      .once("value", async (categorySnapshot) => {
        if (categorySnapshot.exists()) {
          // push the bookmarks to the bookmarks object
          await bookmarksRef.once(
            "value",
            (bookmarksSnapshot) => {
              bookmarksToUpdate.forEach(async (bookmark) => {
                bookmarksRef.push(
                  {
                    categoryId,
                    ...bookmark,
                  },
                  (err) => {
                    if (err) {
                      // TODO: log to logging service
                      console.log(
                        `Error creating bookmarks in category. see below: \n ${err}`
                      );
                      return ResponseHandler.clientError(
                        res,
                        "Error creating bookmarks in category"
                      );
                    }
                  }
                );
              });
              // return success message
              return ResponseHandler.requestSuccessful({
                res,
                message: "bookmark(s) added successfully",
                status: 201,
              });
            },
            (errorObject) => {
              // TODO: log to logging service
              console.log(
                `error accessing bookmarks \n ${errorObject.name} : ${errorObject.message}`
              );
              return ResponseHandler.serverError(
                res,
                "There was an error accessing your bookmark"
              );
            }
          );
        } else {
          return ResponseHandler.clientError(res, "Category does not exist.");
        }
      });
  } catch (err) {
    // TODO: log to logging service
    console.log(`Error adding bookmarks to category, see below : \n ${err}`);
    return ResponseHandler.clientError(
      res,
      "Error adding bookmarks to category"
    );
  }
}

