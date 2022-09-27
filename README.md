# sorta-server
expressJS server for sorta, a twitter app that lets users categorize their bookmarks. 

## Looking for OS contributors!

### Getting Started
1. Create a twitter developer account (permissions should be able to read tweets and read/write user bookmarks)
2. create an app with the following settings:


    <img width="244" alt="image" src="https://user-images.githubusercontent.com/34838966/192272132-9fbf461b-e07e-4b97-827b-5c99d7bf10c3.png">
    <img width="234" alt="image" src="https://user-images.githubusercontent.com/34838966/192272610-cac01495-83c2-40a4-9cd6-872c3759c6e9.png">
    
    
3. Save your Consumer Keys and Oauth2 Client Keys and Client Secret in a .env file  
4. Create a firebase app and enable the Realtime Database on it.  
5. Save your google app credentials in the .env file  
6. Fork the repo, pick an issue, and start making changes!  
7. make a PR with your changes and wait for a review, and if accepted, a merge!  

### Useful docs and links

#### API

- https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v2.md#Bookmarks

- https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/auth.md#oauth2-user-wide-authentication-flow

- https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me

- https://developer.twitter.com/en/docs/twitter-api/tweets/bookmarks/api-reference
#### Storage

- https://firebase.google.com/docs/storage/?authuser=0#implementation_path

- https://firebase.google.com/docs/reference/node/firebase.database.DataSnapshot#exists

- https://firebase.google.com/docs/database/admin/retrieve-data#section-event-types
