export enum ACTIVE_TAB_ACTIONS {
  BOOKMARKS_ACTIVE = "BOOKMARKS ACTIVE",
  CATEGORIES_ACTIVE = "CATEGORIES_ACTIVE",
}
export enum CATEGORY_MODAL_ACTIONS {
  CREATE_CATEGORY = "CREATE_CATEGORY",
  EDIT_CATEGORY = "EDIT_CATEGORY",
  OPEN_MODAL = "OPEN_MODAL",
  CLOSE_MODAL = "CLOSE_MODAL",
  SET_CATEGORY_ID = "SET_CATEGORY_ID",
}
export interface CategoryModalAction {
  createCategory: boolean;
  editCategory: boolean;
}
export interface CategoryModalActionsInterface {
  type: CATEGORY_MODAL_ACTIONS;
  payload?: string;
}
export interface ActiveTabState {
  activeTab: string;
  bookmarksActive: boolean;
  categoriesActive: boolean;
}
export interface ActiveTabAction {
  type: ACTIVE_TAB_ACTIONS;
}

export interface CategoryModalState {
  categoryModalOpen: boolean;
  categoryModalAction: CategoryModalAction;
  categoryIdToUpdate: string | undefined;
}

export function activeTabReducer(state: ActiveTabState, action: ActiveTabAction) {
  const { type } = action;
  switch (type) {
    case ACTIVE_TAB_ACTIONS.BOOKMARKS_ACTIVE:
      return { bookmarksActive: true, categoriesActive: false, activeTab: "bookmarks" };
    case ACTIVE_TAB_ACTIONS.CATEGORIES_ACTIVE:
      return { bookmarksActive: false, categoriesActive: true, activeTab: "bookmarks" };

    default:
      return state;
  }
}

export function categoryModalReducer(
  state: CategoryModalState,
  action: CategoryModalActionsInterface
) {
  const { type, payload } = action;
  let newState: CategoryModalState;
  switch (type) {
    case CATEGORY_MODAL_ACTIONS.CREATE_CATEGORY:
      newState = {
        ...state,
        categoryModalAction: { createCategory: true, editCategory: false },
      };
      return newState;

    case CATEGORY_MODAL_ACTIONS.EDIT_CATEGORY:
      newState = {
        ...state,
        categoryModalAction: { createCategory: false, editCategory: true },
      };
      return newState;

    case CATEGORY_MODAL_ACTIONS.OPEN_MODAL:
      newState = {
        ...state,
        categoryModalOpen: true,
      };
      return newState;
    case CATEGORY_MODAL_ACTIONS.CLOSE_MODAL:
      newState = {
        ...state,
        categoryModalOpen: false,
      };
      return newState;

    case CATEGORY_MODAL_ACTIONS.SET_CATEGORY_ID:
      newState = {
        ...state,
        categoryIdToUpdate: payload,
      };
      return newState;

    default:
      return state;
  }
}
