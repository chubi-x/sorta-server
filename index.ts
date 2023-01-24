import express, { Express, NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
import https from "https";
import dotenv from "dotenv";
dotenv.config();
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

// logging service

Sentry.init({
  dsn: "https://72040473a3c54bc291b7a284bd9408af@o4504559962882048.ingest.sentry.io/4504559967010816",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());
// session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: true,
    name: "user",
    cookie: {
      maxAge: threeDays,
      httpOnly: false,
      sameSite: "none",
      secure: true,
    },
    resave: false,
  })
);
// set response headers headings
app.use((req: Request, res: Response, next: NextFunction) => {
  // for vite dev environment
  res.setHeader("Access-Control-Allow-Origin", `${process.env.FRONT_END_URL!}`);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Access-Control-Request-Method, Access-Control-Request-Headers, ngrok-skip-browser-warning"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );

  // // cache get request
  // const cachePeriod = 20 * 60; //twenty minutes
  // if (req.method == "GET" && req.url == "/bookmarks") {
  //   res.setHeader(
  //     "Cache-Control",
  //     `private,must-revalidate, max-age=${cachePeriod}`
  //   );
  // } else {
  //   res.setHeader("Cache-Control", "no-store");
  // }
  next();
});
// use cookie parser
app.use(cookieParser());

// use body parser
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// define routes
app.use("/", authRouter);
app.use("/user", userRouter);
app.use("/bookmarks", bookmarkRouter);
app.use("/categories", categoryRouter);

app.use(Sentry.Handlers.errorHandler());
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

