# MDC Preview

MDC Preview is a SvelteKit tool for checking how TEI source material is
transformed into CUDL-style JSON and a presentation view model.

The app is organised around three user-facing routes:

- `/` - the main TEI preview page. Load a TEI file from the File menu, choose a
  built-in Cambridge, Lancaster, or Manchester configuration, and inspect the
  rendered preview. The page uses the active SEFs from the settings page when
  they exist, and falls back to bundled defaults.
- `/settings` - the pipeline/debug page. It exposes the TEI source, pre-filter
  stylesheet, JSON transform stylesheet, generated XML, generated JSON,
  configuration, view model, and final preview.
- `/help` - in-app documentation rendered from this README.

## Local Development

```bash
npm ci
npm run dev
```

The dev server runs on port `5174` by default.

Example TEI, XSLT, SEF, and configuration files live in `extras/`.

Useful checks:

```bash
npm run check
npm run build
npm run lint
```

## App Shell

The app shell provides a small desktop-style menu:

- `File > Open TEI file` loads a TEI XML file. Shortcut: `Cmd/Ctrl+O`.
- `File > Close` clears the current TEI file without changing route. Shortcut:
  `Cmd/Ctrl+W`.
- `File > Settings` opens `/settings`.
- `Help` opens `/help`, which renders this README as in-app documentation.

The top-right theme switch toggles light/dark mode for the app chrome and tool
panels. The preview panel itself intentionally remains light because it is meant
to represent the current target website preview, not the app theme.

## Transform Flow

The preview flow is:

1. Load a TEI XML document.
2. Run the pre-filter XSLT/SEF.
3. Run the JSON formatter XSLT/SEF.
4. Build the view model from the generated CUDL JSON and selected configuration.
5. Render the preview and optional PDF output from the preview controls.

The bundled default SEFs live in `src/lib/Tei/default-sefs/`.

The root preview page uses the settings page's active `preTransform` and
`JSONTransform` SEFs when they have been loaded or compiled. If no SEF is
available for a stage, it falls back to the bundled default for that stage. This
keeps the preview usable out of the box while allowing `/settings` to drive the
same transforms used by the preview page.

SEF means Stylesheet Export File. It is Saxon's compiled JSON form of an XSLT
stylesheet. The app compiles loaded XSLT into SEF before running preview
transforms.

The XSLT used for the production TEI-to-JSON transformation is managed in
[UoMLibrary/mdc-data-processing-xslt](https://github.com/UoMLibrary/mdc-data-processing-xslt).
Treat that repository as the source of truth for the transformation stylesheets;
copies or demo stylesheets in this project are for previewing, testing, or local
tool development.

## Settings Page

`/settings` works from browser file selection: XML, XSLT, SEF, and configuration
files are loaded locally by the user. It can be used to:

- inspect the currently loaded TEI document and parsing errors;
- load or compile the pre-filter stylesheet;
- load or compile the JSON transform stylesheet;
- inspect generated pre-filter XML and CUDL JSON;
- edit configuration URLs;
- inspect the generated view model once one exists;
- compare the final preview against the root preview page.

The Source TEI Document panel no longer has its own load button. Use
`File > Open TEI file` from either `/` or `/settings`.

## Stylesheet Compilation

There is no public form-post or cross-site preview submission route. The tool
loads local browser-selected files and uses same-origin helper endpoints.

For multi-file stylesheets, the tool can package a selected folder in the browser
and compile it through an internal same-origin helper. The client supplies the
inferred entry stylesheet and the uploaded project files:

```json
{
	"entryPath": "my-transform/main.xsl",
	"files": [
		{ "path": "my-transform/main.xsl", "contents": "<xsl:stylesheet>...</xsl:stylesheet>" },
		{ "path": "my-transform/lib/common.xsl", "contents": "<xsl:stylesheet>...</xsl:stylesheet>" }
	]
}
```

The compile endpoint resolves `xsl:include` and `xsl:import` against those
uploaded project files.

## Runtime Transform Pipeline

The browser UI sends transform requests to `/api/run-xslt-transform`. That
SvelteKit endpoint runs SaxonJS in a Node worker thread, queues transforms, and
streams newline-delimited JSON progress events back to the browser. Large
transform results are sent back in chunks so the preview page can continue to
show progress and respond to cancellation.

The preview pipeline supports `AbortController` cancellation while transforms or
JSON parsing are in progress. JSON parsing is moved into a small browser Worker
where available so the main page remains responsive.

`/api/compile-xslt-to-sef` imports the npm package `saxon-js` to compile loaded
XSLT projects into SEF JSON.

## Persistence

TEI files can be large and expensive to restore, so they are intentionally kept
only in memory for the current app session. A new page load starts without a TEI
document.

SEF data is persisted in IndexedDB so the settings page can retain loaded or
compiled stylesheets across page loads. Configuration and theme preference are
stored in `localStorage`.

## Runtime Assets

`static/SaxonJS2.rt.js` is loaded at runtime by `src/app.html`. It is
intentionally kept in `static/` even though static analysis tools may not see an
import for it.

Third-party license notices are recorded in `THIRD_PARTY_LICENSES.md`.

## SaxonJS Notes

Useful Saxonica links:

- [SaxonJS product page](https://www.saxonica.com/html/saxonjs/index.html)
- [JavaScript downloads](https://www.saxonica.com/html/download/javascript.html)
- [SaxonJS release notes](https://www.saxonica.com/html/saxonjs/release-notes.html)

This project currently uses SaxonJS 2.7 in two main places:

- `src/routes/api/compile-xslt-to-sef/+server.ts` imports the npm package
  `saxon-js` to compile loaded XSLT into SEF JSON.
- `src/routes/api/run-xslt-transform/+server.ts` imports the npm package
  `saxon-js` to run preview transforms in a Node worker thread.

Keep the npm package, browser runtime, and generated SEF files on compatible
SaxonJS 2.x versions unless deliberately testing SaxonJS 3. SaxonJS 3 uses
different packages (`saxonjs-he` / `xslt3-he`) and JS3-targeted SEFs for its
newest features.
