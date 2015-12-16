#!/bin/sh

CONTAINER_BASE_NAME=mcpoc_server
ENVIRONMENT=$1

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "Usage: `basename "$0"` [ENVIRONMENT] \
where ENVIRONMENT in (development|staging|production)."
	exit 1
fi

CONTAINER_NAME="$CONTAINER_BASE_NAME"_"$ENVIRONMENT"

if [ "`docker ps -a | grep $CONTAINER_NAME`" ]; then
	docker rm $CONTAINER_NAME
fi

# Link the app dir under /app. The app dir is the parent folder of the script.
# Link the blockchain node under name "blockchain".
# Update the version number here after building an image with a new version number.
docker run -p 3124:3124 \
	-v /`pwd`/..:/app \
	--link mcpoc_blockchain_$ENVIRONMENT:blockchain \
	--name $CONTAINER_NAME -t -i blockstars/mcpoc_server:1.0.1 bash
