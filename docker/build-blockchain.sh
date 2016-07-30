#!/bin/sh

# Update the version number here after changing Dockerfile.
docker build $1 $2 $3 -t "blockstars/mcpoc_blockchain:1.0.2" blockchain/
