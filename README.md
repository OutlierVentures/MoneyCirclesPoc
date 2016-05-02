# MoneyCirclesBitReserve
The Proof of Concept implementation of MoneyCircles using the Uphold API.

The implementation consists of:
- Node.js backend (using TypeScript) - directory /
- AngularJS frontend (using TypeScript, Bootstrap) - directory /client/
- MongoDB database
- Ethereum private blockchain
- Uphold API - external

# Environments

## Production environment

The live version runs here: https://www.blockstars.io:3124/. It has its own instance of MongoDB, Eth blockchain and Uphold app.

# Installation

For development on your local machine, at least the Node.js backend should run locally. You'll need access to the following components:

- MongoDB database
- Ethereum node
- Uphold API. If you don't have internet access, the app can be configured to use stubs for limited offline functionality with fake data.

If you don't have MongoDB running locally, use the sandbox database on MongoLab listed in [config.default.json](config.default.json).

The MongoDB database and the contracts on the Ethereum node contain data that refers to each other, hence they need to be in sync. For example each Circle is represented as a smart contract on the Ethereum blockchain, the address of which is stored in the MongoDB. If you run the node backend using an existing MongoDB database and a local Ethereum node that doesn't contain the smart contracts that this database refers to, you'll run into errors.

## Docker installation (preferred)

Installation using the Docker containers is preferred for maximal portability. The Docker installation is used for live deployment. It consists of two containers. The containers haven't been added to the public Docker registry; they have to be built locally from the `Dockerfile` on the machine where they will be run.

* `blockstars/mcpoc_blockchain`: Ethereum node with `geth`, including the [Embark framework](https://github.com/iurimatias/embark-framework) to manage the private blockchain.
* `blockstars/mcpoc_server`: Node.js backend with all dependencies to run the backend.

The commands to build and run the containers have been automated in scripts in the directory `docker/`. These scripts contain further comments on which commands are run and why.

### Prerequisites

* Docker 1.9.1. Tested on Ubuntu 14.04 and Windows 8.1, should run on any system where Docker runs.

#### Running on Windows
When running on **Windows**: Docker uses a virtual Linux machine running in VirtualBox as the machine that runs the containers. This has consequences for the way you can interact with the containers.

* **RAM for the virtual machine**: Configure the Docker machine with at least 2GB RAM and preferrably >3GB. This speeds up mining considerably. This is configured within VirtualBox in the settings of the `default` VM.
* **Shared folder mapping**: Make sure the Docker machine has access to the source code of this repository. By default, only the folder `C:\Users` and below is made available within the Docker machine as `/c/Users`. If your working folder is outside of this path, add a shared folder in the Settings of the `default` VM within VirtualBox.
* **Unix line endings**: Configure git to use Unix line endings for the repository. As they will be accessed from a Linux VM, the default Windows line endings (CR+LF) will cause all kinds of errors.

Configure the checked out repository to use Unix Line endings:

```
git config core.autocrlf false
git config core.eol lf
```

Update the line endings of the files on disk:

```
git rm --cached -rf .
git reset --hard HEAD
```

* **Access services through the docker machine**: To access services exposed on the containers (for example the JSON RPC port of the blockchain node), understand that these will be available on the Docker machine which has a different IP address. Hence not `https://localhost:3124` but for example `https://192.168.99.100:3124`. The IP address of the Docker machine is shown when you open Docker Quickstart Terminal.

### Installation instructions

The installation instructions assume an installation under `/p/MoneyCircles/MoneyCirclesBitReserve` and using the `development` environment. When running on Windows, use the Docker Quickstart Terminal to execute these commands. On Linux / Mac OS a regular terminal will do.

#### Blockchain container
Building:

```
cd /p/MoneyCircles/MoneyCirclesBitReserve/docker
sh ./build-blockchain.sh
```

Building takes a long time (10-20 minutes) because it downloads quite a lot of data, installs a lot of libraries and builds the "DAG" needed for Ethereum mining.

Running:

```
sh ./run-blockchain.sh development
```

The first run might take several minutes as the data structure is created and the first blocks are mined; after that it should start in under one minute.

#### Server container

Building:

```
cd /p/MoneyCircles/MoneyCirclesBitReserve/docker
sh ./build-server.sh
```

Building is slightly faster than the blockchain container.

Running:

```
sh ./run-server.sh development
```

On **Windows** the install steps cannot be executed correctly from within the container. Make sure you run `npm install` before running the container. The `run` command will report some errors, but the service should run correctly.

You should now be able to open the app on the local machine by loading `https://[docker IP or mapped hostname]:3124` in a browser.  

### Troubleshooting

#### Server: source files volume not mapped correctly

If you get output like this:

```
$ ./run-server.sh development
mcpoc_server_development
Running install...
sh: 0: Can't open ./install.sh
Running first Grunt build...
grunt-cli: The grunt command line interface. (v0.1.13)

Fatal error: Unable to find local grunt.

If you're seeing this message, either a Gruntfile wasn't found or grunt
hasn't been installed locally to your project. For more information about
installing and configuring grunt, please see the Getting Started guide:

http://gruntjs.com/getting-started
```

Then the source files on the host aren't available from within the container. Debug this by opening a bash in the container.

## Local installation

The following instructions have been tested on a clean Ubuntu 14.04 installation. They might be slightly outdated. The commands in [the Dockerfile for the `server` container](docker/server/Dockerfile) are up-to-date.

The installation steps assume the default configuration in [config.default.json](config.default.json). To use a different configuration, copy that file to `config.json` and change what you need.

### Prerequisites

* An Ubuntu 14.04 install with root access (preferrably a virtual machine)
* A MongoDB instance. An instance at MongoLab is configured in the default configuration.
* A Uphold application. An existing application has been configured in the default configuration, which requires the app to be using the URL https://poc1-dev.moneycircles.com:3124. To facilitate this, do one of the following:
 * Ensure that `poc1-dev.moneycircles.com` resolves to the IP of your development machine (e.g. by adding `127.0.0.1 poc1-dev.moneycircles.com` to your hosts file)
 * Create a Uphold application of your own, configure it like you want it and configure its attributes like Client ID in `config.json`.
* An [Uphold account](https://uphold.com/signup) for authenticating as a user
* A second [Uphold account](https://uphold.com/signup) to serve as the global Circle Vault account (e.g. @moneycircles). The Circle Vault needs to use Pound Sterling as the Currency in the Uphold settings.

### Install instructions

1. Install prerequisites:

   `sudo apt-get install git curl`

2. Install Node 0.10 from the PPA using [these instructions](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-an-ubuntu-14-04-server). In summary:
   ```
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install build-essential
```

3. `git clone` this repository into a folder, say `~/dev/MoneyCirclesBitReserve`. As this is a private repository, make sure an SSH key or token has been configured.

   `git clone git@github.com:OutlierVentures/MoneyCirclesBitReserve.git`

4. Install global dependencies from `npm`:

   ```
sudo npm install -g typescript nodemon grunt-cli tsd bower node-gyp
sudo chown -R $USER.$USER ~/.npm
```

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

The install steps can be run in one go from `install.sh`.


### Building

As the code is written in TypeScript, it has to be compiled using `tsc`. A `grunt` task has been included to facilitate this.

To build the code:

`grunt`

The output should look something like this:

```
aron@orangeblack:~/dev/MoneyCirclesBitReserve$ grunt
Running "ts:build" (ts) task
Compiling...
Using tsc v1.5.3



TypeScript compilation complete: 1.54s for 26 typescript files

Done, without errors.
```

### Running

1. Start the node server:

   `grunt serve`

   The output should look something like this:

   ```
aron@orangeblack:~/dev/MoneyCirclesBitReserve$ grunt serve
Running "concurrent:watchers" (concurrent) task
    Running "watch" task
    Waiting...
    Running "nodemon:dev" (nodemon) task
    [nodemon] v1.3.8
    [nodemon] to restart at any time, enter `rs`
    [nodemon] watching: *.*
    [nodemon] starting `node server.js`
    http server started on port 3123
    https server started on port 3124
```

2. Open https://poc1-dev.moneycircles.com:3124 in a browser

   Requests to the server are logged to the console like this:

   ```
    GET / 200 4.566 ms - 4123
    GET /vendors/bootstrap/dist/css/bootstrap.min.css 200 19.549 ms - 122540
    GET /vendors/angular-sanitize/angular-sanitize.min.js 200 22.721 ms - 6082
    GET /js/services.js 200 24.549 ms - 2487
    ...
```

   Note: Because we currently use a self-signed certificate, the browser will prevent opening the page. Bypass these warnings to open the app.

3. Log in as the global Circle Vault account (by default @MoneyCircles) once. The access token for the global Circle Vault is necessary to pay out loans.

### Live building

The `grunt serve` task includes modules to detect changes to the TypeScript files, recompile them and restarting Node on the fly. You don't need to do anything beyond starting `grunt serve`.

When any .ts file is changed, a rebuild occurs, which looks like this:

```
    >> File "client/js/app.ts" changed.
    >> File "server.ts" changed.

    Running "ts:build" (ts) task
    Compiling...
    Using tsc v1.5.3
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] starting `node server.js`
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...



    TypeScript compilation complete: 1.33s for 26 typescript files

    Running "watch" task
    Completed in 2.180s at Tue Sep 01 2015 20:28:49 GMT+0200 (CEST) - Waiting...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] starting `node server.js`
    http server started on port 3123
    https server started on port 3124
```

# Tests

Unit tests are available for the contracts. The unit tests are run just like normal interactions with the smart contracts, on a blockchain node. This makes them very slow: the current test sets takes around 10 minutes to run completely on a powerful laptop.

## Configuration

Because they are run in a special environment, the tests have a separate configuration file [tests/web3config.ts](tests/web3config.ts).

## Running tests

### Command line

Run:

`npm test`

### Visual Studio with Node Tools for Visual Studio

NTVS recognizes the unit tests and makes them available in the Visual Studio Test Explorer. Debugging them works well, and is a great way to see the contracts run.

# Development guidelines

### Common

* Use `tsd` to search for and install TypeScript typings. These facilitate syntax completion and design-time error checking. Two separate `tsd` configurations are used: `/tsd.json` for the backend, `/client/tsd.json` for the front end.

### Backend

* Use classes for controllers
* Use fat arrow syntax (`someFunction = (req: express.Request, res: express.Response) => { ... }`) for functions that will be called by Express routes.
* Use `npm` for all dependencies.

### Frontend

* Use classes for controllers, services, models
* Use `bower` for all dependencies

### Tools

I've found the following tools to be helpful:

* Visual Studio Community 2013
* Node Tools for Visual Studio - allows for step-through debugging of Node.js code
* Atom Editor with the TypeStrong TypeScript extension. This doesn't have debugging functionality, but it's lighter and quicker than Visual Studio and the design-time checks and enhancements (syntax completion/checking etc) are practically on the same level.

### Addition Bart after install 9-12-2015 (on Mac)
Install and run Ubuntu using:
```bash
docker run -it unbuntu:latest
```

Cloning the repo without setting up the SSH key etc., can be done by cloning the `https://` address instead of `git@github..`:
`git clone https://github.com/OutlierVentures/MoneyCirclesBitReserve.git`

I then had the `master` branch locally. I then got also the development branch and created own branch from the 'development' branch with:
`git checkout -b development origin/development`

followed by:
`git checkout -b development-bart`
