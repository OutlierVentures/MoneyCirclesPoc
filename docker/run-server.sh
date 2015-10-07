#!/bin/sh

export CONTAINER_NAME=mcpoc_server

docker rm $CONTAINER_NAME

# Link the app dir under /app. The app dir is the parent folder of the script.
# Link the blockchain node under name "blockchain".
docker run -p 3124:3124 -v `pwd`/..:/app \
	--link mcpoc_blockchain:blockchain \
	--name $CONTAINER_NAME -t -i blockstars/mcpoc_server bash
