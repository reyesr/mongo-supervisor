var fs = require("fs"),
    os = require("os"),
    path = require("path"),
    shell = require("shelljs");
var gulp = require('gulp');

var buildDir = "build_dir";

gulp.task("install", function() {
    shell.exec("npm install");
});


gulp.task("build-docker", ["install"], function() {
	console.log("building docker");
    shell.rm("-fr", buildDir);
    shell.mkdir(buildDir);
    shell.cp("-rf", ["bin", "lib", "routes", "node_modules"], buildDir);
    shell.cp(["app.js", "package.json", "LICENCE"], buildDir);
    shell.cp(["mongosample.conf", "mongosupervisor.yaml"], buildDir);
    
});


gulp.task('default', ["build-docker"], function() {
});
