[x] each train subsections search at the dep time of each train
[x] add travel time when searching for the segment (departure + travel_time)
[ ] reset search parameters to user default after api calls
[ ] reduce api calls, one list for each segment
[ ] fix bug with insufficient train connections in response (fetch later connections) - not showing now when individual api call dor each segment
[ ] remove hardcoded discounts, extract from user
    [ ] discount can be extracted from search param?
[x] refactor
[x] remove NJ from search / all trains, which have "cena v dalsim kroku" - is what is the price response? 
[ ] next connection button does not work  `{"sessionExpireRedirectUrl":"/spojeni-a-jizdenka/"}` `https://www.cd.cz/spojeni-a-jizdenka/getconnectionlist/`
[x] make more intuitive buttons
[ ] make direct click to basket
[x] add saved price
[x] if price is higher, do not show buy option (row with buttons)
[x] add price diff
[x] remove "check availability" when split price is worse