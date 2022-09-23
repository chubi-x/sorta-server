# TODO

- connect redis session store
- render error html before redirecting
- for every route that goes to db for access token, check if it has expired.
  if it has, use the refresh token to get a new access token
  then save the new access and refresh tokens to db
- figure out how to use pagination to get all user bookmarks
- always check if user exists in db before running any db logic

## ROUTES

- route to get user info from db
- route to update a category (including adding a bookmark to it)
- route to delete a category
