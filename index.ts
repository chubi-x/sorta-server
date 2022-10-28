import express, { Express, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
import https from "https";
import fs from "fs";
import {
  bookmarkRouter,
  categoryRouter,
  authRouter,
  userRouter,
} from "./controllers";
// initialize express app
const app: Express = express(),
  // cookie age
  threeDays = 1000 * 60 * 60 * 72;

// set access control headings
app.use((req: Request, res: Response, next: NextFunction) => {
  // for vite dev environment
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH");
  next();
});

// session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: false,
    cookie: {
      maxAge: threeDays,
      httpOnly: false,
      sameSite: "none",
      secure: true,
    },
    resave: false,
  })
);
// create middleware to cache GET requests
const setCache = (req: Request, res: Response, next: NextFunction) => {
  // set cache period
  const period = 60 * 60; //one hour
  if (req.method == "GET") {
    res.set("Cache-Control", `public, max-age=${period}`);
  } else {
    res.set("Cache-Control", "no-store");
  }
  next();
};
app.use(setCache);
// use body parser
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
// use cookie parser
app.use(cookieParser());

// define routes
app.use("/", authRouter);
app.use("/user", userRouter);
app.use("/bookmarks", bookmarkRouter);
app.use("/categories", categoryRouter);

// PORT
const PORT = process.env.PORT;

// setup local https
const options = {
  key: fs.readFileSync("./config/localhost+2-key.pem"),
  cert: fs.readFileSync("./config/localhost+2.pem"),
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
// const server = app.listen(PORT, () => {
// });

