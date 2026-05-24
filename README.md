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

The XSLT used for the production TEI-to-JSON transformation is managed in
[UoMLibrary/mdc-data-processing-xslt](https://github.com/UoMLibrary/mdc-data-processing-xslt).
Treat that repository as the source of truth for the transformation stylesheets;
copies or demo stylesheets in this project are for previewing, testing, or local
tool development.

## Stylesheet Compilation

There is no public form-post or cross-site preview submission route. `/preview/tool`
works from browser file selection: XML, XSLT, SEF, and configuration files are loaded
locally by the user.

For multi-file stylesheets, the tool can package a selected folder in the browser and
compile it through an internal same-origin helper. The client supplies the inferred
entry stylesheet and the uploaded project files:

```json
{
	"entryPath": "my-transform/main.xsl",
	"files": [
		{ "path": "my-transform/main.xsl", "contents": "<xsl:stylesheet>...</xsl:stylesheet>" },
		{ "path": "my-transform/lib/common.xsl", "contents": "<xsl:stylesheet>...</xsl:stylesheet>" }
	]
}
```

The compile endpoint resolves `xsl:include` and `xsl:import` against those uploaded
project files.

## Runtime Assets

`static/SaxonJS2.rt.js` is loaded at runtime by `src/app.html`. It is intentionally kept in `static/` even though static analysis tools may not see an import for it.

Third-party license notices are recorded in `THIRD_PARTY_LICENSES.md`.

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
