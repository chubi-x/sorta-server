import { Request, Response } from "express";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
import { CreateCategoryDto, UpdateCategoryAttributesDto } from "../dto";
import { cloudStorageBucket } from "../../../firebase/firebase";

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
        const category: CreateCategoryDto = categorySnapshot.val();
        const { name, description, image } = req.body;
        const updateObject: UpdateCategoryAttributesDto = {};

        // check for and update each attribute separately
        if (name) {
          updateObject.name = name;
          // change the location of the image file in cloud storage
          const imageFile = cloudStorageBucket.file(
            `images/${userId}/categories/${category.name}/image`
          );

          const existsArray = await imageFile.exists();
          if (existsArray[0]) {
            // update image location if new image is not provided
            if (!image) {
              const newLocation = `images/${userId}/categories/${name}/image`;
              await imageFile.move(newLocation);
              const newImage = cloudStorageBucket.file(newLocation);
              await newImage.makePublic();
              updateObject.image = newImage.publicUrl();
            }
          }
        }
        if (description) {
          updateObject.description = description;
        }
        if (image) {
          updateObject.image = image;
        }

        if (name || description || image) {
          await categoryRef.update(updateObject, (err) => {
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
          });
          return ResponseHandler.requestSuccessful({
            res,
            message: "Category updated successfully",
          });
        } else {
          return ResponseHandler.clientError(
            res,
            "You did not specify an attribute to change."
          );
        }
      } else {
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

