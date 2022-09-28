import express, { Express } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
import { router } from "./routes/routes";
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
// set cookie parser
app.use(cookieParser());

// use routes
app.use(router);

// PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
