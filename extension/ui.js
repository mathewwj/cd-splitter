/**
 * CD Splitter — DOM Injection (UI)
 *
 * Creates and inserts the split-price row into CD.cz connection cards.
 */

/**
 * Open a new browser tab with a CD.cz search for a specific segment.
 *
 * Uses a hidden form POST to /api-hp/ (same mechanism as the CD.cz
 * homepage search form). The server processes the search and redirects
 * the new tab to the results page.
 */
function openSegmentInNewTab(segment) {
    const payload = {
        from: { listId: 1, name: segment.from },
        to:   { listId: 1, name: segment.to },
        date: segment.date,
        time: segment.time,
        isAdvanced: false,
        doSearch: true,
        Class: 2,
        passengers: [{ nickname: segment.passengerNickname }],
    };

    const form  = document.createElement("form");
    form.method = "POST";
    form.action = CONFIG.API.search;
    form.target = "_blank";
    form.style.display = "none";

    const input  = document.createElement("input");
    input.type   = "hidden";
    input.name   = "data";
    input.value  = JSON.stringify(payload);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
    form.remove();
}

/**
 * Inject a split-price row into a specific connection card.
 *
 * Appends a new section below the original connection footer with:
 *   - A dashed separator
 *   - The total price breakdown (including the 25 CZK ZSSK student fare fee)
 *   - Two sequential buttons for buying the segments
 */
function injectSplitPriceRow(connectionIndex, totalCzk, segmentSearches, originalPrice) {
    const articles = document.querySelectorAll(CONFIG.SELECTORS.connectionArticle);
    const article  = articles[connectionIndex];
    if (!article) return;

    // Avoid duplicates on re-runs
    if (article.querySelector(".cd-splitter-container")) return;

    if (segmentSearches.length < 2) return;
    const seg1 = segmentSearches[0];
    const seg2 = segmentSearches[1];

    const buyBlock = article.querySelector(CONFIG.SELECTORS.buttonsBlock);

    // Skip connections that can't be purchased (e.g. past trains — "Již nelze zakoupit")
    if (buyBlock) {
        const isDisabled = buyBlock.querySelector("button[disabled], .btn--gray");
        const hasPrice   = /\d+\s*Kč/i.test(buyBlock.textContent);
        if (isDisabled || !hasPrice) {
            console.log(`${CONFIG.LOG_PREFIX}: Connection not purchasable — skipping.`);
            return;
        }
    }

    const container = document.createElement("div");
    container.className = "cd-splitter-container";
    Object.assign(container.style, {
        paddingTop: "20px",
        paddingBottom: "10px",
        borderTop: "1px dashed #ccc",
        marginTop: "30px",
        fontFamily: "Arial, sans-serif"
    });

    // Header breakdown
    const header = document.createElement("div");
    Object.assign(header.style, {
        fontSize: "16px",
        color: "#333",
        marginBottom: "15px",
        display: "flex",
        alignItems: "center",
        gap: "10px"
    });

    // Do NOT strip all whitespace — "DNY 25\n\n143 Kč" would merge into "25143Kč".
    let resolvedOriginalPrice = originalPrice;
    if (resolvedOriginalPrice === null && buyBlock) {
        const candidates = [...buyBlock.textContent.matchAll(/\b(\d{1,4})\s*Kč/g)]
            .map(m => parseInt(m[1], 10))
            .filter(n => n >= 10 && n <= 5000);
        if (candidates.length > 0) {
            resolvedOriginalPrice = Math.min(...candidates);
            console.log(`${CONFIG.LOG_PREFIX}: DOM resolved price: ${resolvedOriginalPrice} Kč`);
        }
    }

    const diff = resolvedOriginalPrice !== null ? Math.round(totalCzk - resolvedOriginalPrice) : null;

    const diffColor = diff === null ? "#2e8b57" : (diff < 0 ? "#2e8b57" : "#b71c1c");
    const diffText  = diff === null ? `${Math.round(totalCzk)} Kč` :
                      (diff < 0 ? `${diff} Kč` : `+${diff} Kč`);

    const isCheaperThanOriginal = resolvedOriginalPrice === null || totalCzk < resolvedOriginalPrice;
    let infoPriceMessage = `${Math.round(totalCzk)} Kč = ${Math.round(seg1.price)} Kč + ${Math.round(seg2.price)} Kč + 25 Kč ZSSK študentský lístok Bratislava - Kúty.`;
    if (isCheaperThanOriginal) {
        infoPriceMessage += ` <strong>Skontroluj dostupnosť na zssk.sk!</strong>`;
    }

    header.innerHTML = `
        <span style="font-size: 20px;">✂</span>
        <strong style="color: ${diffColor}; font-size: 18px;">${diffText}</strong>
        <span style="color: #666; font-size: 14px;">
            (${infoPriceMessage})
        </span>
    `;
    container.appendChild(header);

    // Buttons Row
    const row = document.createElement("div");
    Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        gap: "15px"
    });

    // Helper to create a segment button
    const createBtn = (num, seg, isActive) => {
        const btn = document.createElement("button");
        Object.assign(btn.style, {
            padding: "12px",
            border: isActive ? "2px solid #2e8b57" : "1px solid #ccc",
            borderRadius: "6px",
            background: isActive ? "#e8f5e9" : "#f5f5f5",
            cursor: isActive ? "pointer" : "not-allowed",
            opacity: isActive ? "1" : "0.6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "160px",
            transition: "all 0.2s"
        });

        const routeLabel = document.createElement("div");
        routeLabel.innerHTML = `<strong>${num === 1 ? '❶' : '❷'} ${seg.from} → ${seg.to}</strong>`;
        routeLabel.style.marginBottom = "5px";
        routeLabel.style.color = isActive ? "#1b5e20" : "#666";

        const priceLabel = document.createElement("div");
        priceLabel.textContent = `${Math.round(seg.price)} Kč`;
        priceLabel.style.marginBottom = "8px";
        priceLabel.style.fontSize = "14px";
        priceLabel.style.color = "#333";

        const actionLabel = document.createElement("div");
        Object.assign(actionLabel.style, {
            padding: "4px 12px",
            background: isActive ? "#2e8b57" : "#ccc",
            color: "white",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "bold"
        });
        actionLabel.textContent = isActive ? "Kúpiť ▶" : "░░░░░░░░░";

        if (isActive) {
            btn.addEventListener("mouseenter", () => btn.style.background = "#c8e6c9");
            btn.addEventListener("mouseleave", () => btn.style.background = "#e8f5e9");
        }

        btn.appendChild(routeLabel);
        btn.appendChild(priceLabel);
        btn.appendChild(actionLabel);

        return { btn, actionLabel };
    };

    const step1 = createBtn(1, seg1, true);
    const step2 = createBtn(2, seg2, false);

    const arrowContainer = document.createElement("div");
    Object.assign(arrowContainer.style, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#e65100", // Made more visible with orange color
        fontSize: "13px", // Increased from 11px
        fontWeight: "bold",
        textAlign: "center",
        maxWidth: "120px"
    });
    
    const arrowLabel = document.createElement("div");
    arrowLabel.textContent = "Po pridaní do košíka pokračujte tu";
    arrowLabel.style.marginBottom = "4px";
    
    const arrowIcon = document.createElement("div");
    arrowIcon.textContent = "────▶";
    arrowIcon.style.fontWeight = "bold";
    arrowIcon.style.fontSize = "16px"; // Increased size
    
    arrowContainer.appendChild(arrowLabel);
    arrowContainer.appendChild(arrowIcon);

    // Click Logic
    step1.btn.addEventListener("click", (e) => {
        e.preventDefault();
        openSegmentInNewTab(seg1);
        
        // Update Step 1 to "done"
        step1.actionLabel.textContent = "Otvorené ✓";
        step1.actionLabel.style.background = "#1b5e20";
        step1.btn.style.border = "1px solid #a5d6a7";
        
        // Enable Step 2
        step2.btn.style.cursor = "pointer";
        step2.btn.style.opacity = "1";
        step2.btn.style.border = "2px solid #2e8b57";
        step2.btn.style.background = "#e8f5e9";
        step2.btn.querySelector("div").style.color = "#1b5e20"; // route label
        step2.actionLabel.textContent = "Kúpiť ▶";
        step2.actionLabel.style.background = "#2e8b57";

        // Add hover to step 2
        step2.btn.addEventListener("mouseenter", () => step2.btn.style.background = "#c8e6c9");
        step2.btn.addEventListener("mouseleave", () => step2.btn.style.background = "#e8f5e9");
    });

    step2.btn.addEventListener("click", (e) => {
        if (step2.btn.style.cursor === "not-allowed") return;
        e.preventDefault();
        openSegmentInNewTab(seg2);

        step2.actionLabel.textContent = "Otvorené ✓";
        step2.actionLabel.style.background = "#1b5e20";
        step2.btn.style.border = "1px solid #a5d6a7";
    });

    // Only show the buy buttons row if split is actually cheaper
    const isCheaper = resolvedOriginalPrice === null || totalCzk < resolvedOriginalPrice;
    if (isCheaper) {
        row.appendChild(step1.btn);
        row.appendChild(arrowContainer);
        row.appendChild(step2.btn);
        container.appendChild(row);
    } else {
        console.log(`${CONFIG.LOG_PREFIX}: Split (${Math.round(totalCzk)} Kč) >= original (${resolvedOriginalPrice} Kč) — hiding buy buttons.`);
    }
    
    // Inject at the very bottom of the article
    article.appendChild(container);
}
