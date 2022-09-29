import { Request, Response } from "express";
import { Reference, DataSnapshot } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";

export async function getCategories(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId,
      categoriesArray: any[] = [],
      // get a ref to user's bookmarks
      bookmarksRef = usersRef.child(`${userId}/bookmarks`),
      // retrieve user user categories from db
      categoryRef = usersRef.child(`${userId}/categories`);

    await categoryRef.once(
      "value",
      async (categoriesSnapshot) => {
        // list to hold bookmarks ref read promises
        const promiseList: Promise<any>[] = [],
          // async function to read bookmarks ref
          readBookmarks = async (categorySnapshot: DataSnapshot) => {
            const bookmarksArray: string[] = [],
              categoryId = categorySnapshot.ref.key;
            await bookmarksRef.once(
              "value",
              (bookmarksSnapshot) => {
                bookmarksSnapshot.forEach((bookmarkSnapshot) => {
                  if (bookmarkSnapshot.child("categoryId").val() === categoryId)
                    bookmarksArray.push(
                      bookmarkSnapshot.child("tweetId").val()
                    );
                });
              },
              (errorObject) => {
                // TODO: log to logging service
                console.log(
                  `error accessing bookmarks \n ${errorObject.name} : ${errorObject.message}`
                );
              }
            );
            categoriesArray.push({
              category: { id: categoryId, data: categorySnapshot.val() },
              bookmarks: bookmarksArray,
            });
          };
        categoriesSnapshot.forEach((categorySnapshot) => {
          promiseList.push(readBookmarks(categorySnapshot));
        });
        // fulfill promises
        await Promise.all(promiseList);
        //TODO: return an array of the categories and their bookmarks
        ResponseHandler.requestSuccessful({
          res,
          payload: { categories: categoriesArray },
        });
      },
      (errorObject) => {
        // TODO: log to logging service
        console.log(
          `error accessing categories \n ${errorObject.name} : ${errorObject.message}`
        );
        ResponseHandler.serverError(
          res,
          "There was an error accessing your categories"
        );
      }
    );
  } catch (err) {
    console.log(
      `There was an error accessing get categories endpoint. see error below \n ${err}`
    );
    ResponseHandler.serverError(
      res,
      "There was an error accessing your categories"
    );
  }
}