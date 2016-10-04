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

    // SQL
    var initCheckSQL           = fs.readFileSync(__dirname + '/sql/init-check.sql', 'utf8'),
        initTimeTblSQL         = fs.readFileSync(__dirname + '/sql/init-time-tbl.sql', 'utf8'),
        initHoursTblSQL        = fs.readFileSync(__dirname + '/sql/init-hours-tbl.sql', 'utf8'),
        initProjectsTblSQL     = fs.readFileSync(__dirname + '/sql/init-projects-tbl.sql', 'utf8'),
        populateHoursTblSQL    = fs.readFileSync(__dirname + '/sql/populate-hours-tbl.sql', 'utf8'),
        populateProjectsTblSQL = fs.readFileSync(__dirname + '/sql/populate-projects-tbl.sql', 'utf8')

    // http://enable-cors.org/server_expressjs.html
    api.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, PUSH, PUT, DELETE');
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
    db.get(initCheckSQL,
        function(err, rows) {
            if(err !== null) {
                logger.info(err);
            } else if(rows === undefined) {
                db.run(initTimeTblSQL, function(err) {
                    if(!err) {
                        logger.info("time_tbl Initialized");
                    } else {
                        logger.error(err);
                    }
                });

                db.run(initHoursTblSQL, function(err) {
                    if(!err) {
                        logger.info("hours_tbl Initialized");

                        db.run(populateHoursTblSQL, function(err) {
                            if(!err) {
                                logger.info("hours_tbl Populated");
                            } else {
                                logger.error(err);
                            }
                        });
                    } else {
                        logger.error(err);
                    }
                });

                db.run(initProjectsTblSQL, function(err) {
                    if(!err) {
                        logger.info("projects_tbl Initialized");

                        db.run(populateProjectsTblSQL, function(err) {
                            if(!err) {
                                logger.info("projects_tbl Populated");
                            } else {
                                logger.error(err);
                            }
                        });
                    } else {
                        logger.error(err);
                    }
                });
            } else {
                logger.info("Time-Travel DB is Online");
            }
        });

    router.get('/time', function(req, res, next) {
        var getTimeSQL = fs.readFileSync(__dirname + '/sql/get-time.sql', 'utf8');

        db.all(getTimeSQL, function(err, resultSet) {
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
            var addTimeSQL = fs.readFileSync(__dirname + '/sql/add-time.sql', 'utf8');

            trans.run(addTimeSQL + "'" + title + "', '"
                                       + start + "', '"
                                       + end + "', '"
                                       + description + "')");

            trans.commit(function(err) {
                if(err) {
                    logger.error('POST /time', err);
                } else {
                    logger.info('POST /time');

                    var getTimeSQL = fs.readFileSync(__dirname + '/sql/get-time.sql', 'utf8');

                    db.all(getTimeSQL, function(err, resultSet) {
                        if(err !== null) {
                            logger.error('GET /time', err);
                        } else {
                            logger.info('GET /time');
                            res.send({
                                'status': {
                                    'added': true,
                                    'feedback': 'New Time Created'
                                },
                                'data': resultSet
                            });
                        }
                    });
                }
            });
        });
    })

    .delete('/time/:id', function(req, res, next) {
        db.beginTransaction(function(err, trans) {
            var deleteTimeSQL = fs.readFileSync(__dirname + '/sql/delete-time.sql', 'utf8');

            trans.run(deleteTimeSQL + req.params.id);

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
        var getOneTimeSQL = fs.readFileSync(__dirname + '/sql/get-one-time.sql', 'utf8') +
                            req.params.id;

        db.all(getOneTimeSQL, function(err, resultSet) {
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
