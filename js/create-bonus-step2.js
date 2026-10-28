(function () {
  "use strict";

  /* Create Bonus — Step 2: Campaign Settings — LOSSBACK (2026-10-26).

     User groups moved to Step 1 on 2026-10-27: every joining site sets its own
     there. This step keeps the campaign-wide Lossback setup:
       · Calculation Scope — By Match (one match, paid after it is settled) or
                             By Period (matches across a period, totalled and
                             paid once after the period ends and every match
                             is settled). Only matches Operations opened in
                             Admin site; a match any joining site already holds
                             in another campaign is left out.
       · Free Bet Calculation — Rebate Percentage or Rebate Absolute Amount,
                             each currency set on its own and optional.
                             net loss = valid stake − payout (0 if payout ≥ stake)
                             qualifies when net loss ≥ Min. Net Loss
                             percent: min(net loss × Rebate %, Max Free Bet), rounded down
                             amount:  Rebate Amount, fixed
       · Free Bet Setup    — scope (All / by Sport, League, Bet Type), odds
                             range, validity window.

     Platform data is mocked in js/campaign-data.js. Values marked ASSUMPTION
     are prototype defaults the spec has not fixed yet. */

  var D = window.CampaignData;
  var NOW = D.NOW;                       // "2026/07/27 00:25"
  var TODAY = NOW.split(" ")[0];

  var LIMITS = {
    pctMax: 100,             // ASSUMPTION: rebate % ceiling
    minOdds: 1.01            // ASSUMPTION: lowest Min Odds accepted
  };

  var MESSAGES = {
    required: "This field is required.",
    matchOne: "Select a match.",
    matches: "Select at least one match.",
    matchStale: "A selected match is no longer available. Remove it or pick another.",
    matchOutside: "A selected match kicks off outside the period. Remove it or change the period.",
    periodFirst: "Set the period first; only matches inside it can be picked.",
    startPast: "Start time cannot be earlier than now.",
    endBeforeStart: "End time must be later than the start time.",
    pct: "Enter a number above 0 and up to 100, up to 2 decimal places.",
    amount: "Enter a whole number greater than 0.",
    amountsPair: "Set both amounts for each currency you fill in.",
    amountsNone: "Set the amounts for at least one currency.",
    sports: "Add at least one sport.",
    minOdds: "Enter 1.01 or higher, up to 2 decimal places.",
    maxOdds: "Max Odds must be higher than Min Odds."
  };

  var $ = function (role) {
    return document.querySelector('[data-role="' + role + '"]');
  };

  var draft = BonusDraft.read();
  var sites = (draft.general.participants || []).slice();
  var saved = draft.settings;
  var state = {
    scopeMode: saved.scopeMode === "period" ? "period" : "match",
    periodStartDate: saved.periodStartDate || "", periodStartTime: saved.periodStartTime || "",
    periodEndDate: saved.periodEndDate || "", periodEndTime: saved.periodEndTime || "",
    matches: (saved.matches || []).slice(),
    calcMode: saved.calcMode === "amount" ? "amount" : "percent",
    rebatePct: saved.rebatePct || "",
    minLoss: Object.assign({}, saved.minLoss || {}),
    maxFreeBet: Object.assign({}, saved.maxFreeBet || {}),
    rebateAmount: Object.assign({}, saved.rebateAmount || {}),
    fbScope: saved.fbScope === "specific" ? "specific" : "all",
    fbSports: (saved.fbSports || []).slice(),
    minOdds: saved.minOdds === undefined ? "1.5" : saved.minOdds,
    maxOdds: saved.maxOdds || "",
    maxOddsNoLimit: saved.maxOddsNoLimit !== false,
    fbStartDate: saved.fbStartDate || "", fbStartTime: saved.fbStartTime || "",
    fbEndDate: saved.fbEndDate || "", fbEndTime: saved.fbEndTime || ""
  };

  function persist() {
    BonusDraft.write("settings", JSON.parse(JSON.stringify(state)));
  }

  /* ---------- Small helpers -------------------------------------------------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name) {
    var node = el("span", "icon icon--" + name);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function fmt(n) {
    return Number(n).toLocaleString("en-US");
  }

  function siteLabel(id) {
    return D.site(id).label;
  }

  function fieldOf(name) {
    return document.querySelector('[data-field="' + name + '"]');
  }

  function errorNode(field) {
    var node = field.querySelector(":scope > .field__error");
    if (!node) {
      node = el("p", "field__error");
      node.hidden = true;
      field.appendChild(node);
    }
    return node;
  }

  function setError(field, text) {
    field.classList.add("field--invalid");
    var node = errorNode(field);
    node.textContent = text;
    node.hidden = false;
    return false;
  }

  function clearError(field) {
    field.classList.remove("field--invalid");
    errorNode(field).hidden = true;
    return true;
  }

  /* Same toast-alert the rest of the wizard uses. */
  function toast(text, kind) {
    var notice = kind === "error";
    var node = el("div", "toast-alert toast-alert--" + (notice ? "notice" : "success"));
    var main = el("div", "toast-alert__main");
    var mark = el("span", "icon toast-alert__icon icon--" + (notice ? "attention-circle" : "check-circle"));
    mark.setAttribute("aria-hidden", "true");
    var content = el("div", "toast-alert__content");
    content.appendChild(el("p", "toast-alert__title", text));
    main.appendChild(mark);
    main.appendChild(content);
    node.appendChild(main);
    var dismiss = el("div", "toast-alert__dismiss");
    var close = el("button", "toast-alert__close");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.appendChild(icon("x"));
    close.addEventListener("click", function () { node.remove(); });
    dismiss.appendChild(close);
    node.appendChild(dismiss);
    $("toasts").appendChild(node);
    setTimeout(function () { node.remove(); }, 3000);
  }

  function download(name, content) {
    var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  var openDialogs = [];

  function openDialog(node) {
    node.hidden = false;
    document.body.style.overflow = "hidden";
    openDialogs.push(node);
  }

  function closeDialog(node) {
    node.hidden = true;
    openDialogs = openDialogs.filter(function (d) { return d !== node; });
    if (!openDialogs.length) document.body.style.overflow = "";
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !openDialogs.length) return;
    closeDialog(openDialogs[openDialogs.length - 1]);
  });

  /* No joining site yet: everything below is scoped to them. */
  $("no-sites").hidden = sites.length > 0;

  /* The players of every joining site, from the user groups set in Step 1 (one
     per site). Only their currencies matter here. */
  var members = [];
  sites.forEach(function (id) {
    ((draft.general.groups || {})[id] || []).forEach(function (m) { members.push(m); });
  });

  /* =========================================================================
     Calculation Scope
     ========================================================================= */
  var matchPending = new Set();
  var matchSport = "all";
  var matchSearch = "";

  function byKickoff(a, b) {
    return a.kickoff < b.kickoff ? -1 : a.kickoff > b.kickoff ? 1 : 0;
  }

  function matchName(m) {
    return m.home + " vs " + m.away;
  }

  function stamp(date, time) {
    return date && time ? date + " " + time : "";
  }

  function periodStart() { return stamp(state.periodStartDate, state.periodStartTime); }
  function periodEnd() { return stamp(state.periodEndDate, state.periodEndTime); }

  function periodReady() {
    return Boolean(periodStart() && periodEnd() && periodStart() >= NOW && periodEnd() > periodStart());
  }

  /* Why a match cannot be in this campaign, or "". Adds the period check on
     top of the platform's own reasons. */
  function matchIssue(m) {
    var reason = D.blockReason(m, sites);
    if (reason) return reason;
    if (state.scopeMode === "period" && periodReady() &&
        (m.kickoff < periodStart() || m.kickoff > periodEnd())) return "outside";
    return "";
  }

  function reasonText(reason) {
    if (reason === "not-prematch") return "Already started";
    if (reason === "not-open") return "Market not opened by Operations";
    if (reason === "used") return "Now used by another campaign";
    if (reason === "outside") return "Outside the period";
    return "";
  }

  function chosenMatches() {
    return state.matches.map(D.matchById).filter(Boolean).sort(byKickoff);
  }

  function syncScopeUi() {
    var period = state.scopeMode === "period";
    document.querySelectorAll('input[name="scope-mode"]').forEach(function (r) {
      r.checked = r.value === state.scopeMode;
    });
    $("period-fields").hidden = !period;
    $("matches-label").firstChild.textContent = period ? "Matches" : "Match";
    $("open-matches-label").textContent = period ? "Select Matches" : "Select Match";
    $("match-empty-text").textContent = period ? "No matches selected yet." : "No match selected yet.";
    $("matches-hint").textContent = period
      ? "Multiple selection. Matches must kick off inside the period."
      : "Single selection.";
    renderFormula();
    renderTiming();
  }

  function renderTiming() {
    var host = $("scope-timing");
    var chosen = chosenMatches();
    var text;
    if (state.scopeMode === "match") {
      text = chosen.length
        ? "Calculated and paid once " + matchName(chosen[0]) + " (kick-off " + chosen[0].kickoff + " GMT-4) is officially settled."
        : "Calculated and paid once the selected match is officially settled.";
    } else {
      text = periodEnd()
        ? "Calculated and paid once, after the period ends (" + periodEnd() + " GMT-4) and all " +
          (chosen.length ? chosen.length + " selected" : "selected") + " matches are settled."
        : "Calculated and paid once, after the period ends and all its matches are settled.";
    }
    host.textContent = text;
    renderFbEndHint();
  }

  document.querySelectorAll('input[name="scope-mode"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      state.scopeMode = radio.value;
      /* By Match holds one match: keep the earliest and say so. */
      if (state.scopeMode === "match" && state.matches.length > 1) {
        var first = chosenMatches()[0];
        state.matches = first ? [first.id] : [];
        toast("By Match holds one match. Kept " + (first ? matchName(first) : "none") + ".", "error");
      }
      syncScopeUi();
      renderMatches();
      if (fieldOf("matches").classList.contains("field--invalid")) validateMatches();
      persist();
    });
  });

  /* ---- Period ---------------------------------------------------------------- */
  function validatePeriod() {
    if (state.scopeMode !== "period") {
      clearError(fieldOf("period-start"));
      clearError(fieldOf("period-end"));
      return true;
    }
    var okStart = !periodStart()
      ? setError(fieldOf("period-start"), MESSAGES.required)
      : periodStart() < NOW ? setError(fieldOf("period-start"), MESSAGES.startPast)
      : clearError(fieldOf("period-start"));
    var okEnd = !periodEnd()
      ? setError(fieldOf("period-end"), MESSAGES.required)
      : periodStart() && periodEnd() <= periodStart() ? setError(fieldOf("period-end"), MESSAGES.endBeforeStart)
      : clearError(fieldOf("period-end"));
    return okStart && okEnd;
  }

  function bindDateTime(prefix, dateKey, timeKey, onChange) {
    var date = document.getElementById(prefix + "-date");
    var time = document.getElementById(prefix + "-time");
    date.value = state[dateKey];
    time.value = state[timeKey];
    [date, time].forEach(function (input) {
      input.addEventListener("blur", function () {
        state[dateKey] = date.value.trim();
        state[timeKey] = time.value.trim();
        syncDateLimits();
        onChange();
        persist();
      });
    });
  }

  function syncDateLimits() {
    document.getElementById("period-start-date").dataset.minDate = TODAY;
    document.getElementById("period-end-date").dataset.minDate = state.periodStartDate || TODAY;
    document.getElementById("fb-start-date").dataset.minDate = TODAY;
    document.getElementById("fb-end-date").dataset.minDate = state.fbStartDate || TODAY;
  }

  function onPeriodChange() {
    if (state.periodStartDate && state.periodStartTime) validatePeriod();
    else if (periodEnd()) validatePeriod();
    renderMatches();
    renderTiming();
    if (state.matches.length) validateMatches();
  }

  bindDateTime("period-start", "periodStartDate", "periodStartTime", onPeriodChange);
  bindDateTime("period-end", "periodEndDate", "periodEndTime", onPeriodChange);

  /* ---- Selected matches ------------------------------------------------------ */
  function renderMatches() {
    var chosen = chosenMatches();
    $("match-table").hidden = chosen.length === 0;
    $("match-empty").hidden = chosen.length > 0;
    var rows = $("match-rows");
    rows.innerHTML = "";
    chosen.forEach(function (m) {
      var reason = matchIssue(m);
      var row = el("div", "cs-table__row" + (reason ? " cs-table__row--invalid" : ""));
      row.appendChild(el("span", "cs-num", m.kickoff));
      var sport = el("span", null, m.sport);
      sport.dataset.col = "sport";
      row.appendChild(sport);
      var league = el("span", "cs-cell-ellipsis", m.league);
      league.dataset.col = "league";
      league.title = m.league;
      row.appendChild(league);
      var name = el("span", null, matchName(m));
      name.appendChild(el("span", "cs-cell-sub cs-num", m.id + (reason ? " · " + reasonText(reason) : "")));
      row.appendChild(name);
      var remove = el("button", "field__remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + matchName(m));
      remove.appendChild(icon("x"));
      remove.addEventListener("click", function () {
        state.matches = state.matches.filter(function (id) { return id !== m.id; });
        renderMatches();
        renderTiming();
        if (fieldOf("matches").classList.contains("field--invalid")) validateMatches();
        persist();
      });
      row.appendChild(remove);
      rows.appendChild(row);
    });
  }

  function validateMatches() {
    var field = fieldOf("matches");
    var single = state.scopeMode === "match";
    if (!state.matches.length) return setError(field, single ? MESSAGES.matchOne : MESSAGES.matches);
    var issues = chosenMatches().map(matchIssue).filter(Boolean);
    if (state.matches.length !== chosenMatches().length) return setError(field, MESSAGES.matchStale);
    if (issues.some(function (r) { return r !== "outside"; })) return setError(field, MESSAGES.matchStale);
    if (issues.length) return setError(field, MESSAGES.matchOutside);
    return clearError(field);
  }

  /* ---- Picker ---------------------------------------------------------------- */
  function renderMatchOptions() {
    var single = state.scopeMode === "match";
    var all = D.matches().sort(byKickoff);
    var hidden = { "not-prematch": 0, "not-open": 0, "used": 0, "outside": 0 };
    var q = matchSearch.trim().toLowerCase();

    var eligible = all.filter(function (m) {
      var reason = matchIssue(m);
      if (reason) { hidden[reason]++; return false; }
      return true;
    });
    var shown = eligible.filter(function (m) {
      if (matchSport !== "all" && m.sport !== matchSport) return false;
      if (!q) return true;
      return (m.home + " " + m.away + " " + m.league).toLowerCase().indexOf(q) !== -1;
    });

    var rows = $("match-options");
    rows.innerHTML = "";
    if (!shown.length) rows.appendChild(el("p", "cs-table__empty", "No matches found."));
    shown.forEach(function (m) {
      var row = el("label", "cs-table__row");
      var cell = el("span");
      var box = document.createElement("input");
      box.type = single ? "radio" : "checkbox";
      box.name = "match-pick";
      box.className = single ? "radio" : "checkbox";
      box.checked = matchPending.has(m.id);
      box.addEventListener("change", function () {
        if (single) matchPending = new Set([m.id]);
        else if (box.checked) matchPending.add(m.id);
        else matchPending.delete(m.id);
        $("match-count").textContent = String(matchPending.size);
      });
      cell.appendChild(box);
      row.appendChild(cell);
      row.appendChild(el("span", "cs-num", m.kickoff));
      var league = el("span", "cs-cell-ellipsis", m.league);
      league.appendChild(el("span", "cs-cell-sub", m.sport));
      row.appendChild(league);
      var name = el("span", null, matchName(m));
      name.appendChild(el("span", "cs-cell-sub cs-num", m.id));
      row.appendChild(name);
      rows.appendChild(row);
    });
    $("match-count").textContent = String(matchPending.size);

    var notes = [];
    if (hidden.used) notes.push(hidden.used + " already in another campaign of your sites");
    if (hidden["not-open"]) notes.push(hidden["not-open"] + " not opened by Operations");
    if (hidden["not-prematch"]) notes.push(hidden["not-prematch"] + " already started");
    if (hidden.outside) notes.push(hidden.outside + " outside the period");
    $("match-hidden-note").textContent = notes.length ? "Not listed: " + notes.join(", ") + "." : "";
  }

  document.querySelectorAll("[data-sport]").forEach(function (button) {
    button.addEventListener("click", function () {
      matchSport = button.dataset.sport;
      document.querySelectorAll("[data-sport]").forEach(function (b) {
        b.classList.toggle("segmented__item--active", b === button);
      });
      renderMatchOptions();
    });
  });

  $("match-search").addEventListener("input", function (event) {
    matchSearch = event.target.value;
    renderMatchOptions();
  });

  $("open-matches").addEventListener("click", function () {
    if (state.scopeMode === "period" && !periodReady()) {
      validatePeriod();
      setError(fieldOf("matches"), MESSAGES.periodFirst);
      return;
    }
    var single = state.scopeMode === "match";
    matchPending = new Set(state.matches.filter(function (id) {
      var m = D.matchById(id);
      return m && !matchIssue(m);
    }));
    document.getElementById("match-title").textContent = single ? "Select Match" : "Select Matches";
    $("match-dialog-hint").textContent = single
      ? "Pick one match. Only matches Operations has opened in Admin site are listed."
      : "Pick any number of matches kicking off between " + periodStart() + " and " + periodEnd() +
        " (GMT-4). Only matches Operations has opened in Admin site are listed.";
    renderMatchOptions();
    openDialog($("match-dialog"));
  });

  $("confirm-match").addEventListener("click", function () {
    var stale = state.matches.filter(function (id) {
      var m = D.matchById(id);
      return !m || matchIssue(m);
    });
    state.matches = state.scopeMode === "match"
      ? (matchPending.size ? Array.from(matchPending).slice(0, 1) : stale.slice(0, 1))
      : stale.concat(Array.from(matchPending));
    closeDialog($("match-dialog"));
    renderMatches();
    renderTiming();
    validateMatches();
    persist();
  });

  $("close-match").addEventListener("click", function () { closeDialog($("match-dialog")); });
  $("cancel-match").addEventListener("click", function () { closeDialog($("match-dialog")); });

  /* =========================================================================
     Free Bet Calculation
     ========================================================================= */
  /* Two ways to work out the free bet (2026-10-27), each currency set on its
     own and optional: a currency left blank gets no free bet.
       percent  free bet = min(net loss × Rebate %, Max Free Bet), rounded down
       amount   free bet = Rebate Amount, fixed, whatever the net loss is
     Both need net loss ≥ Min. Net Loss. */
  var pctInput = document.getElementById("rebate-pct");
  pctInput.value = state.rebatePct;

  var KEY_LABEL = { minLoss: "Min. Net Loss", maxFreeBet: "Max Free Bet", rebateAmount: "Rebate Amount" };

  function isAmountMode() { return state.calcMode === "amount"; }
  function secondKey() { return isAmountMode() ? "rebateAmount" : "maxFreeBet"; }
  function pairKeys() { return ["minLoss", secondKey()]; }

  function pctValue() {
    var v = String(state.rebatePct).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
    var n = Number(v);
    return n > 0 && n <= LIMITS.pctMax ? n : null;
  }

  function validatePct() {
    if (isAmountMode()) return clearError(fieldOf("rebate-pct"));
    var field = fieldOf("rebate-pct");
    if (!String(state.rebatePct).trim()) return setError(field, MESSAGES.required);
    if (pctValue() === null) return setError(field, MESSAGES.pct);
    return clearError(field);
  }

  pctInput.addEventListener("input", function () {
    state.rebatePct = pctInput.value;
    renderSim();
    persist();
  });
  pctInput.addEventListener("blur", validatePct);

  function amountValue(map, c) {
    var v = String(map[c] || "").trim();
    return /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : null;
  }

  function filled(key, c) {
    return Boolean(String(state[key][c] || "").trim());
  }

  /* A currency is optional as a whole, but once one of its two amounts is
     typed the other is needed too. */
  function amountIssue(key, c) {
    var v = String(state[key][c] || "").trim();
    if (!v) {
      var other = pairKeys().filter(function (k) { return k !== key; })[0];
      return filled(other, c) ? MESSAGES.required : "";
    }
    return amountValue(state[key], c) === null ? MESSAGES.amount : "";
  }

  function rowComplete(c) {
    return pairKeys().every(function (k) { return amountValue(state[k], c) !== null; });
  }

  function usd(value, c) {
    var n = value / D.rate(c);
    /* Whole dollars when it lands on one, otherwise 2 decimals. */
    var whole = Math.abs(n - Math.round(n)) < 0.005;
    return "USD " + (whole ? Math.round(n).toLocaleString("en-US") : n.toFixed(2));
  }

  function amountCell(key, c) {
    var map = state[key];
    var cell = el("div", "cs-maxbet-input");
    cell.dataset.amount = key + "-" + c;
    var control = el("div", "control");
    var input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.id = key + "-" + c;
    input.value = map[c] || "";
    input.setAttribute("aria-label", KEY_LABEL[key] + " in " + c);
    input.addEventListener("input", function () {
      input.value = input.value.replace(/\D+/g, "");
      map[c] = input.value;
      /* Typing in one cell can settle (or raise) the other cell's error. */
      pairKeys().forEach(function (k) {
        var node = document.querySelector('[data-amount="' + k + "-" + c + '"] .cs-maxbet-error');
        if (node && !node.hidden) paintAmount(k, c);
      });
      paintUsd(c);
      renderSim();
      persist();
    });
    input.addEventListener("blur", function () {
      pairKeys().forEach(function (k) { paintAmount(k, c); });
      syncAmountsField();
    });
    control.appendChild(input);
    control.appendChild(el("span", "control__suffix", c));
    cell.appendChild(control);
    var error = el("p", "cs-maxbet-error");
    error.hidden = true;
    cell.appendChild(error);
    return cell;
  }

  function paintAmount(key, c) {
    var cell = document.querySelector('[data-amount="' + key + "-" + c + '"]');
    if (!cell) return true;
    var issue = amountIssue(key, c);
    cell.querySelector(".control").classList.toggle("control--invalid", Boolean(issue));
    var error = cell.querySelector(".cs-maxbet-error");
    error.hidden = !issue;
    error.textContent = issue;
    return !issue;
  }

  function paintUsd(c) {
    var node = document.querySelector('[data-usd="' + c + '"]');
    if (!node) return;
    var a = amountValue(state.minLoss, c);
    var b = amountValue(state[secondKey()], c);
    node.textContent = c === "USD" ? "—" : (a === null ? "—" : usd(a, c)) + " / " + (b === null ? "—" : usd(b, c));
  }

  function playerCount(c) {
    return members.filter(function (m) { return m.currency === c; }).length;
  }

  function renderFormula() {
    var period = state.scopeMode === "period";
    var host = $("formula");
    host.innerHTML = "";
    var lines = [
      "<strong>Net loss</strong> = total valid stake − total payout " +
        (period ? "summed over the selected matches in the period" : "on the selected match") +
        ". When payout ≥ stake (profit or break-even), the net loss is 0 and nothing is paid.",
      "<strong>Qualifies</strong> when net loss ≥ Min. Net Loss.",
      isAmountMode()
        ? "<strong>Free bet</strong> = Rebate Amount, a fixed amount whatever the net loss is."
        : "<strong>Free bet</strong> = min(net loss × Rebate %, Max Free Bet). A result with decimals is rounded down."
    ];
    lines.forEach(function (html) {
      var p = document.createElement("p");
      p.innerHTML = html;
      host.appendChild(p);
    });
    var note = document.createElement("p");
    note.textContent = "Every amount is in the player's account currency.";
    host.appendChild(note);
  }

  function syncModeUi() {
    document.querySelectorAll('input[name="calc-mode"]').forEach(function (r) {
      r.checked = r.value === state.calcMode;
    });
    $("pct-field").hidden = isAmountMode();
    var second = KEY_LABEL[secondKey()];
    $("amounts-label").firstChild.textContent = "Min. Net Loss and " + second + " by Currency";
    $("amount-head").textContent = second;
    $("amounts-hint").textContent = "Each currency is set on its own and is optional: a currency left blank gets no free bet. " +
      "Set both amounts for a currency you use. The USD column is a reference at the rate shown, to keep the currencies in line.";
    renderFormula();
  }

  function renderAmounts() {
    var host = $("amount-rows");
    host.innerHTML = "";
    D.CURRENCIES.forEach(function (c) {
      var row = el("div", "cs-table__row");
      var name = el("span", null, c);
      var sub = el("span", "cs-cell-sub");
      sub.dataset.count = c;
      name.appendChild(sub);
      row.appendChild(name);
      row.appendChild(amountCell("minLoss", c));
      row.appendChild(amountCell(secondKey(), c));
      var ref = el("span", "cs-num cs-ref");
      ref.dataset.usd = c;
      row.appendChild(ref);
      host.appendChild(row);
      paintUsd(c);
    });
    renderFx();
    var rates = D.CURRENCIES.filter(function (c) { return c !== "USD"; }).map(function (c) {
      return "1 USD = " + D.rate(c).toLocaleString("en-US") + " " + c;
    });
    $("rate-note").textContent = "Reference rates as of " + D.RATES_AS_OF + " (placeholder): " + rates.join(" · ") +
      ". Rates are for reference only; each currency keeps the amounts entered here.";
  }

  /* Player counts per currency, from the user groups set in Step 1. */
  function renderFx() {
    D.CURRENCIES.forEach(function (c) {
      var node = document.querySelector('[data-count="' + c + '"]');
      if (!node) return;
      var n = playerCount(c);
      node.textContent = n ? fmt(n) + " player" + (n > 1 ? "s" : "") + " in the user groups" : "No players in the user groups";
    });
  }

  function syncAmountsField() {
    var field = fieldOf("amounts");
    if (!field.classList.contains("field--invalid")) return;
    var ok = D.CURRENCIES.every(function (c) {
      return pairKeys().every(function (k) { return !amountIssue(k, c); });
    }) && D.CURRENCIES.some(rowComplete);
    if (ok) clearError(field);
  }

  function validateAmounts() {
    var ok = true;
    D.CURRENCIES.forEach(function (c) {
      pairKeys().forEach(function (k) { if (!paintAmount(k, c)) ok = false; });
    });
    if (!ok) return setError(fieldOf("amounts"), MESSAGES.amountsPair);
    if (!D.CURRENCIES.some(rowComplete)) return setError(fieldOf("amounts"), MESSAGES.amountsNone);
    return clearError(fieldOf("amounts"));
  }

  /* Fills only the empty cells, at the reference rate, rounded to whole units;
     every value stays editable on its own afterwards. */
  $("fill-from-usd").addEventListener("click", function () {
    var base = {};
    pairKeys().forEach(function (k) { base[k] = amountValue(state[k], "USD"); });
    if (pairKeys().every(function (k) { return base[k] === null; })) {
      toast("Enter the USD amounts first.", "error");
      return;
    }
    var done = 0;
    D.CURRENCIES.forEach(function (c) {
      if (c === "USD") return;
      pairKeys().forEach(function (key) {
        if (base[key] === null || filled(key, c)) return;
        state[key][c] = String(Math.max(1, Math.round(base[key] * D.rate(c))));
        done++;
      });
    });
    renderAmounts();
    if (fieldOf("amounts").classList.contains("field--invalid")) validateAmounts();
    renderSim();
    persist();
    toast(done ? done + " empty field" + (done > 1 ? "s" : "") + " filled from USD." : "Nothing to fill; every field already has a value.");
  });

  document.querySelectorAll('input[name="calc-mode"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      state.calcMode = radio.value;
      clearError(fieldOf("rebate-pct"));
      clearError(fieldOf("amounts"));
      syncModeUi();
      renderAmounts();
      renderSim();
      persist();
    });
  });

  /* ---- Example --------------------------------------------------------------- */
  var simCurrency = $("sim-currency");
  D.CURRENCIES.forEach(function (c) {
    var option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    simCurrency.appendChild(option);
  });

  function renderSim() {
    var out = $("sim-result");
    var c = simCurrency.value;
    var stake = $("sim-stake").value.trim();
    var payout = $("sim-payout").value.trim();
    if (!stake || !payout) {
      out.textContent = "Enter a stake and a payout to see the result.";
      return;
    }
    var s = Number(stake), p = Number(payout);
    if (p >= s) {
      out.textContent = "Net loss " + D.money(0, c) + " (payout ≥ stake: profit or break-even) → no free bet.";
      return;
    }
    var loss = s - p;
    var min = amountValue(state.minLoss, c);
    var second = amountValue(state[secondKey()], c);
    var pct = pctValue();
    if (min === null || second === null || (!isAmountMode() && pct === null)) {
      out.textContent = "Net loss " + D.money(loss, c) + ". " + (isAmountMode()
        ? "Set Min. Net Loss and Rebate Amount for " + c + " to finish the example (a currency left blank gets no free bet)."
        : "Set Rebate %, and Min. Net Loss and Max Free Bet for " + c + " to finish the example (a currency left blank gets no free bet).");
      return;
    }
    if (loss < min) {
      out.textContent = "Net loss " + D.money(loss, c) + " is below the minimum " + D.money(min, c) + " → no free bet.";
      return;
    }
    if (isAmountMode()) {
      out.textContent = "Net loss " + D.money(loss, c) + " ≥ " + D.money(min, c) + " → fixed Free bet " + D.money(second, c) + ".";
      return;
    }
    var raw = Math.floor(loss * pct / 100 + 1e-9);
    var fb = Math.min(raw, second);
    out.textContent = "Net loss " + D.money(loss, c) + " ≥ " + D.money(min, c) + " → " + fmt(loss) + " × " + pct + "% = " +
      fmt(loss * pct / 100) + ", rounded down to " + D.money(raw, c) + (raw > second ? ", capped at " + D.money(second, c) : "") +
      " → Free bet " + D.money(fb, c) + ".";
  }

  simCurrency.addEventListener("change", renderSim);
  ["sim-stake", "sim-payout"].forEach(function (role) {
    $(role).addEventListener("input", function (event) {
      event.target.value = event.target.value.replace(/\D+/g, "");
      event.stopPropagation();
      renderSim();
    });
  });

  /* =========================================================================
     Free Bet Setup
     ========================================================================= */
  var CATALOGUE = D.catalogue();

  function syncFbScope() {
    document.querySelectorAll('input[name="fb-scope"]').forEach(function (r) {
      r.checked = r.value === state.fbScope;
    });
    $("fb-sports-wrap").hidden = state.fbScope !== "specific";
    renderSports();
  }

  document.querySelectorAll('input[name="fb-scope"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      state.fbScope = radio.value;
      syncFbScope();
      if (fieldOf("fb-scope").classList.contains("field--invalid")) validateFbScope();
      persist();
    });
  });

  function renderSports() {
    var rows = $("fb-sport-rows");
    rows.innerHTML = "";
    $("fb-sport-table").hidden = state.fbSports.length === 0;
    state.fbSports.forEach(function (entry, index) {
      var row = el("div", "cs-table__row");
      row.appendChild(el("span", null, entry.sportName));
      row.appendChild(el("span", null, entry.allLeagues ? "All leagues" : entry.leagues.join(", ")));
      row.appendChild(el("span", null, entry.allBetTypes ? "All bet types" : entry.betTypes.join(", ")));
      var remove = el("button", "field__remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + entry.sportName);
      remove.appendChild(icon("x"));
      remove.addEventListener("click", function () {
        state.fbSports.splice(index, 1);
        renderSports();
        persist();
      });
      row.appendChild(remove);
      rows.appendChild(row);
    });
    $("add-sport").disabled = state.fbSports.length >= CATALOGUE.length;
  }

  function validateFbScope() {
    if (state.fbScope === "specific" && !state.fbSports.length) return setError(fieldOf("fb-scope"), MESSAGES.sports);
    return clearError(fieldOf("fb-scope"));
  }

  /* ---- Add Sport dialog ------------------------------------------------------ */
  var sportSelect = $("sport-select");
  var pickLeagues = [];
  var pickBetTypes = [];

  function sportById(id) {
    return CATALOGUE.filter(function (s) { return s.id === id; })[0];
  }

  /* A check list with an "All" row on top that ticks or clears the rest. */
  function checkList(host, items, picked, onChange, allLabel) {
    host.innerHTML = "";
    var allRow = el("label", "option cs-check-all");
    var all = document.createElement("input");
    all.type = "checkbox";
    all.className = "checkbox";
    all.checked = picked.length === items.length;
    all.indeterminate = picked.length > 0 && picked.length < items.length;
    all.addEventListener("change", function () {
      onChange(all.checked ? items.slice() : []);
    });
    allRow.appendChild(all);
    allRow.appendChild(el("span", null, allLabel));
    host.appendChild(allRow);
    items.forEach(function (item) {
      var row = el("label", "option");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = "checkbox";
      box.checked = picked.indexOf(item) !== -1;
      box.addEventListener("change", function () {
        var next = picked.filter(function (p) { return p !== item; });
        if (box.checked) next = items.filter(function (i) { return next.indexOf(i) !== -1 || i === item; });
        onChange(next);
      });
      row.appendChild(box);
      row.appendChild(el("span", null, item));
      host.appendChild(row);
    });
  }

  function renderSportDialog() {
    var sport = sportById(sportSelect.value);
    checkList($("league-options"), sport.leagues, pickLeagues, function (next) {
      pickLeagues = next;
      renderSportDialog();
    }, "All leagues");
    checkList($("bettype-options"), sport.betTypes, pickBetTypes, function (next) {
      pickBetTypes = next;
      renderSportDialog();
    }, "All bet types");
    $("save-sport").disabled = !(pickLeagues.length && pickBetTypes.length);
  }

  $("add-sport").addEventListener("click", function () {
    sportSelect.innerHTML = "";
    CATALOGUE.forEach(function (s) {
      if (state.fbSports.some(function (e) { return e.sportId === s.id; })) return;
      var option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      sportSelect.appendChild(option);
    });
    if (!sportSelect.options.length) return;
    pickLeagues = [];
    pickBetTypes = [];
    renderSportDialog();
    openDialog($("sport-dialog"));
  });

  sportSelect.addEventListener("change", function () {
    pickLeagues = [];
    pickBetTypes = [];
    renderSportDialog();
  });

  $("save-sport").addEventListener("click", function () {
    var sport = sportById(sportSelect.value);
    state.fbSports.push({
      sportId: sport.id,
      sportName: sport.name,
      leagues: pickLeagues.slice(),
      betTypes: pickBetTypes.slice(),
      allLeagues: pickLeagues.length === sport.leagues.length,
      allBetTypes: pickBetTypes.length === sport.betTypes.length
    });
    closeDialog($("sport-dialog"));
    renderSports();
    validateFbScope();
    persist();
  });

  $("close-sport").addEventListener("click", function () { closeDialog($("sport-dialog")); });
  $("cancel-sport").addEventListener("click", function () { closeDialog($("sport-dialog")); });

  /* ---- Odds -------------------------------------------------------------------- */
  var minOddsInput = document.getElementById("min-odds");
  var maxOddsInput = document.getElementById("max-odds");
  var noLimit = document.getElementById("max-odds-no-limit");
  minOddsInput.value = state.minOdds;
  maxOddsInput.value = state.maxOdds;
  noLimit.checked = state.maxOddsNoLimit;

  function oddsValue(v) {
    v = String(v || "").trim();
    return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : null;
  }

  function syncNoLimit() {
    maxOddsInput.disabled = state.maxOddsNoLimit;
    maxOddsInput.closest(".control").classList.toggle("control--disabled", state.maxOddsNoLimit);
    if (state.maxOddsNoLimit) clearError(fieldOf("max-odds"));
  }

  function validateOdds() {
    var min = oddsValue(state.minOdds);
    var okMin = !String(state.minOdds).trim()
      ? setError(fieldOf("min-odds"), MESSAGES.required)
      : min === null || min < LIMITS.minOdds ? setError(fieldOf("min-odds"), MESSAGES.minOdds)
      : clearError(fieldOf("min-odds"));
    if (state.maxOddsNoLimit) return okMin && clearError(fieldOf("max-odds"));
    var max = oddsValue(state.maxOdds);
    var okMax = !String(state.maxOdds).trim()
      ? setError(fieldOf("max-odds"), MESSAGES.required)
      : max === null ? setError(fieldOf("max-odds"), MESSAGES.minOdds)
      : min !== null && max <= min ? setError(fieldOf("max-odds"), MESSAGES.maxOdds)
      : clearError(fieldOf("max-odds"));
    return okMin && okMax;
  }

  minOddsInput.addEventListener("input", function () { state.minOdds = minOddsInput.value; persist(); });
  maxOddsInput.addEventListener("input", function () { state.maxOdds = maxOddsInput.value; persist(); });
  minOddsInput.addEventListener("blur", validateOdds);
  maxOddsInput.addEventListener("blur", validateOdds);
  noLimit.addEventListener("change", function () {
    state.maxOddsNoLimit = noLimit.checked;
    if (noLimit.checked) { state.maxOdds = ""; maxOddsInput.value = ""; }
    syncNoLimit();
    persist();
  });

  /* ---- Validity ---------------------------------------------------------------- */
  function fbStart() { return stamp(state.fbStartDate, state.fbStartTime); }
  function fbEnd() { return stamp(state.fbEndDate, state.fbEndTime); }

  /* The earliest a free bet can be paid: after the match (By Match) or after
     the period (By Period). A free bet that expires before then is useless. */
  function earliestPayout() {
    if (state.scopeMode === "match") {
      var m = chosenMatches()[0];
      return m ? { at: m.kickoff, label: "the match kick-off (" + m.kickoff + ")" } : null;
    }
    return periodEnd() ? { at: periodEnd(), label: "the period end (" + periodEnd() + ")" } : null;
  }

  function renderFbEndHint() {
    var p = earliestPayout();
    $("fb-end-hint").textContent = p
      ? "Must be after " + p.label + ": free bets are paid only after settlement."
      : "Must be after the free bets are paid (after settlement).";
  }

  function validateFbDates() {
    var okStart = !fbStart()
      ? setError(fieldOf("fb-start"), MESSAGES.required)
      : fbStart() < NOW ? setError(fieldOf("fb-start"), MESSAGES.startPast)
      : clearError(fieldOf("fb-start"));
    var p = earliestPayout();
    var okEnd = !fbEnd()
      ? setError(fieldOf("fb-end"), MESSAGES.required)
      : fbStart() && fbEnd() <= fbStart() ? setError(fieldOf("fb-end"), MESSAGES.endBeforeStart)
      : p && fbEnd() <= p.at ? setError(fieldOf("fb-end"), "Valid Until must be after " + p.label + ", when free bets are paid.")
      : clearError(fieldOf("fb-end"));
    return okStart && okEnd;
  }

  function onFbDateChange() {
    if (fbStart()) validateFbDates();
    else if (fbEnd()) validateFbDates();
  }

  bindDateTime("fb-start", "fbStartDate", "fbStartTime", onFbDateChange);
  bindDateTime("fb-end", "fbEndDate", "fbEndTime", onFbDateChange);

  /* =========================================================================
     Footer
     ========================================================================= */
  function validateAll() {
    var checks = [
      validatePeriod(),
      validateMatches(),
      validatePct(),
      validateAmounts(),
      validateFbScope(),
      validateOdds(),
      validateFbDates()
    ];
    return checks.indexOf(false) === -1;
  }

  function focusFirstInvalid() {
    var field = document.querySelector(".field--invalid");
    if (field) field.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  $("next").addEventListener("click", function () {
    if (validateAll()) {
      persist();
      window.location.href = "create-bonus-step3.html";
      return;
    }
    focusFirstInvalid();
  });

  $("save-draft").addEventListener("click", function () {
    persist();
    toast("Draft saved.");
  });

  /* ---------- First paint ------------------------------------------------------ */
  syncDateLimits();
  DateTimePicker.init(document);
  syncScopeUi();
  renderMatches();
  syncModeUi();
  renderAmounts();
  renderSim();
  syncFbScope();
  syncNoLimit();
  persist();

  if (StaleCheck.forStep(2).length) validateMatches();
  StaleCheck.render(2, function () {
    if (validateAll()) return true;
    focusFirstInvalid();
    return false;
  });
})();
