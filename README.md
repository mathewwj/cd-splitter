# CD Splitter 🚂✂️

A smart Chrome extension that automatically finds cheaper, split-ticket train fares for direct connections between **Brno** and **Bratislava** on [cd.cz](https://www.cd.cz). 

By splitting the route into optimal segments and factoring in regional student discounts, CD Splitter can significantly reduce the overall ticket price compared to a direct international ticket.

## ✨ Features

- **Automated Price Comparison:** Automatically runs in the background when searching for connections between Brno and Bratislava.
- **Profile-Aware Pricing:** Respects your logged-in CD.cz profile discounts (e.g., IN Karta) when fetching prices.
- **Smart Split Routing:** Splits the journey into three segments: Brno ↔ Břeclav, Břeclav ↔ Kúty, and Kúty ↔ Bratislava.
- **Seamless UI Integration:** Injects an unobtrusive UI directly into the CD.cz search results, displaying your exact savings.
- **1-Click Purchasing:** Provides step-by-step buttons to instantly add the necessary split segments to your CD.cz cart in new tabs.

## 🛠️ How it Works

When traveling internationally, direct tickets are often subject to standard international tariffs. However, buying domestic segments up to the border can be vastly cheaper.

For an eligible direct `(EC)` or `(rj)` train, the extension splits the fare as follows:
1. **Brno ↔ Břeclav** (Bought via CD.cz)
2. **Břeclav ↔ Kúty** (Bought via CD.cz)
3. **Kúty ↔ Bratislava** (Factored in as a 25 CZK ZSSK student ticket)

If the sum of these segments is cheaper than the direct CD.cz ticket, the extension reveals the hidden savings on the page!

## 🚀 Installation

You can load this extension locally into your browser as an "unpacked extension".

1. Clone or download this repository to your local machine.
2. Open Google Chrome (or any Chromium-based browser) and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** (usually a toggle in the top right corner).
4. Click the **"Load unpacked"** button in the top left corner.
5. Select the `extension/` folder from this repository.
6. The extension is now installed and active!

## 💻 Usage

1. Go to [cd.cz](https://www.cd.cz).
2. Ensure you are **logged in** to your account so the extension can calculate prices using your specific discount cards.
3. Search for a connection between **Brno** and **Bratislava** (or vice versa).
4. Wait a few seconds for the extension to fetch the split prices in the background.
5. If a cheaper split is found on a direct train, a new row will appear below the connection card with the calculated savings and buttons to buy the segments.
6. Click the generated buttons sequentially to add the CD.cz segments to your basket. Don't forget to purchase your ZSSK ticket for the Slovak segment at [zssk.sk](https://www.zssk.sk)!

## 📂 Project Structure

- `extension/` - Contains the core Chrome extension files.
  - `manifest.json` - Chrome extension configuration (Manifest V3).
  - `config.js` - Global constants, routing logic, and DOM selectors.
  - `content.js` - Main orchestrator script injected into the CD.cz page.
  - `api.js` - Handles all background HTTP communication with the CD.cz API.
  - `parser.js` - Utility for extracting JSON data models from the CD.cz page source.
  - `ui.js` - Handles DOM manipulation and UI injection.
- `CD_API_DOCS.md` - Technical documentation reverse-engineering the CD.cz API flow.
