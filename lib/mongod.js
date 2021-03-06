var shell = require("shelljs"),
    config = require("./config"),
    spawn = require("child_process").spawn,
    temp = require("temporary"),
    moment = require("moment"),
    async = require("async"),
    path = require("path");

var mongod_process = null;

var ENV_MONGO_CFG_PATH = process.env["MONGO_CFG_PATH"] || config.mongod.config;
var ENV_MONGO_BIND_IP = process.env["MONGO_BIND_IP"];
var ENV_MONGO_BIND_PORT = process.env["MONGO_BIND_PORT"];
var ENV_MONGO_LOG_PATH = process.env["MONGO_LOG_PATH"];

exports.start = function() {
    exports.stop();
    var arguments = ['-f', ENV_MONGO_CFG_PATH];

    if (ENV_MONGO_BIND_IP) {
        arguments.push("--bind_ip");
        arguments.push(ENV_MONGO_BIND_IP);
    }

    if (ENV_MONGO_BIND_PORT) {
        arguments.push("--port");
        arguments.push(ENV_MONGO_BIND_PORT);
    }

    if (ENV_MONGO_LOG_PATH) {
        arguments.push("--logpath");
        arguments.push(ENV_MONGO_LOG_PATH);
    }

    console.log("Starting mongo with command", config.mongod.path, arguments);
    mongod_process = spawn(config.mongod.path, arguments);

    mongod_process.stdout.on("data", function(data) {
        console.log("MONGO: " + data);
    });
    mongod_process.stderr.on("data", function(data) {
        console.log("MONGO ERR: " + data);
    });
    mongod_process.on("close", function(code) {
        console.log("MONGO CLOSED: " + code);
        mongod_process = null;
    });
};

exports.stop = function() {
    if (mongod_process && typeof mongod_process.kill == "function") {
        mongod_process.kill();
    }
    return;

    var stopper = spawn(config.mongod.path, ['--shutdown', '-f', config.mongod.config]);
    stopper.stdout.on("data", function(data) {
        console.log("MONGO: " + data);
    });
    stopper.stderr.on("data", function(data) {
        console.log("MONGO ERR: " + data);
    });
    stopper.on("close", function(code) {
        console.log("MONGO stopper CLOSED: " + code);
    });
};

exports.isAlive = function() {
    return !!mongod_process;
}

function executeCd(cmdline, dir, callback) {
    if (dir) {
        var pwd = shell.pwd();
        shell.cd(dir);
    }
    console.log("executing: " + cmdline + (dir?(" in " + dir):""));
    shell.exec(cmdline, {async:true}, function(code, output) {
        if (pwd) {
            shell.cd(pwd);
        }
        if (code == 0) {
            callback(null);
        } else {
            callback({error: code, output: output});
        }
    });

}

exports.dump = function(callback) {
    var dir = (new temp.Dir()).path;

    async.waterfall([
        function dumpMongo(callback) {
            var cmdline = config.mongodump.path + " --out " + dir;
            console.log("executing", cmdline);
            executeCd(cmdline, undefined, callback);
        },

        function createTarball(callback) {
            var tarname = "/tmp/mongodb-dump-" + moment().format("YYYYMMDD-HHmmss") + ".tar.bz2";
            executeCd("tar cfj " + tarname + " .", dir, function(err) {
                callback(err, tarname);
            });
        }
    ], function(err, result) {
        shell.rm('-rf', dir);
        callback(err, result);
    });
};

exports.restore = function(file, callback) {
    var dir = (new temp.Dir()).path;

    async.waterfall([
        function unpackTarball(callback) {
            executeCd("tar xfj " + file, dir, function(err) {
                callback(err);
            });
        },

        function restoreMongo(callback) {
            var cmdline = config.mongorestore.path + " --drop " + dir;
            console.log("executing", cmdline);
            executeCd(cmdline, undefined, callback);
        }

    ], function(err, result) {
        shell.rm('-rf', dir);
        callback(err, result);
    });
}