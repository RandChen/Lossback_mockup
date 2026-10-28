/* Mock platform data for the Campaign wizard (2026-10-26).
   Lossback edition: `open` on a match is the Operations switch in Admin site
   that opens its market; the Early Payout flag of the previous project is gone.

   Everything here stands in for a backend the prototype does not have:
     · site currencies        — the site's configuration
     · FX rates               — the rate feed (Oanda in the Free Bet flow)
     · member directory       — the Licensee's player accounts
     · Saba BI tags           — audiences built in Saba BI
     · matches                — the match catalogue, with whether Operations
                                opened the market in Admin site and the
                                campaigns each match is already used by
     · sport catalogue        — sports, leagues and bet types for the Free Bet
                                scope
     · Operations settings    — Admin site values a campaign stacks on top of

   All values are PLACEHOLDERS. Shared by Step 2, Review and stale-check.js. */
(function (global) {
  "use strict";

  /* The app's clock is fixed: 00:25 Jul 27, 2026 GMT-4, as the top bar shows. */
  var NOW = "2026/07/27 00:25";

  var SITE_CURRENCY = {
    "LS1001": "USD", "LS1001-S01": "IDR", "LS1001-S02": "JPY", "LS1001-S03": "VND", "LS1001-S04": "USD",
    "LS1002": "IDR", "LS1002-S01": "IDR", "LS1002-S02": "RMB",
    "LS1003": "JPY",
    "LS1004": "VND", "LS1004-S01": "USD", "LS1004-S02": "IDR", "LS1004-S03": "RMB"
  };

  /* 1 USD = n units. */
  var RATES = { USD: 1, IDR: 16000, VND: 25000, JPY: 150, RMB: 7.2 };

  /* The currencies a campaign sets a Max Bet Limit for, each on its own
     (2026-10-26). Site currencies above are kept inside this set. */
  var MAX_BET_CURRENCIES = ["USD", "IDR", "VND", "JPY", "RMB"];
  /* Lossback amounts (min. net loss, free bet cap) use the same five. */
  var CURRENCIES = MAX_BET_CURRENCIES;

  /* Free Bet scope catalogue — taken over from the Free Bet wizard. */
  var CATALOGUE = [
    { id: "soccer", name: "Soccer", leagues: ["*ENGLISH PREMIER LEAGUE", "*GERMANY-BUNDESLIGA I", "*ITALY SERIE A", "*SPAIN PRIMERA LALIGA", "*UEFA CHAMPIONS LEAGUE", "*FIFA CLUB WORLD CUP"], betTypes: ["Handicap", "Over/Under", "1X2", "Correct Score"] },
    { id: "basketball", name: "Basketball", leagues: ["*NBA", "*EURO LEAGUE", "*FIBA WORLD CUP QUALIFIERS", "*PBA"], betTypes: ["Handicap", "Over/Under", "Moneyline"] },
    { id: "tennis", name: "Tennis", leagues: ["*ATP TOUR", "*WTA TOUR", "*GRAND SLAM"], betTypes: ["Handicap", "Over/Under", "Moneyline"] },
    { id: "baseball", name: "Baseball", leagues: ["*MLB", "*NPB", "*KBO", "*CPBL"], betTypes: ["Handicap", "Over/Under", "Moneyline"] },
    { id: "esports", name: "Esports", leagues: ["*LOL WORLDS", "*DOTA 2 TI", "*CS2 MAJOR"], betTypes: ["Handicap", "Over/Under", "Moneyline"] }
  ];
  var RATES_AS_OF = "2026/07/26 23:59 (GMT-4)";

  var OPERATIONS = {
    margin: { soccer1x2: 5, basketballMoneyline: 4 },     // %
    spread: { soccerHdp: 1, basketballHdp: 2 },           // water points
    maxBetUsd: 20                                         // per user
  };

  function pad(n, size) {
    var s = String(n);
    while (s.length < size) s = "0" + s;
    return s;
  }

  /* ---------- Sites ---------------------------------------------------------- */
  function sites() {
    var list = [];
    var licensees = global.Role && global.Role.licensees ? global.Role.licensees() : [];
    licensees.forEach(function (site) {
      list.push({ id: site.id, name: site.name, label: site.name, parent: null });
      site.subs.forEach(function (sub) {
        list.push({ id: sub.id, name: sub.name, label: site.name + " / " + sub.name, parent: site.id });
      });
    });
    return list;
  }

  function site(id) {
    var all = sites();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return { id: id, name: id, label: id, parent: null };
  }

  function currencyOf(siteId) {
    return SITE_CURRENCY[siteId] || "USD";
  }

  /* ---------- Members -------------------------------------------------------- */
  /* 40 accounts per site, IDs like M1001-007 or M1001-S01-007. */
  var MEMBERS_PER_SITE = 40;

  function memberIdsOf(siteId) {
    var base = siteId.replace(/^LS/, "M");
    var ids = [];
    for (var i = 1; i <= MEMBERS_PER_SITE; i++) ids.push(base + "-" + pad(i, 3));
    return ids;
  }

  /* Returns { memberId, siteId, currency } or null when the account does not
     exist anywhere. */
  function member(memberId) {
    var match = /^M(\d{4})(-S\d{2})?-(\d{3})$/.exec(String(memberId || "").trim());
    if (!match) return null;
    var siteId = "LS" + match[1] + (match[2] || "");
    if (!SITE_CURRENCY[siteId]) return null;
    var n = Number(match[3]);
    if (n < 1 || n > MEMBERS_PER_SITE) return null;
    return { memberId: match[0], siteId: siteId, currency: currencyOf(siteId) };
  }

  /* ---------- Saba BI tags --------------------------------------------------- */
  /* A tag spans every licensee; importing keeps only the members of the sites
     that join the campaign. `pick` decides which accounts carry the tag. */
  var BI_TAGS = [
    { id: "BI-0012", name: "High-value soccer bettors (30d)", updated: "2026/07/26", pick: function (n) { return n % 5 === 0; } },
    { id: "BI-0031", name: "Basketball regulars (60d)", updated: "2026/07/25", pick: function (n) { return n % 4 === 1; } },
    { id: "BI-0047", name: "New depositors (7d)", updated: "2026/07/26", pick: function (n) { return n % 8 === 3; } },
    { id: "BI-0052", name: "Dormant 60–90 days", updated: "2026/07/20", pick: function (n) { return n % 6 === 2; } },
    { id: "BI-0068", name: "Frequent losers (30d)", updated: "2026/07/24", pick: function (n) { return n % 7 === 0; } }
  ];

  function tagMembers(tagId, siteIds) {
    var tag = BI_TAGS.filter(function (t) { return t.id === tagId; })[0];
    if (!tag) return [];
    var list = [];
    (siteIds || Object.keys(SITE_CURRENCY)).forEach(function (siteId) {
      memberIdsOf(siteId).forEach(function (id, index) {
        if (tag.pick(index + 1)) list.push({ memberId: id, siteId: siteId, currency: currencyOf(siteId) });
      });
    });
    return list;
  }

  function biTags() {
    return BI_TAGS.map(function (t) {
      return { id: t.id, name: t.name, updated: t.updated, total: tagMembers(t.id).length };
    });
  }

  /* ---------- Matches -------------------------------------------------------- */
  /* open: the Operations switch in Admin site. usedBy: campaigns of a
     site that already hold the match — Pending (selected, awaiting approval),
     Scheduled, or Running. */
  var MATCHES = [
    { id: "SC-880101", sport: "Soccer", league: "FIFA Club World Cup", home: "Real Madrid", away: "Al Hilal", kickoff: "2026/07/28 15:00", open: true, usedBy: [] },
    { id: "SC-880102", sport: "Soccer", league: "FIFA Club World Cup", home: "Manchester City", away: "Urawa Reds", kickoff: "2026/07/28 18:00", open: true, usedBy: [{ siteId: "LS1001", campaign: "City Boost Week", status: "Scheduled" }] },
    { id: "SC-880103", sport: "Soccer", league: "FIFA Club World Cup", home: "Palmeiras", away: "Porto", kickoff: "2026/07/29 18:00", open: false, usedBy: [] },
    { id: "SC-880104", sport: "Soccer", league: "English Premier League (Pre-season)", home: "Arsenal", away: "Tottenham", kickoff: "2026/07/30 14:30", open: true, usedBy: [] },
    { id: "SC-880105", sport: "Soccer", league: "English Premier League (Pre-season)", home: "Liverpool", away: "Chelsea", kickoff: "2026/07/31 12:00", open: true, usedBy: [{ siteId: "LS1002", campaign: "Derby Special", status: "Running" }] },
    { id: "SC-880106", sport: "Soccer", league: "Spanish La Liga (Friendly)", home: "Barcelona", away: "Sevilla", kickoff: "2026/08/01 13:00", open: true, usedBy: [] },
    { id: "SC-880107", sport: "Soccer", league: "Bundesliga (Friendly)", home: "Bayern Munich", away: "RB Leipzig", kickoff: "2026/08/01 09:30", open: true, usedBy: [{ siteId: "LS1001-S01", campaign: "Bundes Boost", status: "Pending approval" }] },
    { id: "SC-880108", sport: "Soccer", league: "Italian Serie A (Friendly)", home: "Inter", away: "AC Milan", kickoff: "2026/08/02 14:45", open: true, usedBy: [] },
    { id: "SC-880109", sport: "Soccer", league: "Japan J1 League", home: "Kawasaki Frontale", away: "Yokohama F. Marinos", kickoff: "2026/08/02 06:00", open: false, usedBy: [] },
    { id: "SC-880110", sport: "Soccer", league: "FIFA Club World Cup", home: "Flamengo", away: "Chelsea", kickoff: "2026/07/26 20:00", open: true, usedBy: [] },
    { id: "BB-770201", sport: "Basketball", league: "FIBA World Cup Qualifiers", home: "USA", away: "Canada", kickoff: "2026/07/28 20:00", open: true, usedBy: [] },
    { id: "BB-770202", sport: "Basketball", league: "FIBA World Cup Qualifiers", home: "Australia", away: "New Zealand", kickoff: "2026/07/29 05:00", open: true, usedBy: [{ siteId: "LS1004", campaign: "Oceania Hoops", status: "Scheduled" }] },
    { id: "BB-770203", sport: "Basketball", league: "NBA Summer League", home: "Los Angeles Lakers", away: "Golden State Warriors", kickoff: "2026/07/30 21:00", open: true, usedBy: [] },
    { id: "BB-770204", sport: "Basketball", league: "NBA Summer League", home: "Boston Celtics", away: "Miami Heat", kickoff: "2026/07/31 19:00", open: false, usedBy: [] },
    { id: "BB-770205", sport: "Basketball", league: "Philippine Basketball Association", home: "San Miguel Beermen", away: "Barangay Ginebra", kickoff: "2026/08/01 07:00", open: true, usedBy: [] },
    { id: "SC-880111", sport: "Soccer", league: "English Premier League", home: "Newcastle", away: "Aston Villa", kickoff: "2026/08/08 10:00", open: true, usedBy: [] },
    { id: "SC-880112", sport: "Soccer", league: "Spanish La Liga", home: "Atletico Madrid", away: "Valencia", kickoff: "2026/08/09 15:00", open: true, usedBy: [] },
    { id: "BB-770207", sport: "Basketball", league: "FIBA Asia Cup", home: "Japan", away: "Philippines", kickoff: "2026/08/07 06:30", open: true, usedBy: [{ siteId: "LS1001", campaign: "Asia Cup Lossback", status: "Running" }] },
    { id: "BB-770206", sport: "Basketball", league: "EuroLeague (Pre-season)", home: "Real Madrid", away: "Olympiacos", kickoff: "2026/08/03 13:00", open: true, usedBy: [] }
  ];

  function matchById(id) {
    return MATCHES.filter(function (m) { return m.id === id; })[0] || null;
  }

  function isPrematch(m) {
    return m.kickoff > NOW;
  }

  /* Why a match cannot be picked for these sites, or "" when it can.
       not-prematch     kicked off already
       not-open         Operations has not opened the market in Admin site
       used             a joining site already holds it in another campaign */
  function blockReason(m, siteIds) {
    if (!isPrematch(m)) return "not-prematch";
    if (!m.open) return "not-open";
    var used = m.usedBy.filter(function (u) { return (siteIds || []).indexOf(u.siteId) !== -1; });
    if (used.length) return "used";
    return "";
  }

  function usedFor(m, siteIds) {
    return m.usedBy.filter(function (u) { return (siteIds || []).indexOf(u.siteId) !== -1; });
  }

  /* ---------- Money ---------------------------------------------------------- */
  function rate(currency) { return RATES[currency] || 1; }

  /* Converts and rounds down to whole units — a limit must never end up above
     what Operations allows once converted. */
  function convert(amount, from, to) {
    return Math.floor((Number(amount) / rate(from)) * rate(to) + 1e-9);
  }

  /* The Operations limit expressed in a currency, rounded down. */
  function operationsMaxBet(currency) {
    return convert(OPERATIONS.maxBetUsd, "USD", currency);
  }

  function money(amount, currency) {
    return currency + " " + Number(amount).toLocaleString("en-US");
  }

  global.CampaignData = {
    NOW: NOW,
    RATES: RATES,
    RATES_AS_OF: RATES_AS_OF,
    MAX_BET_CURRENCIES: MAX_BET_CURRENCIES,
    CURRENCIES: CURRENCIES,
    catalogue: function () { return JSON.parse(JSON.stringify(CATALOGUE)); },
    OPERATIONS: OPERATIONS,
    sites: sites,
    site: site,
    currencyOf: currencyOf,
    member: member,
    memberIdsOf: memberIdsOf,
    biTags: biTags,
    tagMembers: tagMembers,
    matches: function () { return MATCHES.slice(); },
    matchById: matchById,
    isPrematch: isPrematch,
    blockReason: blockReason,
    usedFor: usedFor,
    rate: rate,
    convert: convert,
    operationsMaxBet: operationsMaxBet,
    money: money
  };
})(window);
