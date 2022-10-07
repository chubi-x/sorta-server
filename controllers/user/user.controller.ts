import express, { Request, Response, Router } from "express";
import { usersRef } from "../../db/firebase";
import { hasSession } from "../../middleware";
import { ResponseHandler } from "../../services";

const userRouter: Router = express.Router();

userRouter.get("/", hasSession, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    // retrieve user from db
    const userRef = usersRef.child(userId);
    await userRef.once(
      "value",
      (snapshot) => {
        const userData = snapshot.val();
        ResponseHandler.requestSuccessful({
          res,
          payload: {
            user: {
              id: userId,
              username: userData.username,
              pfp: userData.pfp,
            },
          },
          message: "User data retrieved successfully",
        });
      },
      (err) => {
        if (err) {
          console.log(
            `There was an error retrieving user data. See below\n ${err}`
          );
          ResponseHandler.serverError(
            res,
            "There was a problem retrieving your data. Please try again."
          );
        }
      }
    );
  } catch (err) {
    // TODO: log to logging service
    console.log(
      `There was an error accessing GET user endpoint. see below\n ${err}`
    );
    ResponseHandler.serverError(
      res,
      "There was a problem retrieving your data. Please try again."
    );
  }
});

export { userRouter };

