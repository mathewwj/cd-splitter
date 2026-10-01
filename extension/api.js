/**
 * CD Splitter — CD.cz API Interaction
 *
 * Handles all HTTP communication with the CD.cz backend:
 *  - Fetching the logged-in passenger's nickname
 *  - Submitting segment searches via /api-hp/
 *  - Requesting prices via /GetConnListPrice/
 */

/**
 * Add (or subtract) minutes from a "HH:MM" time string.
 * A 5-minute safety buffer is subtracted so the search window starts early
 * enough to guarantee the target train appears in the results.
 *
 * @param {string} timeStr  — e.g. "14:02"
 * @param {number} minutes  — offset to add
 * @returns {string} adjusted "HH:MM"
 */
function addMinutes(timeStr, minutes) {
    const BUFFER = 5;
    minutes = minutes - BUFFER;
    if (!timeStr || !timeStr.includes(":")) return timeStr;

    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m + minutes, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Fetch the cheapest price for a single segment (e.g. Brno → Břeclav).
 *
 * Flow:
 *  1. POST to /api-hp/ to create a search session for the segment
 *  2. Parse the returned HTML to extract the GUID, token, and connection list
 *  3. Find the target train in the results
 *  4. POST to /GetConnListPrice/ to get the price for that specific connection
 *
 * @param {string} from             — origin station name
 * @param {string} to               — destination station name
 * @param {string} date             — search date, e.g. "25.9.2026"
 * @param {string} time             — departure time, e.g. "14:02"
 * @param {Array} passengersArray   — array of passenger objects from original search
 * @param {string} targetTrainNum   — train number to look for in results
 * @returns {Promise<number|null>} price in CZK, or null on failure
 */
async function fetchSegmentPrice(from, to, date, time, passengersArray, targetTrainNum) {
    console.log(`[Segment Search] ${from} → ${to} | train ${targetTrainNum} | dep ~${time}`);

    try {
        // --- Step 1: Create a search session ---
        const payload = {
            from: { listId: 1, name: from },
            to:   { listId: 1, name: to },
            date,
            time,
            isAdvanced: false,
            doSearch: true,
            Class: 2,
            passengers: passengersArray,
        };

        const searchResp = await fetch(CONFIG.API.search, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(JSON.stringify(payload)),
        });

        const html     = await searchResp.text();
        const finalUrl = searchResp.url;

        if (finalUrl.includes("api-hp")) {
            throw new Error("Validation failed at api-hp — server did not redirect to results.");
        }

        // --- Step 2: Extract session artifacts from the HTML ---
        const guid = finalUrl.split("/").pop();

        const tokenMatch = html.match(
            /<input name="__RequestVerificationToken" type="hidden" value="([^"]+)"/
        );
        if (!tokenMatch) throw new Error("Anti-forgery token not found in response.");
        const token = tokenMatch[1];

        // --- Step 3: Parse connection list & find target train ---
        const model       = extractModelJson(html);
        const connections  = (model && model.list) || [];

        console.log(`[Segment Search] ${from} → ${to}: got ${connections.length} connections`);

        const targetConn = connections.find((c) =>
            c.trains &&
            c.trains.some(
                (t) =>
                    t.trainNum === targetTrainNum ||
                    (t.trainName && t.trainName.includes(targetTrainNum))
            )
        );

        if (!targetConn) {
            console.warn(`[Segment Search] Train ${targetTrainNum} not in ${from} → ${to} results`);
            return null;
        }

        // --- Step 4: Request the price ---
        const priceData = new URLSearchParams();
        priceData.append("__RequestVerificationToken", token);
        priceData.append("model[guid]",                guid);
        priceData.append("model[SearchType]",          "0");
        priceData.append("model[pageType]",            "0");
        priceData.append("model[loadPrices][0][connID]",  targetConn.id);
        priceData.append("model[loadPrices][0][handle]",  targetConn.handle);
        if (targetConn.auxDesc) {
            priceData.append("model[loadPrices][0][auxDesc]", targetConn.auxDesc);
        }

        const priceResp = await fetch(CONFIG.API.price, {
            method: "POST",
            headers: {
                "Content-Type":    "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: priceData.toString(),
        });

        const priceJson = await priceResp.json();
        const priceObj  = priceJson.list?.[0]?.price ?? null;

        if (priceObj && priceObj.price) {
            const czk = priceObj.price / 100;
            console.log(
                `%c[Segment Price] ${from} → ${to}: ${czk.toFixed(2)} CZK`,
                "color: #004b87; font-weight: bold; font-size: 14px;"
            );
            return czk;
        }

        console.log(`[Segment Price] ${from} → ${to}: unavailable / sold out`);
        return null;
    } catch (e) {
        console.error(`[Segment Search Error] ${from} → ${to} (train ${targetTrainNum}):`, e);
        return null;
    }
}
