FROM       ubuntu:14.04
MAINTAINER Rodrigo <reyes.rr@gmail.com>

# We use the mongodb provided by ubuntu 14.04, but your mileage may vary
# See other mongodb recipes to use the mongodb ppa:
RUN apt-get update && apt-get install -y mongodb nodejs nodejs-legacy

# Here, the default mongodb.conf is kept unmodified, but you can change it if you need some tuning
# COPY mongodb.conf /etc/

# Exposes the mongodb default port, and the supervisor rest api port
# EXPOSE 21017 3000

RUN mkdir -p /opt
RUN pwd
COPY mongo-supervisor /opt/mongo-supervisor

# Expose port from the container to the host
WORKDIR /opt/mongo-supervisor

# CMD ["/usr/bin/mongod", "--config", "/etc/mongodb.conf"]
CMD ["/usr/bin/nodejs", "/opt/mongo-supervisor/app"]
