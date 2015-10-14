FROM ubuntu:14.04
MAINTAINER Aron van Ammers

RUN apt-get update
RUN apt-get install -y curl git build-essential python screen

# Install node 0.12
RUN curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get install -y nodejs

RUN npm install -g embark-framework grunt-cli bower tsd typescript

# Install latest geth
# This command requires input of a 'y'. Comment out the line to
# wait_for_user to prevent that.
RUN curl https://install-geth.ethereum.org -L | sed 's/\twait_for_user/\techo "Skipping user confirmation"\n#wait_for_user/g' > installer_geth.sh && bash installer_geth.sh

# Install solidity compiler
RUN apt-get install -y solc

# The start command for the container includes the install steps for embark.
# The embark files are not part of the container filesystem, hence tasks
# like 'npm install' could require action since the last container build.
# Furthermore we run embark in a 'screen' session so that we can easily
# connect to the container and run other tasks in parallel if necessary.

WORKDIR /app/embark
ENTRYPOINT screen bash -c 'sh ./install.sh; embark blockchain staging'
