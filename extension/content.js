/**
 * CD Splitter — Content Script (Orchestrator)
 *
 * Runs on CD.cz connection-results pages. Coordinates the split-ticket
 * price lookup by:
 *  1. Extracting the page's search model
 *  2. Identifying eligible direct Brno ↔ Bratislava trains
 *  3. Fetching segment prices in the background
 *  4. Injecting the total split price into the UI
 *
 * Dependencies (loaded via manifest.json before this file):
 *   config.js  — constants & route definitions
 *   parser.js  — model JSON extraction
 *   api.js     — CD.cz API interaction
 *   ui.js      — DOM injection
 */

console.log(`=== ${CONFIG.LOG_PREFIX}: Initialized ===`);

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Determine if a route is between Brno and Bratislava (either direction).
 */
function isBrnoBratislavaRoute(from, to) {
    const f = from.toLowerCase();
    const t = to.toLowerCase();
    return (f.includes("brno") && t.includes("bratislava")) ||
           (f.includes("bratislava") && t.includes("brno"));
}

/**
 * Check whether a connection qualifies for split pricing.
 */
function isEligibleConnection(conn) {
    const isDirect    = (conn.trains && conn.trains.length === 1) ||
                        conn.changesCount === 0 ||
                        conn.change === 0;
    const isValidType = CONFIG.ELIGIBLE_TRAIN_TYPES.includes(conn.trainTypes);
    return isDirect && isValidType;
}

/**
 * Pick the correct route segments based on the departure city.
 */
function getSegments(fromName) {
    return fromName.toLowerCase().includes("brno")
        ? CONFIG.ROUTES.brno
        : CONFIG.ROUTES.bratislava;
}

// ── Core Logic ─────────────────────────────────────────────────────────

/**
 * Find all direct EC/rj trains in the connection list.
 *
 * @param {Array} connections — `model.list` from the page
 * @returns {Array<{connectionIndex, train, connId, connHandle}>}
 */
function findEligibleTrains(connections) {
    const matched = [];

    connections.forEach((conn, index) => {
        if (!isEligibleConnection(conn)) return;

        const train     = conn.trains?.[0] ?? {};
        const trainName = train.trainName || train.trainTypeAndNum || "Unknown";
        console.log(
            `[Match] #${index + 1} — ${trainName} (${train.depTime ?? "?"} → ${train.arrTime ?? "?"})`
        );

        matched.push({
            connectionIndex: index,
            train,
            connId:        conn.id,
            connHandle:    conn.handle,
            // conn.price.price is in hundredths of CZK (e.g. 14300 = 143 Kč)
            // 0 means price hasn't loaded yet — treat as unavailable
            originalPrice: (conn.price?.price > 0) ? conn.price.price / 100 : null,
        });
    });

    return matched;
}

/**
 * Run sequential segment searches for every matched train, compute the
 * total split price, and inject buttons into the DOM.
 */
async function processSplitPrices(matchedTrains, model, passengersArray) {
    const segments = getSegments(model.searchFrom);

    for (const match of matchedTrains) {
        const { trainNum, depTime: rawDep } = match.train;
        const depTime = rawDep || "00:00";

        console.log(`--- Split search for train ${trainNum} (dep ${depTime}) ---`);

        const prices          = [];
        const segmentSearches = [];

        for (const seg of segments) {
            const time  = addMinutes(depTime, seg.timeOffsetMinutes);
            const price = await fetchSegmentPrice(
                seg.from, seg.to, model.searchDate, time, passengersArray, trainNum
            );
            prices.push(price);

            // Save the search config so the button can re-open this search in a new tab
            segmentSearches.push({
                from: seg.from,
                to:   seg.to,
                date: model.searchDate,
                time,
                passengersArray,
                price,
            });
        }

        if (prices.every((p) => p !== null)) {
            const segmentSum = prices.reduce((sum, p) => sum + p, 0);
            const total      = segmentSum + CONFIG.SPLIT_FEE_CZK;

            console.log(
                `%c[Total] Train ${trainNum}: ${total.toFixed(2)} CZK (segments ${segmentSum.toFixed(2)} + fee ${CONFIG.SPLIT_FEE_CZK})`,
                "color: #2e7d32; font-weight: bold; font-size: 14px;"
            );

            console.log(
                `${CONFIG.LOG_PREFIX}: originalPrice=${match.originalPrice}, total=${total.toFixed(2)}`
            );
            injectSplitPriceRow(match.connectionIndex, total, segmentSearches, match.originalPrice);

        }
    }
}

// ── Entry Point ────────────────────────────────────────────────────────

async function main() {
    const model = extractModelFromPage();
    if (!model) {
        console.log(`${CONFIG.LOG_PREFIX}: No model found on this page.`);
        return;
    }

    console.log(`${CONFIG.LOG_PREFIX}: ${model.searchFrom} → ${model.searchTo} | ${model.searchDate}`);

    if (!isBrnoBratislavaRoute(model.searchFrom, model.searchTo)) {
        console.log(`${CONFIG.LOG_PREFIX}: Not a Brno ↔ Bratislava route — skipping.`);
        return;
    }

    const matchedTrains = findEligibleTrains(model.list || []);
    if (matchedTrains.length === 0) {
        console.log(`${CONFIG.LOG_PREFIX}: No eligible direct trains found.`);
        return;
    }

    console.log(`${CONFIG.LOG_PREFIX}: 🎯 ${matchedTrains.length} eligible train(s). Starting price lookups…`);

    // Extract exact passengers configuration from the search form
    const searchFormModel = extractSearchFormModelFromPage();
    let passengersArray = [{ nickname: CONFIG.DEFAULT_PASSENGER }];
    if (searchFormModel && searchFormModel.passengers && searchFormModel.passengers.passengers) {
        passengersArray = searchFormModel.passengers.passengers;
        console.log(`${CONFIG.LOG_PREFIX}: Loaded passengers from search params:`, passengersArray);
    } else {
        console.warn(`${CONFIG.LOG_PREFIX}: searchFormModel or passengers not found, falling back to default.`);
    }

    await processSplitPrices(matchedTrains, model, passengersArray);

    console.log(`${CONFIG.LOG_PREFIX}: Done.`);
}

main();
