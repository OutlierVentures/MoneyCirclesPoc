FROM ubuntu:14.04
MAINTAINER Aron van Ammers

RUN apt-get update
RUN apt-get install -y curl git build-essential python screen

# Install node 0.12
RUN curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get install -y nodejs

RUN npm install -g embark-framework grunt-cli bower tsd typescript

# We need the geth_extra_opts option which has been added after the
# current production version of Embark (1.0.2).
# TODO: remove this once this function is live.
# RUN cat /usr/lib/node_modules/embark-framework/lib/blockchain.js | sed 's/cmd += "--rpccorsdomain \\"" + config.rpcWhitelist + "\\" ";/cmd += "--rpccorsdomain \\"" + config.rpcWhitelist + "\\" ";\n\n\tif (config.geth_extra_opts) {\n\t\tcmd += config.geth_extra_opts + " ";\n\t}\n/g' > /usr/lib/node_modules/embark-framework/lib/blockchain.js

# Install latest geth
# This command requires input of a 'y'. Comment out the line to
# wait_for_user to prevent that.
RUN curl https://install-geth.ethereum.org -L | sed 's/\twait_for_user/\techo "Skipping user confirmation"\n#wait_for_user/g' > installer_geth.sh && bash installer_geth.sh

# Install solidity compiler
RUN apt-get install -y solc

# Generate the DAG for geth mining. This takes a lot of time and hence
# we want to prevent running it on every container run. It does add 1GB
# to the built image, but that is preferrable to our purposes.
RUN mkdir /root/.ethash
RUN geth makedag 0 /root/.ethash

# Create a working folder for Embark in the container filesystem because
# it requires symlinks. When running on Windows we can't create those in
# the mounted folder outside of the container.


# Add the Embark files to the container and run the install steps. As the
# embark config doesn't change often, we include this in the container build.

# To have the embark files be copied on every container creation/run, comment
# these lines and prepend the following to the ENTRYPOINT.
# 'echo "Copying Embark files to local directory..."; cp -rp /app/docker/blockchain/embark /embark; cd /embark; echo "Running install.sh...";sh ./install.sh;'

COPY embark /embark
WORKDIR /embark
RUN sh ./install.sh

# Run command:
# - copy files from the mounted embark folder outside of the container to
#	the in-container folder
# -  install and run from there.
# Embark is configured to use the in-container folder /blockchain for blockchain
# data. This folder is mounted in the run command (see run-blockchain.sh).
# The ENTRYPOINT ends with a "read" command to wait for input. That way we can exec
# into the container to see what's going on in case of a failure.

COPY ./docker-entrypoint.sh /

WORKDIR /embark

# Just use a bash shell as entry point. For debugging purposes.
#ENTRYPOINT bash

ENTRYPOINT ["/docker-entrypoint.sh"]
