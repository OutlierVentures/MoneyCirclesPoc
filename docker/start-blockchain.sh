#!/bin/sh

export CONTAINER_NAME=mcpoc_blockchain

docker start $CONTAINER_NAME
docker attach $CONTAINER_NAME