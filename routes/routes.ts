import express, { NextFunction, Request, Response, Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
import { DataSnapshot } from "@firebase/database-types";
import dotenv from "dotenv";
import { userClient } from "../TwitterClient.js";
import { firebaseDb } from "../auth/firebase";
import hasSession from "../middleware/hasSession.js";
import ResponseHandler from "../services/responseHandlers.js"

// error variable
const NO_SESSION_ID = "User does not have a session.";

// update type enum
enum bookmarkUpdateType {
  ADD = "add",
  DELETE = "delete",
}
// require nanoid cause of typescript wahala
const nanoid = require("nanoid");
const router: Router = express.Router();
// initialize firebase db
const usersRef = firebaseDb.ref("sorta").child("users");

// configure env variable
dotenv.config();

router.get("/", (req: Request, res: Response) => {
  return res.redirect("/authorize");
});

router.get("/authorize", async (req: Request, res: Response) => {
  try {
    const authLink: IOAuth2RequestTokenResult =
      userClient.generateOAuth2AuthLink("http://localhost:3000/me", {
        scope: [
          "tweet.read",
          "users.read",
          "bookmark.read",
          "bookmark.write",
          "offline.access",
        ],
      });
    req.session.oAuth = {
      ...authLink,
    };
    ResponseHandler.requestSuccessful({ res, payload: { url: req.session.oAuth.url }});
  } catch (err) {
    ResponseHandler.serverError(res, "could not generate auth link");
    console.log("could not generate auth link" + err);
  }
});

router.get("/me", async (req: Request, res: Response) => {
  if (req.session.oAuth) {
    // get oauth token and verifier
    const { state, code } = req.query;
    // retrieve oath_token_secret from session store
    const { codeVerifier, state: sessionState } = req.session.oAuth;

    // check if request was denied and do something
    if (!codeVerifier || !state || !sessionState || !code) {
      return res
        .status(400)
        .end(
          "You denied the connection or your session expired! Try logging in again."
        );
    }
    if (state !== sessionState) {
      return res
        .status(400)
        .end("Stored tokens didn't match! Try logging in again.");
    }
    // get persistent access tokens
    // create a client from temporary tokens
    const client = new TwitterApi({
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
    });

    try {
      const {
        client: loggedClient,
        accessToken,
        refreshToken,
        expiresIn,
      } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: "http://localhost:3000/me",
      });
      const user = await loggedClient.v2.me({
        "user.fields": ["profile_image_url"],
      });
      // store access token and refresh token in firestore
      const userIdRef = usersRef.child(user.data.id);
      // ONLY CREATE USER IF THEY DON'T EXIST
      userIdRef.once("value").then(async (snapshot) => {
        if (snapshot.exists()) {
          // update their access and refresh tokens in the db
          await userIdRef.update({
            accessToken,
            refreshToken,
            tokenExpiresIn: expiresIn,
          });
          // save the user id to the session store and redirect to bookmarks
          req.session.userId = user.data.id;
          return res.redirect("/user");
        } else {
          await userIdRef.set(
            {
              username: user.data.username,
              pfp: user.data.profile_image_url,
              accessToken,
              refreshToken,
              tokenExpiresIn: expiresIn,
            },
            (err) => {
              if (err) {
                // TODO: log user data to logging service
                console.log("Error saving new user" + err);
                return res.status(400).redirect("/authorize");
              }
            }
          );
          //TODO: log new user created to logging service
          console.log("successfully created new user!");
          // save the user id to the session store
          req.session.userId = user.data.id;
          return res.redirect(201, "/user");
        }
      });
    } catch (err) {
      console.log(err);
      ResponseHandler.serverError(res, "An error occured while logging you in. Please try again.");
    }
  } else {
    return res.redirect(303, "/authorize");
  }
});

// get user info
router.get("/user", hasSession, (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    // retrieve user from db
    const userRef = usersRef.child(userId);
    userRef.once("value", (snapshot) => {
      const userData = snapshot.val();
      ResponseHandler.requestSuccessful({ 
        res, 
        payload: { user: { id: userId, username: userData.username, pfp: userData.pfp } },
        message: 'User data retrieved successfully'
      });
    });
  } catch (err) {
    ResponseHandler.serverError(res);
    console.log(
      `There was an error accessing this endpoint. see below\n ${err}`
    );
  }
});
// get bookmarks
router.get("/bookmarks", hasSession, async (req: Request, res: Response) => {
  try {
    // route only works if user has a session
    // retrieve the user username from the session store
    const userId = req.session.userId;
    console.log("a session was found!");
    // get a db ref
    const userIdRef = usersRef.child(userId);
    userIdRef.once(
      "value",
      async (snapshot) => {
        // get user access token
        const user = snapshot.val();
        const accessToken = user.accessToken;
        const newTwitterClient = new TwitterApi(accessToken);
        // get and return the users bookmarks
        const bookmarks = await newTwitterClient.v2.bookmarks();
        ResponseHandler.requestSuccessful({ res, payload: { bookmarks } });
      },
      (errorObject) => {
        // TODO: log error to logging serivce
        console.log(
          "couldn't retrieve the data \n" +
            errorObject.name +
            errorObject.message
        );
        return res.end("error could not retrieve your data. please try again.");
      }
    );
  } catch (err) {
    // TODO: log to logging service
    console.log(`Error accessing bookmarks endpoint. see below \n ${err}`);
  }
});
// route to remove a bookmark
router.delete(
  "/bookmarks/:bookmarkedTweetId",
  hasSession,
  (req: Request, res: Response) => {
    const bookmarkedTweetId = req.params.bookmarkedTweetId;
    const userId = req.session.userId;
    // get a db ref
    const userRef = firebaseDb.ref(`sorta/users/${userId}`);
    userRef.once(
      "value",
      async (snapshot) => {
        try {
          const accessToken = snapshot.val().accessToken;
          const newTwitterClient = new TwitterApi(accessToken);
          await newTwitterClient.v2.deleteBookmark(bookmarkedTweetId);
          console.log("bookmark deleted successfully");
          ResponseHandler.requestSuccessful({ res, message: 'Bookmark deleted successfully' })
        } catch (err) {
          // TODO: log error to logging service
          console.log(err);
          // redirect to authorize
          return res.redirect(303, "/authorize");
        }
      },
      (errorObject) => {
        //TODO : send errors to logging service
        console.log(
          `an error occured while deleting a bookmark. \n${errorObject.name} \n ${errorObject.message}`
        );
        return res
          .status(400)
          .end("an error occured while deleting for your bookmark.");
      }
    );
  }
);

// route to get a users categories
router.get("/categories", hasSession, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    // array to hold categories
    const categoriesArray: any[] = [],
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
        ResponseHandler.requestSuccessful({ res, payload: { categories: categoriesArray }})
      },
      (errorObject) => {
        // TODO: log to logging service
        console.log(
          `error accessing categories \n ${errorObject.name} : ${errorObject.message}`
        );
        return res
          .status(409)
          .send("There was an error accessing your categories");
      }
    );
  } catch (err) {
    console.log(
      `There was an error accessing this endpoint. see error below \n ${err}`
    );
  }
});

// route to create a category
router.post("/category", hasSession, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    // retrieve user from db
    const categoryRef = usersRef.child(userId).child("categories");
    // request body should contain name, description, image link (user will upload to firestore from FE), and object of tweet IDs.
    const categoryId = nanoid();
    const category = categoryRef.child(categoryId);
    await category.set(
      {
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
      },
      (err) => {
        if (err) {
          //TODO: Log to logging service
          console.log(`error creating category \n ${err}`);
          ResponseHandler.clientError(res, 'Error creating category', 409);
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
          message: 'Category created successfully' });
      },
      (errObject) => {
        // TODO: log to logging service
        console.log(
          `error retrieving the new category \n ${errObject.name} : ${errObject.message}`
        );
        ResponseHandler.clientError(res, 'Error retrieving the new category', 409);
      }
    );
  } catch (err) {
    console.log(`request error ${err}`);
  }
});
// route to update a category's attributes
router.patch(
  "/category/:categoryId",
  hasSession,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const categoryId = req.params.categoryId,
        categoryRef = usersRef
          .child(userId)
          .child("categories")
          .child(categoryId);
      await categoryRef.update(
        {
          name: req.body.name,
          description: req.body.description,
          image: req.body.image,
        },
        (err) => {
          if (err) {
            // TODO: log error to logging service
            console.log(err);
            ResponseHandler.clientError(res, "Error updating category");
          }
        }
      );
    ResponseHandler.requestSuccessful({ res, message: 'Category updated successfully'});
    } catch (err) {
      // TODO: log to logging service
      console.log(err);
      ResponseHandler.clientError(res, "Error updating category");
    }
  }
);
// route to update a category's bookmarks
router.patch(
  "/category/:categoryId/bookmarks",
  hasSession,
  async (req: Request, res: Response) => {
    try {
      // user must have a session
      const userId = req.session.userId;
      const categoryId = req.params.categoryId,
        updateType: bookmarkUpdateType = req.body.updateType,
        bookmarksToUpdate: [] = req.body.bookmarks,
        // get a ref to the bookmarks object
        bookmarksRef = usersRef.child(`${userId}/bookmarks`);

      // push the bookmarks to the bookmarks object
      await bookmarksRef.once(
        "value",
        async (bookmarksSnapshot) => {
          if (updateType === bookmarkUpdateType.ADD) {
            console.log("user wants to add a bookmark");
            bookmarksToUpdate.forEach(async (bookmark) => {
              bookmarksRef.push(
                {
                  categoryId,
                  tweetId: bookmark,
                },
                (err) => {
                  if (err) {
                    // TODO: log to loggin service
                    console.log(`Error creating bookmarks in category ${err}`);
                    ResponseHandler.clientError(res, "Error creating bookmarks in category");
                  }
                }
              );
            });
            // return success message
            return res.status(200).send("bookmarks added successfully");
            // check the update type
          } else if (updateType === bookmarkUpdateType.DELETE) {
            console.log("user wants to delete a bookmark");
            if (bookmarksSnapshot.exists()) {
              // traverse through the bookmarks
              bookmarksSnapshot.forEach((bookmark) => {
                // check if the category id matches the provided category
                bookmarksToUpdate.forEach(async (bookmarkToDelete) => {
                  if (
                    bookmark.child("categoryId").val() === categoryId &&
                    bookmark.child("tweetId").val() === bookmarkToDelete
                  ) {
                    // delete the bookmark
                    await bookmark.ref.remove((err) => {
                      if (err) {
                        // TODO: log to logging service
                        console.log(
                          `Error removing bookmark see description below: \n ${err}`
                        );
                        return res.send(
                          "There was an error removing this bookmark. please try again."
                        );
                      }
                    });
                  }
                });
              });
              // return success message
              ResponseHandler.requestSuccessful({ res, message: 'Bookmarks added successfully'});
            } else {
              // add the snapsh
              console.log("User does not have bookmarks object");
              ResponseHandler.clientError(res, "No bookmarks in this category.", 404);
            }
          } else {
            ResponseHandler.clientError(res, "Invalid update type. Try another request.");
          }
        },
        (errorObject) => {
          // TODO: log to logging service
          console.log(
            `error accessing bookmarks \n ${errorObject.name} : ${errorObject.message}`
          );
          return res
            .status(409)
            .send("There was an error accessing your bookmark");
        }
      );
    } catch (err) {
      console.log(err);
      ResponseHandler.clientError(res, "Error updating bookmarks");
    }
  }
);
// route to delete a category
router.delete(
  "/categories/:categoryId",
  hasSession,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;

      const categoryId = req.params.categoryId,
        // get a ref to the specified category and remove it
        categoryRef = usersRef.child(`${userId}/categories/${categoryId}`);
      await categoryRef.remove((err) => {
        // TODO: log to logging service
        if (err) {
          console.log(`Error deleting category. see details below: \n ${err}`);
        }
      });
      // list of bookmark removal promises
      const bookmarkRemovalPromiseList: Promise<any>[] = [],
        // async function to delete bookmarks
        deleteBookmark = async (bookmarkSnapshot: DataSnapshot) => {
          if (bookmarkSnapshot.child("categoryId").val() === categoryId) {
            await bookmarkSnapshot.ref.remove((err) => {
              // TODO: log to logging service
              if (err) {
                console.log(
                  `Error deleting bookmark. see details below: \n ${err}`
                );
              }
            });
          }
        };
      // traverse bookmarks object and delete every bookmark whose category id matches the specified category id
      await usersRef
        .child(`${userId}/bookmarks`)
        .once("value", async (bookmarksSnapshot) => {
          bookmarksSnapshot.forEach((bookmarkSnapshot) => {
            bookmarkRemovalPromiseList.push(deleteBookmark(bookmarkSnapshot));
          });
          // fulfill bookmark removal promises
          await Promise.all(bookmarkRemovalPromiseList);
          // send success message
          return res.send("category deleted successfully.");
        });
    } catch (err) {
      console.log(
        `There was an error accessing delete categories endpoint. see full error below: \n ${err}`
      );
      ResponseHandler.clientError(res, "Error deleting category");
    }
  }
);
export { router };

