#!/bin/sh

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
