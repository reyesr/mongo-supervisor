var logger = require('./lib/logger').logger('mongo-manager');
var server = require('./lib/webserver');
var config = require("./lib/config");

server.set('port', process.env.PORT || 3000);

var mongod = require("./lib/mongod");

mongod.start();

var webserver = server.listen(server.get('port'), function() {
    logger('Express server listening on port ' + webserver.address().port);
});

var CURLCMD = "curl";
if (config.security["header-key-name"] && config.security["header-key-value"]) {
    CURLCMD += " -H '" + config.security["header-key-name"] +":" + config.security["header-key-value"]+ "'";
} else if (config.security.open) {
    logger("Warning, the rest api security access is disabled.");
} else {
    logger("Warning, no security has been defined, rest api cannot be used.");
}
var URL = " http://[URL]";

logger("Usage: ")

logger("GET /api/start   | start mongodb");
logger("                 | " + CURLCMD  + URL + "/api/start")

logger("GET /api/stop    | stop mongodb");
logger("                 | " + CURLCMD + URL + "/api/stop")

logger("GET /api/running | returns {result:'ok'} if mongo is running");
logger("                 | " + CURLCMD + URL + "/api/running")

logger("GET /api/db      | returns a file containing a mongodb full dump");
logger("                 | " + CURLCMD + " -O -J" + URL + "/api/db")

logger("POST /api/db     | restore a mongodb full dump (expects a form containing filedata=a mongo dump)");
logger("                 | " + CURLCMD + " -F filedata=@mydumpfile.tar.bz2" + URL + "/api/db")
