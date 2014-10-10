var fs = require("fs"),
    os = require("os"),
    path = require("path"),
    shell = require("shelljs"),
    spawn = require("child_process").spawn,
    temporary = require("temporary"),
    async = require("async");
var gulp = require('gulp');
var yaml = require("js-yaml");

var argv = require('yargs')
    .usage('Usage: $0 [command] -O [num] -y [num]')
    .options('O', { alias: 'open-api', default: true })
    .options('h', { alias: 'sec-headers', default: undefined })
    .options('t', { alias: "tag", default: 'reyesr/mongo-supervisor' })
    .options('s', { alias: "sudo-docker", default: false })
    .options('l', { alias: "location", default: "build_dir" })
    .argv;

function processCommands(cmdList, callback) {

    var nextCallback = function(err) {
        if (!err) {
            processCommands(cmdList.slice(1), callback);
        } else {
            callback(err);
        }
    }

    if (cmdList.length>0) {
        var command = cmdList[0];

        switch (command) {
            case 'docker-create':
                createDockerImage(argv, nextCallback);
                break;
            case 'docker-run':
                async.waterfall([
                    function(cb) {
                        createDockerImage(argv, cb);
                    },
                    function(cb) {
                        runDocker(argv, cb);
                    }
                ], nextCallback);
                break;
            case 'package':
                buildAppAt(tmpdir.location, createSecurity(options));
                console.log("Application built, available at " + options.location);
                nextCallback();
                break;
            default:
                console.error("Unrecognized option: " + command);
                console.error("Aborting.");
                process.exit(1);
        }

    } else {
        callback(null);
    }
}


if (argv._.length == 0) {
    displayUsage();
} else {
    processCommands(argv._, function() {

    });
}

function createSecurity(options) {
    var security = {};
    if (options.openApi) {
        security.open = true;
        console.log("Warning: No security check are set on this image, make sure its instance cannot be publicly accessed.")
    }
    if (typeof options.secHeaders == "string") {
        var splitIndex = options.secHeaders.indexOf(':');
        if (splitIndex>=0) {
            var header = options.secHeaders.substr(0, splitIndex);
            var value = options.secHeaders.substr(splitIndex+1);
            console.log("Headers:", header, value);
            security["header-key-name"] = header;
            security["header-key-value"] = value;
        } else {
            console.error("Error: security headers must be of the form X-MY-HEADER:MySecretValue");
            console.error("Aborted.");
            process.exit(99);
        }
    }
    return security;
}

function createDockerImage(options, callback) {
    var tmpdir = new temporary.Dir();
    console.log("Temp dir", tmpdir);
    var security = createSecurity(options);
    buildAppAt(tmpdir.path + "/mongo-supervisor", security);
    buildDocker(tmpdir.path, options, callback);
}

function displayUsage() {
    console.log("Usage: build.js [OPTIONS] [COMMAND]");
    console.log(" Possible commands: package docker-build docker-run");
    console.log("      package : creates a packaged mongo-supervisor");
    console.log("      docker-create : creates a docker image based on the docker/Dockerfile");
    console.log("      docker-run : creates and run a docker image based on the docker/Dockerfile");
    console.log(" Possible options:");
    console.log("     --open-api -O : Open rest api (no security check) [docker]");
    console.log("     --sec-headers -h HEAD:VALUE : define security header and value [docker]");
    console.log("     --tag -t tag : user this tag as the image name [docker]");
    console.log("     --sudo-docker -s : docker needs to be run with sudo [docker]");
    console.log("     --location -l : directory where to create the package [package only]");
}

function buildDocker(targetDir, options, callback) {
    console.log("building docker");
    shell.cp("docker/Dockerfile", targetDir);
    var cmdline = [].concat((options.sudoDocker?"sudo ":[]), "docker", "build", "-t", options.tag, targetDir);

    //var result = shell.exec(cmdline);
    executeCommand(cmdline, function(code) {
        if (code == 0) {
            console.log("Docker image created.");
            console.log("You can run the image with the following command: docker run --rm -p 127.0.0.1:3000:3000 -t -i '" + options.tag + "'");
            callback(null);
        } else {
            console.error("Error, docker returned with code " + code + ", aborted.");
            process.exit(98);
        }
    });
}

function runDocker(options, callback) {
    // var cmdline = (options.sudoDocker?"sudo ":"") + "docker run --rm -p 127.0.0.1:3000:3000  --name=mongo_supervisor -t -i '" + options.tag + "'";
    var cmdline = [].concat((options.sudoDocker?"sudo ":[]), "docker", "run", "--rm", "-p", "127.0.0.1:3000:3000", "--name=mongo_supervisor", options.tag);
    console.log("running [" + cmdline + "]");
    // var result = shell.exec(cmdline);
    executeCommand(cmdline, callback);
};

function buildAppAt(target, securityObject) {
    // shell.rm("-fr", target);
    shell.mkdir("-p", target)
    shell.cp("-rf", ["lib", "routes", "node_modules"], target);
    shell.cp(["run", "app.js", "package.json", "LICENSE"], target);
    var configobj = yaml.safeLoad(fs.readFileSync("docker/mongosupervisor.yaml", 'utf8'));
    configobj.security = securityObject || {open: true};
    fs.writeFileSync(target + "/mongosupervisor.yaml", yaml.safeDump(configobj));
}

var currentProcess = null;
function executeCommand(cmdline, callback) {
    console.log("Executing: ", cmdline.join(' '));
    currentProcess = spawn(cmdline[0], cmdline.slice(1));

    currentProcess.stdout.on("data", function(data) {
        process.stdout.write(data);
    });
    currentProcess.stderr.on("data", function(data) {
        process.stderr.write(data);
    });
    currentProcess.on("close", function(code) {
        console.log("Received exit code " + code + " for " + cmdline);
        currentProcess = null;
        callback(code);
    });

}

function killCurrentCommand() {
    if (currentProcess != null && typeof currentProcess.kill == "function") {
        console.error("Process aborted, process kill()ed");
        currentProcess.kill();
        currentProcess = null;
    }
}

process.on("SIGINT", killCurrentCommand);
process.on("SIGHUP", killCurrentCommand);
process.on("exit", killCurrentCommand);