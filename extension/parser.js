/**
 * CD Splitter — HTML / JSON Parsing Utilities
 *
 * Extracts the `var model = { ... }` JSON object from CD.cz HTML pages.
 * This is needed both for the initial page scrape and for parsing the HTML
 * responses returned by the background segment searches.
 */

/**
 * Extract a balanced JSON object that follows `var model = ` in a string.
 *
 * Handles nested braces and quoted strings with escape characters so that
 * the massive CD.cz view-model can be extracted reliably.
 *
 * @param {string} source — raw text containing `var model = { ... }`
 * @returns {object|null} parsed JSON, or null if not found / unparseable
 */
function extractModelJson(source) {
    const marker = "var model = ";
    const idx = source.indexOf(marker);
    if (idx === -1) return null;

    const str = source.substring(idx + marker.length);
    const startIdx = str.indexOf("{");
    if (startIdx === -1) return null;

    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (escape)           { escape = false; }
            else if (char === "\\") { escape = true;  }
            else if (char === '"') { inString = false; }
        } else {
            if      (char === '"') { inString = true; }
            else if (char === "{") { depth++; }
            else if (char === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
        }
    }

    if (endIdx === -1) return null;

    try {
        return JSON.parse(str.substring(startIdx, endIdx + 1));
    } catch (e) {
        console.error(`${CONFIG.LOG_PREFIX}: Failed to parse model JSON`, e);
        return null;
    }
}

/**
 * Extract the model JSON from the current page's inline `<script>` tags.
 *
 * @returns {object|null}
 */
function extractModelFromPage() {
    for (const script of document.querySelectorAll("script")) {
        if (script.textContent && script.textContent.includes("var model = ")) {
            const model = extractModelJson(script.textContent);
            if (model) return model;
        }
    }
    return null;
}
