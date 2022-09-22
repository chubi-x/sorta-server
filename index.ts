import express, { Express, Request, Response } from "express";
import { router } from "./routes/routes";
// initialize express app
const app: Express = express();

app.use(router);

// PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
