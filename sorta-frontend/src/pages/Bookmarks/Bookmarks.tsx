// LIBRARIES
import { useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { useNavigate } from "react-router";

// APIS
import { fetchBookmarks } from "../../api/bookmarks-api";
import { useQuery } from "react-query";
// COMPONENTS
import { Bookmark } from "./Bookmark";

// TYPES
import { BookmarksContextInterface } from "../../App";

type BookmarksProps = {
  user: User;
  bookmarksContext: BookmarksContextInterface;
};
export function Bookmarks({ user, bookmarksContext }: BookmarksProps) {
  const { bookmarks, setBookmarks, helpers } = bookmarksContext;

  const bookmarksPerPage = 20;
  const [pageLoading, setPageLoading] = useState(true);
  const [hasMoreBookmarks, setHasMoreBookmarks] = useState(true);
  const [numOfBookmarksToRender, setNumOfBookmarksToRender] = useState(bookmarksPerPage);
  const navigate = useNavigate();

  const getBookmarks = async () => {
    const abortController = new AbortController();
    const response: BookmarksResponse = await fetchBookmarks(abortController);
    return response;
  };

  useQuery("get-bookmarks", getBookmarks, {
    onSuccess(data) {
      if (data.success) {
        setBookmarks({ ...data.data });
        sessionStorage.setItem("bookmarks", JSON.stringify(data.data));
      } else {
        alert(data.message);
        navigate("/login");
      }
    },
    onError(err) {
      alert(err);
      navigate("/login");
    },
  });

  const renderBookmarks = (bookmarksArray: Bookmark[] | undefined): JSX.Element[] => {
    let renderedBookmarks = [];
    for (let i = 0; i < numOfBookmarksToRender; i++) {
      if (bookmarksArray) {
        if (pageLoading) {
          setPageLoading(false);
        }
        if (i < bookmarksArray.length) {
          renderedBookmarks.push(
            <Bookmark
              bookmark={bookmarksArray[i]}
              key={bookmarksArray[i].id}
              index={i}
              bookmarksLength={bookmarksArray.length}
            />
          );
        }
      }
    }
    return renderedBookmarks;
  };
  const loadBookmarks = (bookmarksArray: Bookmark[]) => {
    if (numOfBookmarksToRender >= bookmarksArray?.length) {
      setHasMoreBookmarks(false);
    } else {
      setNumOfBookmarksToRender(numOfBookmarksToRender + bookmarksPerPage);
    }
  };
  const loadMoreBookmarks = () => {
    helpers.setBookmarksLoading(true);
    setTimeout(() => {
      loadBookmarks(bookmarks?.data!);
      helpers.setBookmarksLoading(false);
    }, 1000);
  };
  const loaderComponent = (
    <div
      className={`mt-10 flex justify-center ${helpers.bookmarksLoading ? "hidden" : "flex"}`}
      key={0}
    >
      <button onClick={loadMoreBookmarks} className="primary-btn primary-btn--medium">
        Load More
      </button>
    </div>
  );
  const infiniteScroll = (
    <InfiniteScroll
      pageStart={0}
      loadMore={() => {}}
      hasMore={hasMoreBookmarks}
      loader={loaderComponent}
      useWindow={false}
    >
      {renderBookmarks(bookmarks?.data)}
    </InfiniteScroll>
  );
  return (
    <>
      <div className="bookmarks__wrapper">
        <div className="bookmarks" ref={helpers.bookmarksScrollRef}>
          {!pageLoading && infiniteScroll}
        </div>
      </div>
    </>
  );
}
