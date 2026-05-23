FROM node:18 AS build

# This is a multi stage build, first we setup the environment
# and install the tools/libraries/code and run the build. 
# Then we gather together the build outputs

# This is the project where we will create the project
WORKDIR /app

# Install the latest npm to avoid lots of red warnings
# RUN npm install -g npm@9.4.2
# RUN npm install -g npm@latest

# Copy package.json and package-lock.json to the WORKING 
# DIRECTORY (/app) folder
COPY package*.json ./ 

# Run npm install, npm will be available as we are in a
# node environment (line 1 above)
# -f = force call from remote even if local version exists
#RUN npm install -f && npm audit fix
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm install && npm audit fix

# Quick version
# RUN npm install 

# After npm install (the setup of node_modules) copy all 
# the files and folders to the WORKING DIRECTORY (/app)
COPY . .

# Build the node project
RUN npm run build 

# Deployment container, contains the generated build and required modules
# but not the open source code

# Trying a smaller distroless version to make the image smaller
# https://learnk8s.io/blog/smaller-docker-images

# Alpine is smaller and built for security but Alpine based images are 
# based on muslc — an alternative standard library for C. Building your
# containers with Alpine images may lead to unexpected behaviour because
# the standard C library is different.
# alpine 16 size = 116 MB
# node 16.18 size = 860 MB
FROM node:20-alpine
# RUN apk add --update nodejs npm@9.4.0
# RUN apk update
# RUN apk add --update nodejs npm@latest
COPY --from=build /app/package*.json /
COPY --from=build /app/build /

# Sveltekit Issues 
# npm install is included below to fix an issue that arose if the user 
# reloaded a page or navigated directly to a route using the browser location.
# It seems as if sveltekit is doing something under the hood to load modules
# as required and jumping to a route directly misses something out
RUN npm install 

RUN npm config set fetch-retry-mintimeout 20000 
HEALTHCHECK --interval=10s --timeout=2s --start-period=15s CMD ["node", "healthcheck.mjs"]

# Pass through the ORIGIN to prevent cross scripting issues 
# When running from Docker compose
# ENV ORIGIN=http://localhost:8000 
ENV ORIGIN=http://localhost:3000
CMD [ "node", "index.js"]




