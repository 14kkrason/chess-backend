# Notice

This version of the API is barren and does not adhere to good standards, such as SOLID methodology or Unit/Integration testing. It was written hastily, with not much tought besides 'get it done on time', which was a method that succeeded. It is kept on this branch for legacy reasons. It should NOT be touched for reasons other than showing off what was done for my B.Sc thesis. An effort to develop this app further is pursued on the master branch.

### Chess Backend

API that makes it possible to play chess games online. Written in NestJS.

## How to run this API in development?

This app uses Node.js version 14.15.1, MongoDB version 5.0 and Redis 6.2 with Redisearch module installed.

1. Create .env file based on the .env-example template.
2. Install all required packages.
3. Run Redis and MongoDB - either as a services or via Docker.

I used Docker Desktop for Windows, constructing basic containers with MongoDB and Redis using this commands:

docker run -d -p 6379:6379 redislabs/redisearch:latest <---- Redis with Redisearch

docker run -d --network mongo-network -p 27017:27017 
--name mongodb 
-e MONGO_INITDB_ROOT_USERNAME=admin 
-e MONGO_INITDB_ROOT_PASSWORD=admin 
mongo <---- MongoDB
