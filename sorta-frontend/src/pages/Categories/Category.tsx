import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookmarksContextInterface } from "../../App";

import { Menu } from "../../layouts";
import { Bookmark } from "../Bookmarks";
import { MoreButton } from "../../components/buttons";
import { CardDropdown } from "../../components/dropdowns";
import { QueryObserverResult } from "react-query";

import emptyCategoriesImage from "../../assets/images/empty_categories.svg";
import backIcon from "../../assets/icons/back.svg";
import help from "../../assets/icons/help.svg";
import { dropdownItems } from ".";

type Props = {
  bookmarksContext: BookmarksContextInterface;
  categories: Category[];
};

export function Category({ bookmarksContext, categories }: Props) {
  const { bookmarks } = bookmarksContext;

  const [showTooltip, setShowTooltip] = useState(false);

  const navigate = useNavigate();

  const params = useParams();
  const { id } = params;
  var category = categories.find((item) => item.id === id);
  const { name, image, description } = { ...category };
  const categoryBookmarks = bookmarks?.data?.filter((bookmark) =>
    category?.bookmarks?.includes(bookmark?.id)
  );
  function backToCategories() {
    navigate("/categories");
  }

  const emptyCategory = (
    <div className="categories--empty">
      <img src={emptyCategoriesImage} alt="empty categories image" />
      <p>
        No bookmarks here yet <br /> click on the button below to add bookmarks
      </p>
      <button className="primary-btn primary-btn--medium">Add bookmarks</button>
    </div>
  );
  const fullCategory = categoryBookmarks.map((bookmark, index) => (
    <Bookmark
      key={bookmark.id}
      bookmark={bookmark}
      bookmarksLength={categoryBookmarks.length}
      index={index}
    />
  ));
  return (
    <div className="category__page__wrapper">
      <Menu />
      <div className="category__page">
        <div className="category__page__banner" style={{ backgroundImage: `url(${image})` }}>
          <div className="category__page__banner__controls">
            <div className="back-button" onClick={backToCategories}>
              <img src={backIcon} alt="back button icon" />
            </div>
            <div className="category__page__dropdown__container">
              <MoreButton showTooltip={setShowTooltip} />
              {showTooltip && (
                <CardDropdown items={dropdownItems} show={setShowTooltip} resourceId={id} />
              )}
            </div>
          </div>
          <div className="category__page__banner__text__wrapper rounded-none">
            <div className="category__page__banner__text">
              <h2>{name}</h2>
              <p>
                <span className="text-primary-1">Description: </span> {description}
              </p>
            </div>
          </div>
        </div>
        <div className="category__page__bookmarks__wrapper">
          <div className="my-6 flex items-center justify-between text-primary-1 tall:w-auto">
            <p className="font-semibold">All Bookmarks</p>

            <p className="mr-1 flex cursor-help items-center space-x-2 self-start font-medium">
              <img src={help} alt="help icon" width={"20px"} />
              <span className="hidden md:inline">Need Help?</span>
            </p>
          </div>
          <div className="category__page__bookmarks">
            {categoryBookmarks.length > 0 ? fullCategory : emptyCategory}
          </div>
        </div>
      </div>
    </div>
  );
}
