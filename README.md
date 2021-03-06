# Time-Travel
Record & Report All Time & Travel

![Time-Travel](https://github.com/CoastalCommission/Time-Travel/blob/master/frontend/images/screenshot.png?raw=true)

### Setup

These commands install all dependencies

    git clone git@github.com:CoastalCommission/Time-Travel.git && cd Time-Travel
    npm install -g electron polymer-cli pm2
    cd backend && npm install
    cd ../frontend && npm install && bower install

Configure your LDAP connection by editing the values in `frontend/ldap-config.js`

### Launch Backend

This command initializes a new time-travel SQLite DB and or launches the API at `localhost:3040/time`

    cd backend && node api.js

### Launch Frontend in Browser

This command serves the app at `http://localhost:8080` and provides basic URL
routing for the app:

    cd frontend
    polymer serve --open

### Launch Frontend in Electron

This command opens the app within Electron

    cd frontend
    electron .

### Build

This command performs HTML, CSS, and JS minification on the application
dependencies, and generates a service-worker.js file with code to pre-cache the
dependencies based on the entrypoint and fragments specified in `polymer.json`.
The minified files are output to the `build/unbundled` folder, and are suitable
for serving from a HTTP/2+Push compatible server.

In addition the command also creates a fallback `build/bundled` folder,
generated using fragment bundling, suitable for serving from non
H2/push-compatible servers or to clients that do not support H2/Push.

    polymer build

### Test the build

This command serves the minified version of the app in an unbundled state, as it would
be served by a push-compatible server:

    polymer serve build/unbundled

This command serves the minified version of the app generated using fragment bundling:

    polymer serve build/bundled

### Extend

You can extend the app by adding more elements that will be demand-loaded
e.g. based on the route, or to progressively render non-critical sections
of the application.  Each new demand-loaded fragment should be added to the
list of `fragments` in the included `polymer.json` file.  This will ensure
those components and their dependencies are added to the list of pre-cached
components (and will have bundles created in the fallback `bundled` build).
