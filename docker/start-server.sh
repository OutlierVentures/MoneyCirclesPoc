#!/bin/sh

export CONTAINER_NAME=mcpoc_server

docker start $CONTAINER_NAME
docker attach $CONTAINER_NAME