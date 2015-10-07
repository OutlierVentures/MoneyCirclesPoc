#!/bin/sh

export CONTAINER_NAME=mcpoc_blockchain

docker rm $CONTAINER_NAME
docker run -p 8101:8101 -v `pwd`/..:/app \
	 -v `pwd`/../../mcpoc_blockchain_data:/blockchain \
	 --name $CONTAINER_NAME -t -i blockstars/mcpoc_blockchain bash
