import { Request, Response } from "express";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";

export async function updateCategoryAttributes(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId;
    const categoryId = req.params.categoryId;
    const categoryRef = usersRef.child(`${userId}/categories/${categoryId}`);

    await categoryRef.once("value", async (categorySnapshot) => {
      if (categorySnapshot.exists()) {
        const { name, description, image } = req.body;
        await categoryRef.update(
          {
            name,
            description,
            image,
          },
          (err) => {
            if (err) {
              // TODO: log error to logging service
              console.log(
                `Firebase error \n Error updating category. see below \n ${err}`
              );
              return ResponseHandler.clientError(
                res,
                "Error updating category"
              );
            }
          }
        );
        return ResponseHandler.requestSuccessful({
          res,
          message: "Category updated successfully",
        });
      } else {
        console.log("category does not exist");

        return ResponseHandler.clientError(res, "Category does not exist.");
      }
    });
  } catch (err) {
    // TODO: log to logging service
    console.log(
      `Error accessing update category endpoint. see below: \n ${err}`
    );
    return ResponseHandler.clientError(
      res,
      "Error updating category. Please try again."
    );
  }
}
