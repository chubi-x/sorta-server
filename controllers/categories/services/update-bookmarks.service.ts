import { Request, Response } from "express";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
import { bookmarkUpdateType } from "../dto";
export async function updateCategoryBookmarks(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    // user must have a session
    const userId = req.session.userId;
    const categoryId = req.params.categoryId;
    const updateType: bookmarkUpdateType = req.body.updateType;
    const bookmarksToUpdate: string[] = req.body.bookmarks;
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
            async (bookmarksSnapshot) => {
              if (updateType === bookmarkUpdateType.ADD) {
                bookmarksToUpdate.forEach(async (bookmark) => {
                  bookmarksRef.push(
                    {
                      categoryId,
                      tweetId: bookmark,
                    },
                    (err) => {
                      if (err) {
                        // TODO: log to loggin service
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
                  message: "bookmarks added successfully",
                  status: 201,
                });
                // check the update type
              } else if (updateType === bookmarkUpdateType.DELETE) {
                if (bookmarksSnapshot.exists()) {
                  let ERROR_FLAG = false;
                  // traverse through the bookmarks
                  bookmarksSnapshot.forEach((bookmark) => {
                    // check if the category id matches the provided category
                    bookmarksToUpdate.forEach(async (bookmarkToDelete) => {
                      const bookmarkCategoryId = bookmark
                        .child("categoryId")
                        .val();
                      const bookmarkTweetId = bookmark.child("tweetId").val();
                      if (
                        bookmarkCategoryId === categoryId &&
                        bookmarkTweetId === bookmarkToDelete
                      ) {
                        // delete the bookmark
                        await bookmark.ref.remove((err) => {
                          if (err) {
                            // TODO: log to logging service
                            console.log(
                              `Error removing bookmark see description below: \n ${err}`
                            );
                            return ResponseHandler.serverError(
                              res,
                              "There was an error removing this bookmark. please try again."
                            );
                          }
                        });
                      } else {
                        console.log("wrong bookmark id");
                        ERROR_FLAG = true;
                      }
                    });
                  });
                  if (!ERROR_FLAG) {
                    // return success message
                    return ResponseHandler.requestSuccessful({
                      res,
                      message: "Bookmarks deleted successfully",
                    });
                  } else {
                    ERROR_FLAG = false;
                    return ResponseHandler.clientError(
                      res,
                      "One or all of these bookmarks do not exist."
                    );
                  }
                } else {
                  return ResponseHandler.clientError(
                    res,
                    "No bookmarks in this category.",
                    404
                  );
                }
              } else {
                return ResponseHandler.clientError(
                  res,
                  "Invalid update type. Try another request."
                );
              }
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
    console.log(`Error PATCHING category bookmarks, see below : \n ${err}`);
    return ResponseHandler.clientError(res, "Error updating bookmarks");
  }
}

