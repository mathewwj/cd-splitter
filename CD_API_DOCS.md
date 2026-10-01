# CD.cz API Documentation: Train Search & Pricing (Profile-Linked)

This document outlines the **essential** sequence of API calls required to programmatically search for train connections and retrieve their prices, taking into account user profile discounts (e.g. IN Karta).

---

## 1. Login (To apply profile discounts)
**`POST https://www.cd.cz/profil-uzivatele/auth/login`**

Logs the user in to ensure any search queries apply the user's tied discount cards. You must capture the resulting cookies (specifically `.ASPXAUTH` and `session` cookies).

### POST Parameters (Form Data)
- `username` (e.g., `user@example.com`)
- `password` (Your password)
- `remember` (`false` or `true`)

### Sample Payload
```text
username=user%40example.com&password=XXXXXXXXXXX&remember=false
```

---

## 2. Initialize Search
**`POST https://www.cd.cz/spojeni-a-jizdenka/api-hp/`**

Submits the core search criteria. This endpoint does **not** return JSON results directly. Instead, it creates a search session and returns an HTTP `302 Found` redirect.

### POST Parameters (Form Data)
- `data`: A URL-encoded JSON object defining the stations, time, and passengers.

### Sample Request Payload (Decoded JSON)
```json
{
  "from": {
    "listId": 1,
    "name": "Brno"
  },
  "to": {
    "listId": 1,
    "name": "Bratislava; Slovensko"
  },
  "date": "24.09.2026",
  "time": "14:47",
  "isAdvanced": false,
  "doSearch": true,
  "Class": 2,
  "passengers": [
    {
      "nickname": "John D."
    }
  ]
}
```

### Important Response Details
The server responds with `302 Found`. You must extract the `Location` header, which will look like:
`Location: /spojeni-a-jizdenka/spojeni-tam/6fa8e415-4d2a-40e0-a6a2-3d3a556def73`

The UUID (`6fa8e415-4d2a-40e0-a6a2-3d3a556def73`) is your search session `guid`.

---

## 3. Retrieve Anti-CSRF Token
**`GET https://www.cd.cz/spojeni-a-jizdenka/spojeni-tam/<YOUR_GUID>`**

Before you can query the actual prices, you must fetch the redirect URL to obtain a `__RequestVerificationToken`. This token prevents Cross-Site Request Forgery and is mandatory for the pricing POST request.

### Response
The server returns an HTML page. You must parse this HTML (e.g., using a regex) to extract the token from the hidden input field:
```html
<input name="__RequestVerificationToken" type="hidden" value="0BYthXuqCyQYHNTh6r6CSENbxkkvt6YQbtHI_EAEIdEGn7rJy1H3E..." />
```
*(Also ensure you store the `__RequestVerificationToken` cookie returned by this request).*

---

## 4. Fetch Connections & Prices
**`POST https://www.cd.cz/spojeni-a-jizdenka/GetConnListPrice/`**

Retrieves the actual train connections and calculates the final prices based on the logged-in profile.

### POST Parameters (Form Data)
- `__RequestVerificationToken`: The token extracted from step 3.
- `model[guid]`: The UUID extracted from the redirect in step 2.
- `model[SearchType]`: Usually `0`
- `model[pageType]`: Usually `0`
- *Note: There are many other `model[connParams][...]` parameters, but the server primarily relies on the `guid` to know what you are searching for. Passing basic pagination IDs like `model[nextID]` might be required if loading more results.*

### Sample Request Payload
```text
__RequestVerificationToken=GI1nvyH7BBZvTw8xNFQEkD1qoqVWmPrB4unH3826zpBk2FPd15O5GWl9cg0fHtQSURgb7p9AL6QjXSzeu71CmyUXUkkz0daSmQqoHpX1nts1
model[guid]=8fcf10b5-5de7-4f6b-b29b-39ccb93423c0
model[SearchType]=0
model[pageType]=0
```

### Sample Response (JSON)
The response contains a list of connections. `price.price` is the actual cost (e.g., `29000` means `290.00 CZK`).
```json
{
  "list": [
    {
      "handle": 47765036,
      "id": 15427841,
      "distance": "1",
      "price": {
        "canProceed": true,
        "price": 29000,
        "loyaltyPoint": 20,
        "canRes": true,
        "soldOut": false,
        "errMessage": null
      }
    }
  ]
}
```
