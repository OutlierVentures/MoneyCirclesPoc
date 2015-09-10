# MoneyCirclesBitReserve
The Proof of Concept implementation of MoneyCircles using the BitReserve API.

The implementation consists of:
- Node.js backend (using TypeScript) - directory /
- AngularJS frontend (using TypeScript, Bootstrap) - directory /client/
- MongoDB database - external
- BitReserve API - external
 
## Test environment

A version of the development branch is running here: https://poc1-test.moneycircles.projects.blockstars.io:3124/. This version uses a different BitReserve app and database than the development configuration suggested below.

## Installation

The following instructions have been tested on a clean Ubuntu 14.04 installation.

The installation steps assume the default configuration in [config.default.json](config.default.json). To use a different configuration, copy that file to `config.json` and change what you need.

### Prerequisites

* An Ubuntu 14.04 install with root access (preferrably a virtual machine)
* A MongoDB instance. An instance at MongoLab is configured in the default configuration.
* A BitReserve application. An existing application has been configured in the default configuration, which requires the app to be using the URL https://poc1-dev.moneycircles.com:3124. To facilitate this, do one of the following:
 * Ensure that `poc1-dev.moneycircles.com` resolves to the IP of your development machine (e.g. by adding `127.0.0.1 poc1-dev.moneycircles.com` to your hosts file)
 * Create a BitReserve application of your own, configure it like you want it and configure its attributes like Client ID in `config.json`.
* A [BitReserve account](https://bitreserve.org/signup) for authenticating as a user
* A second [BitReserve account](https://bitreserve.org/signup) to serve as the global administrator account (e.g. @moneycircles). The global administrator needs to use Pound Stering as the Currency in the BitReserve settings.

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

TODO: automate the package installs with grunt tasks.

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

3. Log in as the global administrator account (by default @moneycircles) once. The access token for the global administrator is neccesary to pay out loans.

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
