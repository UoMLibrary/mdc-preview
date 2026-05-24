# MDC Preview

MDC Preview is a SvelteKit tool for checking how TEI source material is transformed into CUDL-style JSON and a presentation view model.

It has two user-facing preview routes:

- `/preview` - a simple TEI preview route. It uses the bundled SEF transforms and lets you choose one of the built-in Cambridge, Lancaster, or Manchester configurations.
- `/preview/tool` - a pipeline/debug route. It exposes the TEI source, pre-filter XSLT, JSON transform XSLT, configuration, generated JSON, view model, print output, and final preview.

## Local Development

```bash
npm ci
npm run dev
```

The dev server runs on port `5174` by default.

Example TEI, XSLT, SEF, and configuration files live in `extras/`.

## Transform Flow

The preview flow is:

1. Load a TEI XML document.
2. Run the pre-filter XSLT.
3. Run the JSON formatter XSLT.
4. Build the view model from the generated CUDL JSON and selected configuration.
5. Render the preview and optional PDF output.

`/preview` does this with bundled transforms from `src/routes/preview/*.sef.json`.

`/preview/tool` lets you inspect or replace the TEI, XSLT, generated SEF, and configuration at each stage.

## Internal API

`POST /api/compile-xslt-to-sef` is an internal same-origin helper used by `/preview/tool`.

It accepts raw XSLT text in the request body and returns a compiled Saxon SEF payload:

```bash
curl -X POST http://localhost:5174/api/compile-xslt-to-sef \
  --header "Content-Type: application/xml" \
  --data-binary @extras/xslt/jsonDocFormatter.xsl
```

This endpoint is not intended as a public cross-site preview API.

## CSRF

The app currently uses SvelteKit's default CSRF behaviour. There is no cross-origin TEI form-post route.

If cross-site preview submission is reintroduced later, configure trusted origins explicitly rather than using a wildcard, and validate the allowed route in a server hook or dedicated API handler.

## Runtime Assets

`static/SaxonJS2.rt.js` is loaded at runtime by `src/app.html`. It is intentionally kept in `static/` even though static analysis tools may not see an import for it.

## SaxonJS Notes

Useful Saxonica links:

- [SaxonJS product page](https://www.saxonica.com/html/saxonjs/index.html)
- [JavaScript downloads](https://www.saxonica.com/html/download/javascript.html)
- [SaxonJS release notes](https://www.saxonica.com/html/saxonjs/release-notes.html)

This project currently uses SaxonJS in two places:

- `src/routes/api/compile-xslt-to-sef/+server.ts` imports the npm package `saxon-js` to compile loaded XSLT into SEF JSON. This branch uses SaxonJS 2.7 for the server-side package.
- `static/SaxonJS2.rt.js` is the browser runtime used by `SaxonJS.transform(...)` in the preview UI. This branch uses the SaxonJS 2.7 browser runtime.

Keep the npm package, browser runtime, and generated SEF files on compatible SaxonJS 2.x versions unless deliberately testing SaxonJS 3. SaxonJS 3 uses different packages (`saxonjs-he` / `xslt3-he`) and JS3-targeted SEFs for its newest features.

The preferred project direction is browser-first, using Saxonica's free SaxonJS public-license builds where possible. XML/XSLT transformation should run in the browser. XSLT-to-SEF compilation is the awkward part: the current project does it through a same-origin SvelteKit endpoint because the checked-in `SaxonJS2.rt.js` browser file is the runtime build. If live stylesheet compilation moves fully into the browser, use a compatible SaxonJS browser build that includes the compiler, or keep compilation as an explicit build/dev step that produces SEF JSON for the browser to execute.
