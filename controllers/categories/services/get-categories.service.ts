import { Request, Response } from "express";
import { Reference, DataSnapshot } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";

async function readBookmarks(
  categorySnapshot: DataSnapshot,
  bookmarksRef: Reference,
  categoriesArray: any[]
) {
  const bookmarksArray: string[] = [];
  const categoryId = categorySnapshot.ref.key;
  await bookmarksRef.once(
    "value",
    (bookmarksSnapshot) => {
      bookmarksSnapshot.forEach((bookmarkSnapshot) => {
        if (bookmarkSnapshot.child("categoryId").val() === categoryId)
          bookmarksArray.push(bookmarkSnapshot.child("tweetId").val());
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
    ...{ id: categoryId, ...categorySnapshot.val() },
    bookmarks: bookmarksArray,
  });
}
export async function getCategories(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId;
    const categoriesArray: any[] = [];
    // get a ref to user's bookmarks
    const bookmarksRef = usersRef.child(`${userId}/bookmarks`);
    // retrieve user user categories from db
    const categoryRef = usersRef.child(`${userId}/categories`);

    await categoryRef.once(
      "value",
      async (categoriesSnapshot) => {
        // list to hold bookmarks ref read promises
        const promiseList: Promise<any>[] = [];
        // async function to read bookmarks ref
        categoriesSnapshot.forEach((categorySnapshot) => {
          promiseList.push(
            readBookmarks(categorySnapshot, bookmarksRef, categoriesArray)
          );
        });
        // fulfill promises
        await Promise.all(promiseList);
        //TODO: return an array of the categories and their bookmarks
        return ResponseHandler.requestSuccessful({
          res,
          payload: [...categoriesArray],
        });
      },
      (errorObject) => {
        // TODO: log to logging service
        console.log(
          `error accessing categories \n ${errorObject.name} : ${errorObject.message}`
        );
        return ResponseHandler.serverError(
          res,
          "There was an error accessing your categories"
        );
      }
    );
  } catch (err) {
    console.log(
      `There was an error accessing get categories endpoint. see error below \n ${err}`
    );
    return ResponseHandler.serverError(
      res,
      "There was an error accessing your categories"
    );
  }
}

