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
