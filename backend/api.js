(function() {
    'use strict';

    var express = require('express'),
        router  = express.Router(),
        parser  = require('body-parser'),
        port    = '3040',
        hostIP  = 'localhost',
        winston = require('winston'),
        fs      = require('fs'),
        sqlite  = require('sqlite3').verbose(),
        trans   = require('sqlite3-transactions').TransactionDatabase,
        db      = new trans(new sqlite.Database('time-travel.db')),
        api     = express();

    // http://enable-cors.org/server_expressjs.html
    api.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', '*');
        res.header('Access-Control-Allow-Headers', 'content-Type,X-Requested-With');
        next();
    });

    // middleware
    api.use(parser.json());
    api.use(parser.urlencoded({ extended: true }));

    api.use(express.static(__dirname + '/public'));

    // logging
    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(),

            new (winston.transports.File)({
                name: 'info-file',
                filename: __dirname + '/public/logs/info.log',
                level: 'info'
            }),

            new (winston.transports.File)({
                name: 'error-file',
                filename: __dirname + '/public/logs/error.log',
                level: 'error'
            })
        ]
    });

    // Database initialization
    db.get("SELECT name " +
           "FROM sqlite_master " +
           "WHERE type = 'table' " +
           "AND name = 'time_tbl' ",
        function(err, rows) {
            if(err !== null) {
                logger.info(err);
            } else if(rows === undefined) {
                db.run('CREATE TABLE "time_tbl" ' +
                            '("id"         INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                            '"title"       VARCHAR(255), ' +
                            '"start"       VARCHAR(255), ' +
                            '"end"         VARCHAR(255), ' +
                            '"description" VARCHAR(255))',
                            function(err) {
                                if(err !== null) {
                                    logger.error(err);
                                } else {
                                    logger.info("time-travel.time_tbl table initialized.");
                                }
                            });
            } else {
                logger.info("Time-Travel DB is Online");
            }
        });

    router.get('/time', function(req, res, next) {
        var sql = "SELECT * FROM time_tbl";

        db.all(sql, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /time', err);
            } else {
                logger.info('GET /time');
                res.send(resultSet);
            }
        });
    })

    .post('/time', function(req, res, next) {
        var title       = req.body.title,
            start       = req.body.start,
            end         = req.body.end,
            description = req.body.description;

        db.beginTransaction(function(err, trans) {
            trans.run("INSERT INTO 'time_tbl' (title," +
                                              "start," +
                                              "end," +
                                              "description) " +
                      "VALUES('" + title + "', '"
                                 + start + "', '"
                                 + end + "', '"
                                 + description + "')");

            trans.commit(function(err) {
                if(err) {
                    logger.error('POST /time', err);
                } else {
                    logger.info('POST /time');
                    res.send({
                        'added': true,
                        'feedback': 'New Time Created'
                    });
                }
            });
        });
    })

    .delete('/time/:id', function(req, res, next) {
        db.beginTransaction(function(err, trans) {
            trans.run('DELETE FROM time_tbl ' +
                      'WHERE time_tbl.id = ' + req.params.id);

            trans.commit(function(err) {
                if(err) {
                    logger.error('DELETE /time/' + req.params.id, err);
                } else {
                    logger.info('DELETE /time/' + req.params.id);
                    res.send({
                        'deleted': true,
                        'feedback': 'Time Deleted id:' + req.params.id
                    });
                }
            });
        });
    })

    .get('/time/:id', function(req, res, next) {
        var sql = "SELECT * FROM time_tbl WHERE id = " + req.params.id;

        db.all(sql, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /time/' + req.params.id, err);
            } else {
                logger.info('GET /time/' + req.params.id);
                res.send(resultSet);
            }
        });
    });

    api.use(router);
    api.listen(port, hostIP, function() {
        logger.info('Time-Travel API is awake @ http://' + hostIP + ':' + port);
    });
})();
