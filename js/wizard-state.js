/* Draft shared by the three Create Bonus steps.

   Kept in sessionStorage so the wizard survives navigation between the step
   pages but never outlives the browser session — this is a prototype, not a
   real save. Every accessor tolerates storage being unavailable. */
(function (global) {
  "use strict";

  var KEY = "promotion-suite:bonus-draft";

  var EMPTY = {
    general: {
      name: "",
      role: "licensee",
      licenseePt: "100",
      /* Who join the campaign: the Site IDs ticked on Step 1. */
      participants: [],
      /* User Group per joining site: { siteId: [{ memberId, siteId, currency, source }] } */
      groups: {},
      english: "",       // Campaign External Name (English)
      englishBannerDesktop: null,   // { name, size, type } — the image itself is not stored
      englishBannerMobile: null,
      englishTnc: "",
      languages: [],   // { id, native, label, limit, value, bannerDesktop, bannerMobile, tnc }
      note: "",
      /* Promotion page */
      promoOrder: "",        // 1–99, 1 shows first
      promoStartDate: "",
      promoStartTime: "",
      promoEndDate: "",
      promoEndTime: ""
    },
    /* Step 2 — Campaign Settings (2026-10-26: the old Usage & Schedule and
       Recipients steps were merged into this one). */
    settings: {
      /* Lossback (2026-10-26; user groups moved to Step 1 per site on 2026-10-27) */
      scopeMode: "match",   // match = one match | period = across matches
      periodStartDate: "", periodStartTime: "",
      periodEndDate: "", periodEndTime: "",
      matches: [],          // match IDs; one in "match" mode
      calcMode: "percent",  // percent = rebate percentage | amount = fixed rebate amount
      rebatePct: "",        // % of the net loss returned as a free bet
      minLoss: {},          // per currency, set on its own (optional): { USD: "50" }
      maxFreeBet: {},       // percent mode: cap per currency { USD: "100" }
      rebateAmount: {},     // amount mode: fixed free bet per currency { USD: "10" }
      fbScope: "all",       // all | specific
      fbSports: [],         // { sportId, sportName, leagues: [], betTypes: [] }
      minOdds: "1.5",
      maxOdds: "",
      maxOddsNoLimit: true,
      fbStartDate: "", fbStartTime: "",
      fbEndDate: "", fbEndTime: ""
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read() {
    var draft = clone(EMPTY);
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return draft;
      var stored = JSON.parse(raw);
      Object.keys(draft).forEach(function (section) {
        if (!stored[section]) return;
        if (Array.isArray(draft[section])) draft[section] = stored[section];
        else Object.assign(draft[section], stored[section]);
      });
    } catch (error) {
      /* Corrupt or blocked storage falls back to an empty draft. */
    }
    return draft;
  }

  function write(section, value) {
    var draft = read();
    if (Array.isArray(draft[section])) draft[section] = value;
    else Object.assign(draft[section], value);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch (error) {
      /* Ignore: the prototype still works, it just will not persist. */
    }
    return draft;
  }

  function clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (error) {
      /* nothing to do */
    }
  }

  global.BonusDraft = { read: read, write: write, clear: clear };
})(window);
