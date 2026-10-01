/**
 * CD Splitter — Configuration & Constants
 *
 * All magic numbers, route definitions, and selectors live here so they can
 * be tweaked without digging through business logic.
 */

const CONFIG = Object.freeze({
    /** Fixed fee (CZK) added on top of the two segment prices. */
    SPLIT_FEE_CZK: 25,

    /** Train type labels eligible for split-ticket pricing. */
    ELIGIBLE_TRAIN_TYPES: ["(EC)", "(rj)"],

    /**
     * Segment definitions per direction.
     * `timeOffsetMinutes` is relative to the connection's departure time;
     * it is reduced by a 5-minute safety buffer internally.
     */
    ROUTES: {
        brno: [
            { from: "Brno",    to: "Břeclav", timeOffsetMinutes: 0  },
            { from: "Břeclav", to: "Kúty",    timeOffsetMinutes: 35 },
        ],
        bratislava: [
            { from: "Kúty",    to: "Břeclav", timeOffsetMinutes: 57 },
            { from: "Břeclav", to: "Brno",    timeOffsetMinutes: 74 },
        ],
    },

    /** CSS selectors used when injecting UI into the CD.cz DOM. */
    SELECTORS: {
        connectionArticle: ".overview-connection",
        footerInfo:        ".overview-connection__footer-info",
        buttonsBlock:      ".overview-connection__buttons.overview-connection__footer-button",
    },

    /** CD.cz API endpoints (relative to origin). */
    API: {
        search:       "/spojeni-a-jizdenka/api-hp/",
        price:        "/spojeni-a-jizdenka/GetConnListPrice/",
    },

    /** Default passenger label when user is not logged in. */
    DEFAULT_PASSENGER: "Dospělý 26-64 let",

    /** Logging prefix for consistent console output. */
    LOG_PREFIX: "CD Splitter",
});
