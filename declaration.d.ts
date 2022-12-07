interface User {
  id: string;
  accessToken: string;
  name: string;
  pfp: string;
  refreshToken: string;
  tokenExpiresIn: number;
  verified: boolean;
}

interface Bookmarks {
  data: Bookmark[];
  meta: object;
}

interface Bookmark {
  text: string;
  id: string;
  author_id: string;
  author_name: string;
  author_pfp: string;
  author_username: string;
  author_verified: string;
  created_at: string;
  entities: {
    urls: TweetEntityUrl[];
  };
}
interface Category {
  id: string;
  name: string;
  description: string;
  image?: string;
  bookmarks: Bookmark[];
}
