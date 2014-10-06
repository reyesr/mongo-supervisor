var express = require('express');
var router = express.Router();
var Busboy = require('busboy');
var fs = require("fs"),
    path = require("path"),
    os = require('os'),
    crypto = require("crypto"),
    shell = require("shelljs"),
    config = require("../lib/config");

var logger = require('../lib/logger');
var mongod = require("../lib/mongod");

// curl -i -F name=test -F filedata=@mongo-manager.iml http://localhost:3000/api/restore

function checkAccess(req, res) {
    if (config.security) {
        if (config.security.open) {
            return true;
        }

        if (config.security["header-key-name"] && config.security["header-key-value"]) {
            var val = req.get(config.security["header-key-name"]);

            if (val == config.security["header-key-value"]) {
                return true;
            }
        }

    }
    logger.error(req, "Access denied for " + req.path);
    res.status(500).send("Access denied");
    throw new Error("Access denied");
}

router.get('/start', function(req, res, next) {
    checkAccess(req, res);
    logger.info("starting mongo server");
    mongod.start();
    res.json({result: "ok"});
});

router.get('/stop', function(req, res, next) {
    checkAccess(req, res);
    logger.info("stopping mongo server");
    mongod.stop();
    res.json({result: "ok"});
});

router.get('/running', function(req, res, next) {
    checkAccess(req, res);
    logger.info("running question");
    res.json({result: mongod.isAlive()?"running":"stopped"});
});

router.get('/db', function(req, res, next) {
    checkAccess(req, res);
    logger.info("running dump");
    try {
        mongod.dump(function (err, file) {
            console.log("done");
            if (err) {
                res.status(500).send("Error processing dump request");
            } else {
                res.attachment(file);
                res.sendFile(file, function(err) {
                    logger.info(req, "transfer " + (err?"failed":"complete") + "; now removing " + file);
                    shell.rm(file);
                });
            }
        });
    } catch(err) {
        console.error("erreur:", err);
        res.status(500).send("Error when processing dump request");
    }
});

router.post('/db', function(req, res, next) {
    checkAccess(req, res);
    console.log("RESTORING");

    var files = [];

    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        var saveTo = path.join(os.tmpDir(), path.basename(fieldname));
        files.push((saveTo));
        file.pipe(fs.createWriteStream(saveTo));
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
        console.log('Field [' + fieldname + ']: value: ', val);
    });
    busboy.on('finish', function() {
        logger.info(req, 'Restore, got all data');
        files.forEach(function(file) {
            logger.info(req, 'processing' + file);
            mongod.restore(file, function(err) {
                if (err) {
                    res.status(500).send("Error processing restore request");
                } else {
                    res.status(200).send("Restored ok");
                }
            });
        });


    });
    return req.pipe(busboy);
});

module.exports = router;
