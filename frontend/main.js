(function() {
    'use strict';

    const {
        app,
        BrowserWindow
    } = require('electron');

    var express  = require('express'),
        passport = require('passport'),
        parser   = require('body-parser'),
        fs       = require('fs'),
        ip       = 'localhost',
        port     = '3000',
        api      = express(),
        router   = express.Router(),
        ldap     = require('passport-ldapauth'),
        config   = {
            server: {
                url: 'ldap://111.111.111:389',
                bindDn: 'cn=root',
                bindCredentials: 'secret',
                searchBase: 'ou=passport-ldapauth',
                searchFilter: '(uid={{username}})'
            }
        };

    // http://enable-cors.org/server_expressjs.html
    api.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', '*');
        res.header('Access-Control-Allow-Headers', 'content-Type,X-Requested-With');
        next();
    });

    // configure passport
    passport.use(new ldap(config));

    // middleware
    api.use(parser.json());
    api.use(parser.urlencoded({ extended: false }));
    api.use(passport.initialize());
    api.use(router);

    // routes
    router.post('/login',
                passport.authenticate('ldap', { session:false }),
                function(req, user, res) {
        res.send({
            status: 'authenticated',
            user: user
        });
    });

    // run app
    api.listen(port, ip, function() {
        console.log('Auth API is awake @ http://' + ip + ':' + port);
    });

    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    let win

    function createWindow () {
      // Create the browser window.
      win = new BrowserWindow({width: 840, height: 755})

      // and load the index.html of the app.
      win.loadURL(`file://${__dirname}/index.html`)

      // Open the DevTools.
      win.webContents.openDevTools()

      // Emitted when the window is closed.
      win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
      })
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow)

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
      // On macOS it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (win === null) {
        createWindow()
      }
    })
})();
