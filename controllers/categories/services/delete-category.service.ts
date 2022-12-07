import { Request, Response } from "express";
import { Reference, DataSnapshot } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
import { cloudStorageBucket } from "../../../firebase/firebase";
import { CreateCategoryDto } from "../dto";

export async function deleteCategory(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    // list of bookmark removal promises
    const bookmarkRemovalPromiseList: Promise<any>[] = [];
    const userId = req.session.userId;
    const categoryId = req.params.categoryId;
    // get a ref to the specified category and remove it
    const categoryRef = usersRef.child(`${userId}/categories/${categoryId}`);
    // async function to delete bookmarks
    const deleteBookmark = async (bookmarkSnapshot: DataSnapshot) => {
      if (bookmarkSnapshot.child("categoryId").val() === categoryId) {
        await bookmarkSnapshot.ref.remove((err) => {
          // TODO: log to logging service
          if (err) {
            console.log(
              `Error deleting category bookmarks. see details below: \n ${err}`
            );
            return ResponseHandler.serverError(
              res,
              "Error deleting category bookmarks. Please try again."
            );
          }
        });
      }
    };
    await categoryRef.once("value", async (categorySnapshot) => {
      if (categorySnapshot.exists()) {
        const category: CreateCategoryDto = categorySnapshot.val();
        const categoryName = category.name;
        try {
          // delete the image from storage
          const file = cloudStorageBucket.file(
            `images/${userId}/categories/${categoryName}/image`
          );
          const existsArray = await file.exists();
          if (existsArray[0]) {
            await file.delete();
          }
        } catch (e) {
          console.log(e);
          return ResponseHandler.clientError(
            res,
            "Error deleting category image"
          );
        }
        // remove the category
        await categoryRef.remove((err) => {
          // TODO: log to logging service
          if (err) {
            console.log(
              `Error deleting category. see details below: \n ${err}`
            );
            return ResponseHandler.serverError(
              res,
              "Error deleting category. Please try again."
            );
          }
        });

        // traverse bookmarks object and delete every bookmark whose category id matches the specified category id
        await usersRef
          .child(`${userId}/bookmarks`)
          .once("value", async (bookmarksSnapshot) => {
            bookmarksSnapshot.forEach((bookmarkSnapshot) => {
              bookmarkRemovalPromiseList.push(deleteBookmark(bookmarkSnapshot));
            });
            // fulfill bookmark removal promises
            await Promise.allSettled(bookmarkRemovalPromiseList);
            // send success message
            return ResponseHandler.requestSuccessful({
              res,
              message: "category deleted successfully.",
            });
          });
      } else {
        return ResponseHandler.clientError(res, "Category does not exist.");
      }
    });
  } catch (err) {
    console.log(
      `There was an error accessing delete categories endpoint. see full error below: \n ${err}`
    );
    return ResponseHandler.clientError(
      res,
      "Error deleting category. Please try again."
    );
  }
}

