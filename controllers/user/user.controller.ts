import express, { Request, Response, Router } from "express";
import { usersRef } from "../../db/firebase";
import { hasSession } from "../../middleware/index";
import { ResponseHandler } from "../../services";

const userRouter: Router = express.Router();

userRouter.get("/", hasSession, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    // retrieve user from db
    const userRef = usersRef.child(userId);
    await userRef.once("value", (snapshot) => {
      const userData = snapshot.val();
      ResponseHandler.requestSuccessful({
        res,
        payload: {
          user: { id: userId, username: userData.username, pfp: userData.pfp },
        },
        message: "User data retrieved successfully",
      });
    });
  } catch (err) {
    console.log(
      `There was an error accessing GET user endpoint. see below\n ${err}`
    );
    ResponseHandler.serverError(res);
  }
});

export { userRouter };
