mongo-supervisor
================

mongo-supervisor aims at providing a simple but flexible supervisor for Docker containers running mongodb.

It runs mongodb, and provides a rest api that can be called from any http client, for instance with basic curl, 
to start/stop mongo, create a backup with mongodump, and restore a backup with mongorestore.

Building
========

a build.js script file provides several targets:

- package: copies a minimal version of mongo-supervisor in a directory, along with its start script. You may find it
useful to copy it in your own container.

- docker-create: creates a docker image based on the docker/Dockerfile recipe. It uses the default mongodb configuration
 file, so you may want to tune that part.

- docker-run: creates a docker image, and run it. The docker container is temporary, as soon as the script ends, it is
killed and removed.

Possible options:
 --open-api -O : Open rest api (no security check) [docker]
 --sec-headers -h HEAD:VALUE : define security header and value [docker]
 --tag -t tag : user this tag as the image name [docker]
 --sudo-docker -s : docker needs to be run with sudo [docker]
 --location -l : directory where to create the package [package only]

Example:

* node build docker-run -O
 creates and runs a docker container with mongo-supervisor, until you ctrl-c.

Security
========
The security can be configured in the configuration file (namely mongosupervisor.yaml) or during the build.
The security options are:

- open api: just no security at all. The default is no access, so you need to be explicit if you want to make it
 widely open.
 In the build script: use the --open-api or -O flag.
 In the configuration file: change the security part to be
security:
  open: true

- Headers: mongo-supervisors checks that a given http header is provided with a given value. This is typically
useful for clients using a TLS connection.
 In the build script: use the --open-api or -O flag.
 In the configuration file: change the security part to be
``` 
    security:
        header-key-name: "SomeHeaderName"
        header-key-value: "some secret value"
```

  for instance:
```    security:
        header-key-name: "X-ACCESS"
        header-key-value: "efb92b97a659bf04ac599bac68e36559fec30eafd63381bf19513c82b290c765"
```

