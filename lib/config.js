var cfg = require("config-file-loader");

var defaultValues = {
    dbpath: '',
    mongod: {
        path: "/usr/bin/mongod",
        config: "/etc/mongodb.conf"
    },
    mongodump: {
        path: "/usr/bin/mongodump"
    },
    mongorestore: {
        path: "/usr/bin/mongorestore"
    },
    security: {}
};

module.exports = new cfg.Loader().setDefault(defaultValues).get("mongosupervisor");
