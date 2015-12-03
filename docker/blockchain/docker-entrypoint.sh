#!/bin/sh

# The entry point for the blockchain container which starts the local
# Ethereum blockchain through Embark. The blockchain data resides on the host,
# in a directory mapped to /blockchain in the container.

# On first run the directory is created and several blocks are mined to fund
# the main account. That takes some time.

# When running on Windows with the files mapped from an NTFS volume, the first
# two runs run into an error because of filesystem issues. This is worked
# around the dumb way by starting three times. In each of the first two tries
# a part of the blockchain data structure is created successfully, which
# makes it possible for the third run onwards to be successful. Any runs
# using the same blockchain structure after that are successful.

# TODO: parameterize environment (development, staging, production)

echo "Starting embark blockchain..."
embark blockchain staging

if [ ! -e /blockchain/mcpoc_staging/dapp ]; then
    echo "Blockchain dapp data dir not created. You are on Windows, right? Trying again."
    embark blockchain staging
fi

if [ ! -e /blockchain/mcpoc_staging/nodes ]; then
    echo "Blockchain nodes dir not created. You are on Windows, right? Trying again."
    embark blockchain staging
fi

echo "Command finished. Press enter to continue. To inspect the container, try running "docker exec -ti CONTAINER bash" while it is still running and look around."

# Wait for enter to allow inspecting the running container.
read
