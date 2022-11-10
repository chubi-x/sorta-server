import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types/auth.types";
// import { IOAuth2RequestTokenResult } from "twitter-api-v2/dist/types";
declare module "express-session" {
  interface Session {
    oAuth: IOAuth2RequestTokenResult;
    userId: string;
  }
}
declare module "qs" {
  interface ParsedQs {
    code: string;
  }
}

declare module "twitter-api-v2" {
  interface TweetV2 {
    author_pfp: string | undefined;
    author_verified: boolean | undefined;
    author_name: string | undefined;
    author_username: string | undefined;
  }
}

