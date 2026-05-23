# Digital collection preview tool

# mdc-preview

## Running in dev mode

```bash
git clone <repo>
cd <repo>
npm ci
# start the preview app and manually open a browser
npm run dev
# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building a docker image

```bash
# Build the image and tag it locally
docker build --tag web-tei-preview .
```

## Publishing the container image

The `.github/workflows/publish-ghcr.yml` workflow builds and pushes a multi-architecture image to GitHub Container Registry when changes are pushed to `main`. It can also be run manually from the GitHub Actions tab.

Images are published to `ghcr.io/<owner>/<repo>` with `latest`, branch, and commit SHA tags.

## Running the local docker image

```bash
# Start a container using the local image and expose port 3000
docker run --rm -p 3000:3000 --name preview -d web-tei-preview
# Stop the container with docker stop preview
```

## Manual deployment

The VM is expected to pull the image from GHCR using Docker Compose. Deployment is currently manual:

```bash
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
```

The extras folder contains some example Manchester TEI content and configuration files for Manchester, Lancaster and Cambridge.

## Routes

There are currently 2 routes in the tool

- preview/tool - Where the pipeline is out in the open and the XSLT can be configured
- preview - A simpler version with preconfigured XSLT to help with previewing TEIs

## Opening up some routes for POST

In the _svelte.config.js_ file

```javascript
// The following disabled as the logic for performing the csrf check has been implemented
// in hooks.server.js to allow a specifiv POST route from a specified origin. This allows
// us to POST data to the preview tool from a tool with a different origin.
csrf: {
	checkOrigin: false;
}
```

We handle the csrf check in _hooks.server.js_

```javascript
// Specify routes to allow POST data
let allowedPOSTPaths = ['/preview/posted'];
// Specify Origins able to send POST data
let allowedOrigins = [
	'http://localhost:5173',
	'http://192.168.1.176:5173',
	'https://tools.digitallibrarytools.com'
];
```
