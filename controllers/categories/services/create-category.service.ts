import { Request, Response } from "express";
import { Reference } from "@firebase/database-types";
import { ResponseHandler } from "../../../services";
// require nanoid cause of typescript wahala
const nanoid = require("nanoid");

export async function createCategory(
  req: Request,
  res: Response,
  usersRef: Reference
) {
  try {
    const userId = req.session.userId;
    // retrieve user from db
    const categoryRef = usersRef.child(userId).child("categories");
    // request body should contain name, description, image link (user will upload to firestore from FE), and object of tweet IDs.
    const categoryId = nanoid();
    const category = categoryRef.child(categoryId);
    const { name, description, image } = req.body;
    await category.set(
      {
        name,
        description,
        image,
      },
      (err) => {
        if (err) {
          //TODO: Log to logging service
          console.log(`error creating category \n ${err}`);
          ResponseHandler.clientError(res, "Error creating category", 409);
        }
      }
    );
    categoryRef.child(categoryId!).once(
      "value",
      (snapshot) => {
        ResponseHandler.requestSuccessful({
          res,
          payload: { id: categoryId, data: snapshot.val() },
          status: 201,
          message: "Category created successfully",
        });
      },
      (errObject) => {
        // TODO: log to logging service
        console.log(
          `error retrieving the new category \n ${errObject.name} : ${errObject.message}`
        );
        ResponseHandler.clientError(
          res,
          "Error retrieving the new category",
          409
        );
      }
    );
  } catch (err) {
    console.log(
      `Error accessing create category endpoint. see below: \n ${err}`
    );
    ResponseHandler.serverError(
      res,
      "Error creating category. Please try again."
    );
  }
}

