import express, { Express, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
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
// use body parser
app.use(bodyParser.json());

// session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: true,
    cookie: {
      maxAge: threeDays,
      httpOnly: false,
    },
    resave: true,
  })
);
// use cookie parser
app.use(cookieParser());

// set CORS header
app.use((req: Request, res: Response, next: NextFunction) => {
  // for vite dev environment
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173/");
  res.header(
    "Access-Control-Allow-Headers",
    "Orign, X-Requested-With,Content-Type,Accept"
  );
  next();
});
// use routes
app.use("/", authRouter);
app.use("/user", userRouter);
app.use("/bookmarks", bookmarkRouter);
app.use("/categories", categoryRouter);

// PORT
const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

export { server, app };

