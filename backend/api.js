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
        initStatusTblSQL       = fs.readFileSync(__dirname + '/sql/init-status-tbl.sql', 'utf8'),
        populateHoursTblSQL    = fs.readFileSync(__dirname + '/sql/populate-hours-tbl.sql', 'utf8'),
        populateProjectsTblSQL = fs.readFileSync(__dirname + '/sql/populate-projects-tbl.sql', 'utf8'),
        populateStatusTblSQL   = fs.readFileSync(__dirname + '/sql/populate-status-tbl.sql', 'utf8');

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

                db.run(initStatusTblSQL, function(err) {
                    if(!err) {
                        logger.info("status_tbl Initialized");

                        db.run(populateStatusTblSQL, function(err) {
                            if(!err) {
                                logger.info("status_tbl Populated");
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
            description = req.body.description,
            status      = req.body.status;

        db.beginTransaction(function(err, trans) {
            var addTimeSQL = fs.readFileSync(__dirname + '/sql/add-time.sql', 'utf8');

            trans.run(addTimeSQL + "'" + title + "', '"
                                       + start + "', '"
                                       + end + "', '"
                                       + description + "', '"
                                       + status + "')");

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

                    var getTimeSQL = fs.readFileSync(__dirname + '/sql/get-time.sql', 'utf8');

                    db.all(getTimeSQL, function(err, resultSet) {
                        if(err !== null) {
                            logger.error('GET /time', err);
                        } else {
                            logger.info('GET /time');

                            res.send({
                                'status': {
                                    'deleted': true,
                                    'feedback': 'Time Deleted'
                                },
                                'data': resultSet
                            });
                        }
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
    })


    .get('/hours', function(req, res, next) {
        var getHoursSQL = fs.readFileSync(__dirname + '/sql/get-hours.sql', 'utf8');

        db.all(getHoursSQL, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /hours', err);
            } else {
                logger.info('GET /hours');
                res.send(resultSet);
            }
        });
    })

    .get('/hours/:id', function(req, res, next) {
        var getOneHourSQL = fs.readFileSync(__dirname + '/sql/get-one-hour.sql', 'utf8') +
                            req.params.id;

        db.all(getOneHourSQL, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /hours/' + req.params.id, err);
            } else {
                logger.info('GET /hours/' + req.params.id);
                res.send(resultSet);
            }
        });
    })


    .get('/projects', function(req, res, next) {
        var getProjectsSQL = fs.readFileSync(__dirname + '/sql/get-projects.sql', 'utf8');

        db.all(getProjectsSQL, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /projects', err);
            } else {
                logger.info('GET /projects');
                res.send(resultSet);
            }
        });
    })

    .get('/projects/:id', function(req, res, next) {
        var getOneProjectSQL = fs.readFileSync(__dirname + '/sql/get-one-project.sql', 'utf8') +
                            req.params.id;

        db.all(getOneProjectSQL, function(err, resultSet) {
            if(err !== null) {
                logger.error('GET /projects/' + req.params.id, err);
            } else {
                logger.info('GET /projects/' + req.params.id);
                res.send(resultSet);
            }
        });
    })

    .post('/projects', function(req, res, next) {
        var project = req.body.project,
            pca     = req.body.pca,
            fiscal  = req.body.fiscal;

        db.beginTransaction(function(err, trans) {
            var addProjectSQL = fs.readFileSync(__dirname + '/sql/add-project.sql', 'utf8');

            trans.run(addProjectSQL + "'" + project + "', '"
                                          + pca + "', '"
                                          + fiscal + "')");

            trans.commit(function(err) {
                if(err) {
                    logger.error('POST /projects', err);
                } else {
                    logger.info('POST /projects');

                    var getProjectsSQL = fs.readFileSync(__dirname + '/sql/get-projects.sql', 'utf8');

                    db.all(getProjectsSQL, function(err, resultSet) {
                        if(err !== null) {
                            logger.error('GET /projects', err);
                        } else {
                            logger.info('GET /projects');
                            res.send({
                                'status': {
                                    'added': true,
                                    'feedback': 'New Project Created'
                                },
                                'data': resultSet
                            });
                        }
                    });
                }
            });
        });
    })

    .delete('/projects/:id', function(req, res, next) {
        db.beginTransaction(function(err, trans) {
            var deleteProjectSQL = fs.readFileSync(__dirname + '/sql/delete-project.sql', 'utf8');

            trans.run(deleteProjectSQL + req.params.id);

            trans.commit(function(err) {
                if(err) {
                    logger.error('DELETE /project/' + req.params.id, err);
                } else {
                    logger.info('DELETE /project/' + req.params.id);

                    var getProjectsSQL = fs.readFileSync(__dirname + '/sql/get-projects.sql', 'utf8');

                    db.all(getProjectsSQL, function(err, resultSet) {
                        if(err !== null) {
                            logger.error('GET /projects', err);
                        } else {
                            logger.info('GET /projects');

                            res.send({
                                'status': {
                                    'deleted': true,
                                    'feedback': 'Project Deleted'
                                },
                                'data': resultSet
                            });
                        }
                    });
                }
            });
        });
    });

    api.use(router);
    api.listen(port, hostIP, function() {
        logger.info('Time-Travel API is awake @ http://' + hostIP + ':' + port);
    });
})();
