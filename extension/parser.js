/**
 * CD Splitter — HTML / JSON Parsing Utilities
 *
 * Extracts the `var model = { ... }` JSON object from CD.cz HTML pages.
 * This is needed both for the initial page scrape and for parsing the HTML
 * responses returned by the background segment searches.
 */

/**
 * Extract a balanced JSON object that follows a specific variable assignment in a string.
 *
 * @param {string} source — raw text
 * @param {string} varName — name of the variable to extract (e.g., "model")
 * @returns {object|null} parsed JSON, or null if not found / unparseable
 */
function extractJsonVariable(source, varName) {
    const marker = `var ${varName} = `;
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
        console.error(`${CONFIG.LOG_PREFIX}: Failed to parse ${varName} JSON`, e);
        return null;
    }
}

/**
 * Legacy wrapper for extracting "model"
 */
function extractModelJson(source) {
    return extractJsonVariable(source, "model");
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

/**
 * Extract the searchFormModel JSON from the current page's inline `<script>` tags.
 *
 * @returns {object|null}
 */
function extractSearchFormModelFromPage() {
    for (const script of document.querySelectorAll("script")) {
        if (script.textContent && script.textContent.includes("var searchFormModel = ")) {
            const model = extractJsonVariable(script.textContent, "searchFormModel");
            if (model) return model;
        }
    }
    return null;
}
