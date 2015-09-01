# MoneyCirclesBitReserve
The Proof of Concept implementation of MoneyCircles using the BitReserve API.

The implementation consists of:
- Node.js backend (using TypeScript) - directory /
- AngularJS frontend (using TypeScript) - directory /client/
- MongoDB database - external
- BitReserve API - external

## Installation

The following instructions have been tested on a clean Ubuntu 14.04 installation.

### Prerequisites

* An Ubuntu 14.04 install with root access (preferrably a virtual machine)
* A MongoDB instance. An instance at MongoLab is configured in the current (hard-coded) configuration.

### Install instructions

1. Install prerequisites:

   ```sudo apt-get install git curl```

2. Install Node 0.10 from the PPA using [these instructions](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-an-ubuntu-14-04-server). In summary:
   ```
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install build-essential
```

3. ```git clone``` this repository into a folder, say ```~/dev/MoneyCirclesBitReserve```. As this is a private repository, make sure an SSH key or token has been configured.
4. Install global dependencies from ```npm```:

   ```sudo npm install -g typescript nodemon grunt-cli tsd bower node-gyp```

4. Run package installs for the server side:

   ```
cd ~/dev/MoneyCirclesBitReserve
npm install
tsd install
```

5. Run package installs for the client side:

   ```
cd ~/dev/MoneyCirclesBitReserve/client
tsd install
bower install
```

TODO: automate the package installs with grunt tasks.

### Building

As the code is written in TypeScript, it has to be compiled using ```tsc```. A ```grunt``` task has been included to facilitate this.

To build the code:

```
grunt
```

### Live building

A ```grunt``` task is included to run the Node server, compile TypeScript files on change and restart Node when necessary.

To run and watch for changes:

```
grunt serve
```

## Development guidelines

### Common

* Use ```tsd``` to search for and install TypeScript typings. These facilitate syntax completion and design-time error checking. Two separate ```tsd``` configurations are used: ```/tsd.json``` for the backend, ```/client/tsd.json``` for the front end.

### Backend

* Use classes for controllers
* Use fat arrow syntax (```someFunction = (req: express.Request, res: express.Response) => { ... }```) for functions that will be called by Express routes.
* Use ```npm``` for all dependencies.

### Frontend

* Use classes for controllers, services, models
* Use ```bower``` for all dependencies


