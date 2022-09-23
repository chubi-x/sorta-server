import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import { router } from "./routes/routes";
// initialize express app
const app: Express = express();
// use body parser
app.use(bodyParser.json());
// use routes
app.use(router);

// PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
