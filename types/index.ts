import { Session } from "express-session";
import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
// import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types";
declare module "express-session" {
  interface Session {
    oAuth: IOAuth2RequestTokenResult;
  }
}
declare module "qs" {
  interface ParsedQs {
    code: string;
  }
}