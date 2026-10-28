/* Distribution Records.

   Sources: UX [Wireframe] 管理 Bonus 發放紀錄 (4606:32940).
     · page + summary + record list        4606:33052
     · checkbox / batch action rules        4606:34722, 4606:35275
     · confirmation and running states      4606:33769, 4621:74523
     · log structure and its rules          4606:35095, 4606:35596
     · alert bar rule                       "僅會在 Recall 操作失敗時顯示"

   The UX states that Retry Distribution and Recall Bonus share one confirmation
   and feedback flow and illustrates only Retry, so the Recall wording here is
   written by analogy and is flagged in the handover. */
(function () {
  "use strict";

  var $ = function (role, scope) {
    return (scope || document).querySelector('[data-role="' + role + '"]');
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- Data ------------------------------------------------------- */

  /* Option lists and their order come from the UX's dropdown mock-ups
     (Currency 4606:33577, Distribution Result 4606:33471, Voucher Status
     4606:33521). */
  var CURRENCIES = ["USD", "IDR", "GBP", "MYR", "THB"];
  var RESULTS = ["Success", "Failed", "Recalled"];
  var STATUSES = ["Unused", "Used", "Expired"];
  var DENOMINATION = { USD: 10, IDR: 50000, GBP: 10, MYR: 50, THB: 300 };

  /* The Oneworks build sees every site under the operator, so each voucher
     carries the site it was distributed to (UX 5673:84525). The Licensee build
     is scoped to one site and never shows the column. */
  var SITES = ["Site-001", "Site-002", "Site-003", "Site-004", "Site-005"];

  /* Each site pays out in its own set of currencies, so narrowing the Site
     filter visibly narrows the Currency options (UX 4606:33572). */
  var SITE_CURRENCIES = {
    "Site-001": ["USD"],
    "Site-002": ["USD", "IDR"],
    "Site-003": ["USD", "IDR", "GBP", "MYR", "THB"],
    "Site-004": ["MYR", "THB"],
    "Site-005": ["GBP"]
  };

  var TOTAL_RECIPIENTS = 200;
  var TOTAL_VOUCHERS = 500;

  function isOneworks() {
    return Boolean(window.Role && window.Role.isOneworks());
  }

  /* A deterministic set so the page looks the same on every load: 500 vouchers
     across 200 members, 20 of them failed to distribute. */
  var ROWS = (function () {
    var rows = [];
    var perSite = Math.ceil(TOTAL_VOUCHERS / SITES.length);
    for (var i = 0; i < TOTAL_VOUCHERS; i++) {
      var site = SITES[Math.floor(i / perSite)];
      var fromSite = SITE_CURRENCIES[site];
      var currency = fromSite[i % fromSite.length];
      var failed = i % 25 === 7;
      var used = !failed && i % 11 === 3;
      var expired = !failed && !used && i % 37 === 5;
      rows.push({
        id: i,
        /* Sites run in blocks rather than round-robin so a filtered list reads
           like one site's records, the way the UX draws it. */
        site: site,
        member: "FB" + (20260802000 + (i % TOTAL_RECIPIENTS) + 1),
        voucher: "VCH" + (10001000 + i),
        result: failed ? "Failed" : "Success",
        status: failed ? "Unused" : used ? "Used" : expired ? "Expired" : "Unused",
        currency: currency,
        denomination: DENOMINATION[currency]
      });
    }
    return rows;
  })();

  /* ---------- What a record allows --------------------------------------- */
  /* Distribution Result = Failed  → Retry Distribution
     Voucher Status = Unused (and the distribution itself succeeded)
                                  → Recall Bonus
     anything else                → disabled (4606:34722) */

  /* What the row actually shows (4606:35426): a failed distribution never
     produced a voucher, so it has neither an id nor a status; a recalled one
     keeps its id but no longer has a status to report. The filters and the
     search go through these too, so they never match a cell reading "—". */
  function shownVoucher(row) { return row.result === "Failed" ? "" : row.voucher; }
  function shownStatus(row) {
    return (row.result === "Failed" || row.result === "Recalled") ? "" : row.status;
  }

  function canRetry(row) { return row.result === "Failed"; }
  function canRecall(row) { return row.result === "Success" && row.status === "Unused"; }
  function allows(row, action) { return action === "retry" ? canRetry(row) : canRecall(row); }

  /* The copy for a checkbox that cannot be ticked (4606:35275). */
  function blockedReason(row, action) {
    if (action === "recall") {
      if (row.result === "Failed") return "Failed distributions cannot be recalled";
      if (row.result === "Recalled") return "This distribution has already been recalled";
      if (row.status === "Used") return "Used vouchers cannot be recalled";
      if (row.status === "Expired") return "Expired vouchers cannot be recalled";
    }
    if (action === "retry") {
      if (row.result === "Success") return "Successful distributions cannot be retried";
      if (row.result === "Recalled") return "Recalled distributions cannot be retried";
    }
    /* No action chosen yet: say why this record has nothing to offer. */
    if (row.result === "Recalled") return "This distribution has already been recalled";
    if (row.status === "Used") return "Used vouchers cannot be recalled";
    if (row.status === "Expired") return "Expired vouchers cannot be recalled";
    return "No actions available for these records";
  }

  /* ---------- State ------------------------------------------------------ */

  var state = {
    search: "",
    site: new Set(),
    currency: new Set(),
    result: new Set(),
    status: new Set(),
    page: 1,
    perPage: 50,
    selected: new Set(),
    action: null,
    /* Seeded with the two operations the UX draws in its log examples
       (4606:35596), so the panel shows the component as specified. */
    log: [
      { action: "Recall Bonus", actor: "Oneworks", when: "2026/07/14 14:30 (GMT-4)",
        count: 70, field: "Distribution Result", from: "Success", to: "Recalled",
        tone: "success",
        ids: ["VCH10001020", "VCH10001021", "VCH10001022", "VCH10001023", "VCH10001024"] },
      { action: "Retry Distribution", actor: "Oneworks", when: "2026/07/14 14:30 (GMT-4)",
        count: 70, field: "Distribution Result", from: "Failed", to: "Success",
        tone: "success",
        ids: ["VCH10001020", "VCH10001021", "VCH10001022", "VCH10001023"] }
    ]
  };

  function visibleRows() {
    var term = state.search.trim().toLowerCase();
    return ROWS.filter(function (row) {
      if (term && row.member.toLowerCase().indexOf(term) === -1 &&
          shownVoucher(row).toLowerCase().indexOf(term) === -1) return false;
      if (state.site.size && !state.site.has(row.site)) return false;
      if (state.currency.size && !state.currency.has(row.currency)) return false;
      if (state.result.size && !state.result.has(row.result)) return false;
      if (state.status.size && !state.status.has(shownStatus(row))) return false;
      return true;
    });
  }

  function hasFilters() {
    return !!state.search || state.site.size > 0 || state.currency.size > 0 ||
      state.result.size > 0 || state.status.size > 0;
  }

  function selectedRows() {
    return ROWS.filter(function (row) { return state.selected.has(row.id); });
  }

  /* ---------- Summary ---------------------------------------------------- */

  function counts() {
    var success = 0, failed = 0, recalled = 0;
    ROWS.forEach(function (row) {
      if (row.result === "Success") success++;
      else if (row.result === "Failed") failed++;
      else if (row.result === "Recalled") recalled++;
    });
    return { success: success, failed: failed, recalled: recalled };
  }

  function renderSummary() {
    var c = counts();
    $("total-recipients").textContent = String(TOTAL_RECIPIENTS);
    $("total-vouchers").textContent = String(TOTAL_VOUCHERS);
    $("total-success").textContent = String(c.success);
    $("total-failed").textContent = String(c.failed);

    /* Recalled is a dynamic cell: shown once a recall has succeeded. */
    $("recalled-item").hidden = c.recalled === 0;
    $("total-recalled").textContent = String(c.recalled);

    renderAlerts();
  }

  /* The in-progress bar is one line in three weights: the action word carries
     the title's weight, the counter is muted, the words between are neither
     (5789:47959). */
  function progressLine(node, word, done, total, tail) {
    node.textContent = "";
    node.appendChild(el("strong", undefined, word));
    node.appendChild(document.createTextNode(" "));
    node.appendChild(el("span", "alert__count", done + " / " + total));
    node.appendChild(document.createTextNode(" " + tail));
  }

  /* One bar, either reporting a failure or reporting progress. Running swaps
     the whole presentation, not just the text: Neutral tone, a spinner for the
     icon and no CTA at all (UX 5789:47959, badged 10/16). */
  function paintAlert(key, running, paintProgress, paintFailure) {
    var bar = $(key + "-alert");
    bar.classList.toggle("alert--progress", running);
    bar.classList.toggle("alert--destructive", !running);
    $(key + "-alert-icon").hidden = running;
    $(key + "-alert-spinner").hidden = !running;
    $("alert-" + key).hidden = running;
    if (running) paintProgress($(key + "-alert-text"));
    else paintFailure($(key + "-alert-text"));
  }

  /* The two bars are judged separately and both count the whole list, not the
     filtered view (4606:33754). Retry sits above Recall when both are up, which
     is their order in the markup. */
  function renderAlerts() {
    var failed = ROWS.filter(canRetry).length;
    var failedRecalls = ROWS.filter(function (row) { return row.recallFailed; }).length;

    var p = progress;
    var retryRunning = !!(p && p.action === "retry");
    var recallRunning = !!(p && p.action === "recall");

    $("retry-alert").hidden = failed === 0 && !retryRunning;
    paintAlert("retry", retryRunning, function (node) {
      progressLine(node, "Retrying", p.done, p.total, "failed distributions…");
    }, function (node) {
      node.textContent = failed + " distributions failed.";
    });

    $("recall-alert").hidden = failedRecalls === 0 && !recallRunning;
    paintAlert("recall", recallRunning, function (node) {
      progressLine(node, "Recalling", p.done, p.total, "bonuses…");
    }, function (node) {
      node.textContent = failedRecalls + " bonus recalls failed.";
    });
  }

  /* Everything that could start a second operation is dead while one runs:
     the three list actions and the whole filter row (UX 5789:47471). The
     selection itself stays put, checkboxes included. */
  function renderRunningLock() {
    var busy = running !== null;
    ["export-trigger", "retry-trigger", "recall-trigger"].forEach(function (role) {
      if (busy) $(role).disabled = true;
    });
    ["site-trigger", "currency-trigger", "result-trigger", "status-trigger"]
      .forEach(function (role) { $(role).disabled = busy; });
    $("search").disabled = busy;
    $("reset").disabled = busy || !hasFilters();
  }

  /* ---------- Table ------------------------------------------------------ */

  function resultTag(row) {
    var kind = row.result === "Success" ? "success" : row.result === "Failed" ? "destructive" : "normal";
    return el("span", "tag tag--" + kind, row.result);
  }

  function statusTag(row) {
    var kind = row.status === "Unused" ? "normal" : row.status === "Used" ? "success" : "warning";
    return el("span", "tag tag--" + kind, row.status);
  }

  function cell(text, extra) {
    var node = el("div", "table__cell" + (extra ? " " + extra : ""));
    node.setAttribute("role", "cell");
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function anyActionable() {
    return ROWS.some(function (row) { return canRetry(row) || canRecall(row); });
  }

  function pageRows() {
    var rows = visibleRows();
    var start = (state.page - 1) * state.perPage;
    return rows.slice(start, start + state.perPage);
  }

  function renderRows() {
    var host = $("rows");
    host.innerHTML = "";
    var rows = pageRows();

    rows.forEach(function (row) {
      var line = el("div", "table__row" + (state.selected.has(row.id) ? " table__row--selected" : ""));
      line.setAttribute("role", "row");

      /* Which checkboxes stay live: the first tick fixes the action type, and
         only records supporting that same action may still be ticked. */
      var usable = state.action ? allows(row, state.action) : (canRetry(row) || canRecall(row));
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = "checkbox";
      box.checked = state.selected.has(row.id);
      box.disabled = !usable;
      box.setAttribute("aria-label", "Select " + row.voucher);
      box.addEventListener("change", function () {
        if (box.checked) {
          if (!state.action) state.action = canRetry(row) ? "retry" : "recall";
          state.selected.add(row.id);
        } else {
          state.selected.delete(row.id);
          if (!state.selected.size) state.action = null;
        }
        render();
      });

      var holder = el("div", "table__cell records-table__check");
      holder.setAttribute("role", "cell");
      var wrap = el("span", "has-tooltip");
      wrap.appendChild(box);
      if (!usable) {
        wrap.appendChild(el("span", "tooltip tooltip--start", blockedReason(row, state.action)));
      }
      holder.appendChild(wrap);
      line.appendChild(holder);

      if (isOneworks()) line.appendChild(cell(row.site));
      line.appendChild(cell(row.member, "cell-id"));
      var resultCell = cell(undefined);
      resultCell.appendChild(resultTag(row));
      line.appendChild(resultCell);
      var voucher = shownVoucher(row);
      line.appendChild(voucher
        ? cell(voucher, "cell-id")
        : cell("\u2014", "cell-id cell--none"));
      var statusCell = shownStatus(row) ? cell(undefined) : cell("\u2014", "cell--none");
      if (shownStatus(row)) statusCell.appendChild(statusTag(row));
      line.appendChild(statusCell);
      line.appendChild(cell(row.currency));
      line.appendChild(cell(String(row.denomination)));

      host.appendChild(line);
    });

    var table = $("table");
    var empty = $("empty");
    var none = rows.length === 0;
    table.querySelector(".table__head").hidden = none;
    empty.hidden = !none;
    $("pager").hidden = none;
  }

  function renderSelectAll() {
    var box = $("select-all");
    var tip = $("select-all-tip");
    var rows = pageRows();
    var usable = rows.filter(function (row) {
      return state.action ? allows(row, state.action) : (canRetry(row) || canRecall(row));
    });

    /* Mixed list with nothing chosen yet: the header cannot know which action
       it would be selecting for. */
    /* "列表同時包含 Retry 與 Recall" is about the list, not this page of it. */
    var all = visibleRows();
    var mixed = !state.action && all.some(canRetry) && all.some(canRecall);

    var reason = "";
    if (!anyActionable()) reason = "No actions available for these records";
    else if (mixed) reason = "Select a record first to choose Retry or Recall";

    box.disabled = !!reason || usable.length === 0;
    tip.textContent = reason;
    tip.hidden = !reason;

    var chosen = usable.filter(function (row) { return state.selected.has(row.id); });
    box.checked = usable.length > 0 && chosen.length === usable.length;
    box.indeterminate = chosen.length > 0 && chosen.length < usable.length;
  }

  /* ---------- List actions ------------------------------------------------ */
  /* Three menu buttons. Whether a button shows is judged on the whole list;
     whether it is enabled is judged on the rows the filters currently show plus
     what is ticked (4895:144385, 4895:144442/144466/144484). */

  var ACTION_LABEL = { retry: "Retry Distribution", recall: "Recall Bonus" };

  /* Set while an action is running: the bar switches to its Neutral progress
     form and the list actions and filters go dead. `progress` carries the
     count that bar reports. */
  var running = null;
  var progress = null;

  function countIn(rows, test) {
    return rows.filter(test).length;
  }

  /* An item that is disabled shows no count, per the three "未...時 Disabled,
     不顯示計數" notes. */
  function menuItem(role, label, count, disabled) {
    var node = $(role);
    node.textContent = disabled ? label : label + " (" + count + ")";
    node.disabled = disabled;
  }

  function renderListActions() {
    var shown = visibleRows();
    var selected = selectedRows();
    var filtered = hasFilters() || state.search !== "";

    /* ----- Export All: always shown, dead only when nothing is listed ----- */
    $("export-trigger").disabled = shown.length === 0;
    menuItem("export-all", "All records", ROWS.length, false);
    menuItem("export-filtered", "Filtered results", shown.length,
      !filtered || shown.length === 0);

    /* ----- Retry Distribution ----- */
    var anyFailedAnywhere = ROWS.some(canRetry);
    var failedShown = countIn(shown, canRetry);
    var recallSelected = state.action === "recall" && selected.length > 0;
    $("retry-menu-wrap").hidden = !anyFailedAnywhere;
    $("retry-trigger").disabled = failedShown === 0 || recallSelected;
    menuItem("retry-all", "Retry all failed", failedShown, failedShown === 0);
    menuItem("retry-selected", "Retry selected", selected.length,
      state.action !== "retry" || selected.length === 0);

    /* ----- Recall Bonus ----- */
    var anyUnusedAnywhere = ROWS.some(canRecall);
    var unusedShown = countIn(shown, canRecall);
    var retrySelected = state.action === "retry" && selected.length > 0;
    $("recall-menu-wrap").hidden = !anyUnusedAnywhere;
    $("recall-trigger").disabled = unusedShown === 0 || retrySelected;
    menuItem("recall-all", "Recall all unused", unusedShown, unusedShown === 0);
    menuItem("recall-selected", "Recall selected", selected.length,
      state.action !== "recall" || selected.length === 0);

    /* A disabled trigger must not keep its menu open. */
    [["export", "export-menu"], ["retry", "retry-menu"], ["recall", "recall-menu"]]
      .forEach(function (pair) {
        var trigger = $(pair[0] + "-trigger");
        if (trigger.disabled) {
          $(pair[1]).hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        }
      });
  }

  /* ---------- Selected bar ------------------------------------------------- */
  function renderSelectedBar() {
    var count = state.selected.size;
    $("selected-bar").hidden = count === 0;
    $("selected-count").textContent = String(count);
  }

  function clearSelection() {
    state.selected.clear();
    state.action = null;
  }

  /* ---------- Filters ---------------------------------------------------- */

  /* Currency and Voucher Status take several values; Distribution Result takes
     one (4606:33467 「僅支援單選」), so it draws radios and replaces rather than
     adds. Everything else about the three is identical. */
  function multiSelect(key, options, roleTrigger, roleValue, rolePanel, single, searchLabel) {
    var trigger = $(roleTrigger);
    var value = $(roleValue);
    var panel = $(rolePanel);
    var store = state[key];
    /* Currency's list narrows to what the chosen sites actually paid out, so
       options can be a function rather than a fixed array (UX 4606:33572). */
    var list = typeof options === "function" ? options : function () { return options; };
    var term = "";

    function renderValue() {
      value.innerHTML = "";
      if (!store.size) {
        value.appendChild(el("span", "select__placeholder", "Select"));
        return;
      }
      var chosen = list().filter(function (name) { return store.has(name); });
      /* Up to two full tags, then +{x} — tags keep the dropdown's own order. */
      chosen.slice(0, 2).forEach(function (name) {
        var tag = el("span", "tag tag--normal select__tag");
        tag.appendChild(document.createTextNode(name));
        var remove = el("span", "select__tag-remove");
        remove.setAttribute("role", "button");
        remove.setAttribute("aria-label", "Remove " + name);
        remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
        remove.addEventListener("click", function (event) {
          event.stopPropagation();
          store.delete(name);
          state.page = 1;
          render();
        });
        tag.appendChild(remove);
        value.appendChild(tag);
      });
      if (chosen.length > 2) {
        value.appendChild(el("span", "select__overflow", "+" + (chosen.length - 2)));
      }
    }

    function renderPanel() {
      panel.innerHTML = "";

      /* The Site filter searches its own options; the list can run to dozens of
         sites, so the UX puts a search box above them (5673:85715). */
      if (searchLabel) {
        var search = el("div", "input filter-select__search");
        var icon = el("span", "icon icon--search");
        icon.setAttribute("aria-hidden", "true");
        search.appendChild(icon);
        var field = document.createElement("input");
        field.type = "text";
        field.placeholder = searchLabel;
        field.value = term;
        field.addEventListener("click", function (event) { event.stopPropagation(); });
        field.addEventListener("input", function () {
          term = field.value;
          renderPanel();
          var again = panel.querySelector(".filter-select__search input");
          if (again) { again.focus(); again.setSelectionRange(term.length, term.length); }
        });
        search.appendChild(field);
        panel.appendChild(search);
      }

      var shown = list().filter(function (name) {
        return !term || name.toLowerCase().indexOf(term.trim().toLowerCase()) > -1;
      });
      shown.forEach(function (name) {
        var option = el("label", "filter-select__option");
        var box = document.createElement("input");
        box.type = single ? "radio" : "checkbox";
        if (single) box.name = key + "-filter";
        box.checked = store.has(name);
        box.addEventListener("change", function () {
          if (single) {
            store.clear();
            if (box.checked) store.add(name);
          } else if (box.checked) store.add(name);
          else store.delete(name);
          state.page = 1;
          render();
        });
        option.appendChild(box);
        option.appendChild(document.createTextNode(name));
        panel.appendChild(option);
      });

      /* The multi-selects close with a count and a way to clear them; the
         single-select has no footer (4606:33577 vs 4606:33471). */
      if (single) return;
      var footer = el("div", "filter-select__footer");
      var count = el("span", "filter-select__count");
      count.appendChild(el("b", null, String(store.size)));
      count.appendChild(el("span", null, "selected"));
      footer.appendChild(count);

      var clear = el("button", "button button--ghost button--small", "Clear");
      clear.type = "button";
      clear.disabled = store.size === 0;
      clear.addEventListener("click", function () {
        store.clear();
        state.page = 1;
        render();
      });
      footer.appendChild(clear);
      panel.appendChild(footer);
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var opening = panel.hidden;
      closePanels();
      panel.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
      if (opening) renderPanel();
    });
    panel.addEventListener("click", function (event) { event.stopPropagation(); });

    /* The panel is rebuilt from the store on every render, so removing a tag or
       hitting Reset while it is open leaves it showing the truth rather than
       the ticks it had a moment ago. */
    return { renderValue: renderValue, renderPanel: renderPanel };
  }

  function closePanels() {
    document.querySelectorAll(".filter-select__panel").forEach(function (panel) {
      panel.hidden = true;
    });
    document.querySelectorAll(".batch-action__menu").forEach(function (menu) {
      menu.hidden = true;
    });
    document.querySelectorAll('[aria-expanded="true"]').forEach(function (node) {
      node.setAttribute("aria-expanded", "false");
    });
  }

  /* Only the sites this distribution actually reached (UX 5673:85715). */
  function siteOptions() {
    return SITES.filter(function (name) {
      return ROWS.some(function (row) { return row.site === name; });
    });
  }

  /* "選項 顯示該 site 有發放的幣別" — once sites are chosen the currency list
     narrows to what those sites paid out (UX 4606:33572). */
  function currencyOptions() {
    return CURRENCIES.filter(function (code) {
      return ROWS.some(function (row) {
        return row.currency === code && (!state.site.size || state.site.has(row.site));
      });
    });
  }

  var siteFilter = multiSelect("site", siteOptions, "site-trigger", "site-value", "site-panel", false, "Search site");
  var currencyFilter = multiSelect("currency", currencyOptions, "currency-trigger", "currency-value", "currency-panel");
  var resultFilter = multiSelect("result", RESULTS, "result-trigger", "result-value", "result-panel", true);
  var statusFilter = multiSelect("status", STATUSES, "status-trigger", "status-value", "status-panel");

  /* ---------- Pagination -------------------------------------------------- */

  /* Changing page swaps the rows out from under the reader, who is almost
     always down at the pager when they do it — without this they land on the
     END of the new page. Back to the top of the Record List, not the document,
     so the table head and the filters stay in view. */
  function scrollToList() {
    var scroller = document.querySelector(".app__content");
    var list = document.querySelector(".records__list");
    if (!scroller || !list) return;
    scroller.scrollTop += list.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }

  function renderPager() {
    var rows = visibleRows();
    var pages = Math.max(1, Math.ceil(rows.length / state.perPage));
    if (state.page > pages) state.page = pages;

    var start = rows.length === 0 ? 0 : (state.page - 1) * state.perPage + 1;
    var end = Math.min(rows.length, state.page * state.perPage);
    $("range").textContent = start + "–" + end + " / " + rows.length;

    /* 500 records is ten pages; show the ends, the current page and its
       neighbours, and elide the rest rather than printing every number. */
    var host = $("pages");
    host.innerHTML = "";
    var shown = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) shown.push(i);
    }
    var last = 0;
    shown.forEach(function (page) {
      if (page - last > 1) {
        var gap = el("span", "pagination__gap");
        gap.appendChild(el("span", "icon icon--ellipsis"));
        host.appendChild(gap);
      }
      last = page;
      var button = el("button", "pagination__page" + (page === state.page ? " pagination__page--current" : ""), String(page));
      button.type = "button";
      if (page === state.page) button.setAttribute("aria-current", "page");
      button.addEventListener("click", function () {
        if (page === state.page) return;
        state.page = page;
        render();
        scrollToList();
      });
      host.appendChild(button);
    });

    $("prev").disabled = state.page === 1;
    $("next").disabled = state.page === pages;
  }

  /* ---------- Confirmation and running states ----------------------------- */

  var pending = null;

  function openAction(action, rows) {
    pending = { action: action, rows: rows };
    var dialog = $("action-dialog");
    var single = rows.length === 1;
    var label = ACTION_LABEL[action];

    $("action-mark").className = "alert-dialog__mark alert-dialog__mark--" +
      (action === "retry" ? "warning" : "destructive");
    $("action-icon").className = "icon icon--" + (action === "retry" ? "reset" : "file-symlink");

    $("action-title").textContent = action === "retry"
      ? (single ? "Retry distribution for " + rows[0].member + "?"
                : "Retry " + rows.length + " failed distributions?")
      : (single ? "Recall bonus for " + rows[0].member + "?"
                : "Recall " + rows.length + " bonuses?");

    $("action-text").textContent = action === "retry"
      ? "Voucher distribution will be retried for the same members. A failed retry won’t stop the remaining records."
      : "Voucher status will be re-checked before recall. Any voucher that is no longer recallable will be skipped.";

    $("action-confirm").textContent = action === "retry" ? "Retry" : "Recall";
    $("action-confirm").hidden = false;
    $("action-cancel").hidden = false;
    $("action-close").hidden = true;

    dialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAction() {
    $("action-dialog").hidden = true;
    document.body.style.overflow = "";
    pending = null;
  }

  /* The running state replaces the buttons in place: the backdrop no longer
     closes, and Close dismisses the dialog without cancelling the action. */
  function runAction() {
    if (!pending) return;
    var action = pending.action;
    var rows = pending.rows;

    $("action-title").textContent = action === "retry" ? "Retrying…" : "Recalling…";
    $("action-confirm").hidden = true;
    $("action-cancel").hidden = true;
    $("action-close").hidden = false;

    /* Locks the bar, the list actions and the filters until this finishes
       (5203:60, UX 5789:47471). */
    running = action;
    /* count up over the same 1200ms the dialog waits, so the bar and the
       dialog finish together */
    progress = { action: action, done: 0, total: rows.length };
    renderAlerts();
    renderRunningLock();
    var steps = 12, step = 0;
    var tick = setInterval(function () {
      step++;
      progress.done = Math.round(rows.length * step / steps);
      renderAlerts();
      if (step >= steps) clearInterval(tick);
    }, 1200 / steps);

    setTimeout(function () { finishAction(action, rows); }, 1200);
  }

  function finishAction(action, rows) {
    var won = [], lost = [];

    rows.forEach(function (row, index) {
      /* A deterministic stand-in for the real outcome: most succeed, and the
         rest keep their failed state so the flow can be seen end to end. */
      var ok = index % 7 !== 3;
      if (action === "retry") {
        if (ok) { row.result = "Success"; row.status = "Unused"; won.push(row); }
        else lost.push(row);
      } else {
        if (ok) { row.result = "Recalled"; row.recallFailed = false; won.push(row); }
        else { row.recallFailed = true; lost.push(row); }
      }
    });

    addLog(action, won, lost);

    running = null;
    progress = null;
    clearSelection();
    closeAction();
    render();
    toast(action, won.length, lost.length);
  }

  function toast(action, succeeded, failed) {
    var label = ACTION_LABEL[action];
    var text;
    var kind = "success";
    if (succeeded && failed) {
      text = label + " - " + succeeded + " succeeded, " + failed + " failed";
      kind = "notice";
    } else if (succeeded) {
      text = label + " - " + succeeded + " succeeded";
    } else {
      /* The UX writes the all-failed recall toast as "Recall Distribution". */
      text = (action === "recall" ? "Recall Distribution" : label) + " - " + failed + " failed";
      kind = "notice";
    }

    var node = el("div", "toast-alert toast-alert--" + kind);
    node.innerHTML =
      '<div class="toast-alert__main">' +
      '<span class="icon toast-alert__icon icon--' +
      (kind === "success" ? "check-circle" : "attention-circle") + '" aria-hidden="true"></span>' +
      '<div class="toast-alert__content"><p class="toast-alert__title"></p></div>' +
      '</div>';
    node.querySelector(".toast-alert__title").textContent = text;
    var close = el("button", "toast-alert__close");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
    close.addEventListener("click", function () { node.remove(); });
    /* The component's dismiss aligner — see .toast-alert__dismiss. */
    var dismiss = document.createElement("div");
    dismiss.className = "toast-alert__dismiss";
    dismiss.appendChild(close);
    node.appendChild(dismiss);
    $("toasts").appendChild(node);
    /* 3s, then gone — the X is for dismissing it sooner (Toast 共用規則). */
    setTimeout(function () { node.remove(); }, 3000);
  }

  /* ---------- Activity log ------------------------------------------------ */
  /* One entry per operation, newest first. A single-record operation names the
     one id and omits the count; a batch names {Count} records. The first three
     ids show, the rest hide behind Show more. (4606:35095) */

  function entry(action, rows, ok) {
    return {
      action: ACTION_LABEL[action],
      actor: "Licensee",
      when: "2026/07/28 10:30 (GMT-4)",
      count: rows.length,
      /* Both actions report the change on Distribution Result (4606:35596).
         A retry that failed changed nothing, so it names the state it is still
         in rather than drawing an arrow; a recall that failed does move the
         record on, to Recall Failed (the status the log component added on
         2026-10-13, 5297:37631). */
      field: "Distribution Result",
      from: ok ? (action === "retry" ? "Failed" : "Success")
               : (action === "retry" ? null : "Success"),
      to: ok ? (action === "retry" ? "Success" : "Recalled")
             : (action === "retry" ? "Failed" : "Recall Failed"),
      tone: ok ? "success" : "destructive",
      /* Retry has no voucher yet when it failed, so those rows are named by
         member (4606:34936). */
      ids: rows.map(function (row) {
        return (!ok && action === "retry") ? row.member : row.voucher;
      })
    };
  }

  /* A part-success operation is two records, not one: the failures above the
     successes (4606:33340). unshift twice puts them in that order. */
  function addLog(action, won, lost) {
    if (won.length) state.log.unshift(entry(action, won, true));
    if (lost.length) state.log.unshift(entry(action, lost, false));
  }

  /* A tag for a status the way the log component draws it: Failed and Recall
     Failed are the rejected tone, Success and Recalled the approved one — note
     Recalled reads green here, unlike the grey chip in the table. */
  var LOG_TONE = {
    "Failed": "destructive", "Recall Failed": "destructive",
    "Success": "success", "Recalled": "success"
  };

  function statusChip(label) {
    return el("span", "tag tag--" + (LOG_TONE[label] || "normal"), label);
  }

  /* dot-line-status' top / bottom / noline variants: the timeline's first row
     carries no segment above its dot and the last none below, so the line stops
     at the ends instead of running off them. Decided on the finished list, since
     a reason or log-structure row can be the one that ends it. */
  function capRail(list) {
    var rows = list.children;
    if (!rows.length) return;
    for (var i = 0; i < rows.length; i++) {
      var rail = rows[i].querySelector(".log__rail");
      if (!rail) continue;
      rail.classList.remove("log__rail--top", "log__rail--bottom", "log__rail--noline");
      if (rows.length === 1) rail.classList.add("log__rail--noline");
      else if (i === 0) rail.classList.add("log__rail--top");
      else if (i === rows.length - 1) rail.classList.add("log__rail--bottom");
    }
  }

  function renderLog() {
    var host = $("log");
    host.innerHTML = "";
    $("log-empty").hidden = state.log.length > 0;

    state.log.forEach(function (item, index) {
      /* Each entry is two rows, the way log-progress-list and
         log-progress-list-area sit above each other (5288:34272). */
      var head = el("li", "log__row");
      var rail = el("span", "log__rail");
      rail.appendChild(el("span", "log__dot log__dot--" + item.tone));
      head.appendChild(rail);

      /* The label carries the same tone as the dot: log-text-status has no
         neutral form on this board — every row is approved or reject
         (5297:37631). */
      var status = el("div", "log__status");
      status.appendChild(el("span", "log__label log__label--" + item.tone, item.action));
      status.appendChild(el("span", "log__actor", item.actor));
      head.appendChild(status);
      head.appendChild(el("span", "log__date", item.when));
      host.appendChild(head);

      var body = el("li", "log__row log__row--structure");
      body.appendChild(el("span", "log__rail log__rail--line"));

      var block = el("div", "log-structure");

      /* A single-record operation names the one id and drops this line. */
      if (item.count > 1) block.appendChild(el("p", "log-structure__count", item.count + " records"));

      var field = el("p", "log-structure__field");
      field.appendChild(el("span", "log-structure__field-name", item.field + ":"));
      if (item.from) {
        field.appendChild(statusChip(item.from));
        field.appendChild(el("span", "icon icon--move-right log-structure__arrow"));
        field.appendChild(statusChip(item.to));
      } else {
        /* Nothing changed, so it names the state it is still in. */
        field.appendChild(statusChip(item.to));
      }
      block.appendChild(field);

      var ids = el("p", "log-structure__ids");
      var idText = document.createTextNode("");
      ids.appendChild(idText);
      var expanded = false;
      var more = null;
      function paintIds() {
        var shown = expanded ? item.ids : item.ids.slice(0, 3);
        idText.textContent = shown.join(", ") + (more ? " " : "");
      }
      if (item.ids.length > 3) {
        more = el("button", "link-button log-structure__more", "Show more");
        more.type = "button";
        more.addEventListener("click", function () {
          expanded = !expanded;
          more.textContent = expanded ? "Show less" : "Show more";
          paintIds();
        });
      }
      paintIds();
      if (more) ids.appendChild(more);
      block.appendChild(ids);

      body.appendChild(block);
      host.appendChild(body);
      void index;
    });

    capRail(host);
  }

  /* ---------- Wiring ------------------------------------------------------ */

  function render() {
    renderSummary();
    renderRows();
    renderSelectAll();
    renderListActions();
    renderSelectedBar();
    renderPager();
    /* The Site column and its filter only exist for Oneworks. */
    var oneworks = isOneworks();
    $("site-filter").hidden = !oneworks;
    $("site-column").hidden = !oneworks;
    $("table").classList.toggle("records-table--oneworks", oneworks);
    if (!oneworks && state.site.size) state.site.clear();

    [siteFilter, currencyFilter, resultFilter, statusFilter].forEach(function (filter) {
      filter.renderValue();
      filter.renderPanel();
    });
    renderRunningLock();
  }

  $("search").addEventListener("input", function (event) {
    state.search = event.target.value;
    state.page = 1;
    render();
  });

  $("reset").addEventListener("click", function () {
    state.search = "";
    $("search").value = "";
    state.site.clear();
    state.currency.clear();
    state.result.clear();
    state.status.clear();
    state.page = 1;
    render();
  });

  $("select-all").addEventListener("change", function (event) {
    var box = event.target;
    var rows = pageRows().filter(function (row) {
      return state.action ? allows(row, state.action) : (canRetry(row) || canRecall(row));
    });
    if (box.checked) {
      rows.forEach(function (row) {
        if (!state.action) state.action = canRetry(row) ? "retry" : "recall";
        if (allows(row, state.action)) state.selected.add(row.id);
      });
    } else {
      rows.forEach(function (row) { state.selected.delete(row.id); });
      if (!state.selected.size) state.action = null;
    }
    render();
  });

  $("per-page").addEventListener("change", function (event) {
    state.perPage = Number(event.target.value);
    state.page = 1;
    render();
    /* Same situation as the pager: the rows change while the reader is down
       beside the control that changed them. */
    scrollToList();
  });

  $("prev").addEventListener("click", function () {
    if (state.page > 1) { state.page--; render(); scrollToList(); }
  });
  $("next").addEventListener("click", function () {
    state.page++; render(); scrollToList();
  });

  /* Each menu button opens its own panel and closes the others. */
  [["export", "export-menu"], ["retry", "retry-menu"], ["recall", "recall-menu"]]
    .forEach(function (pair) {
      $(pair[0] + "-trigger").addEventListener("click", function (event) {
        event.stopPropagation();
        var menu = $(pair[1]);
        var opening = menu.hidden;
        closePanels();
        menu.hidden = !opening;
        this.setAttribute("aria-expanded", String(opening));
      });
    });

  function exportRows(rows, name) {
    var head = ["Vendor Member ID", "Distribution Result", "Voucher ID", "Voucher Status", "Currency", "Denomination"];
    if (isOneworks()) head.unshift("Site Name");
    var lines = [head.join(",")].concat(rows.map(function (row) {
      var values = [row.member, row.result, row.voucher, row.status, row.currency, row.denomination];
      if (isOneworks()) values.unshift(row.site);
      return values.join(",");
    }));
    var url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  /* Export never follows the ticks — only the whole list or the filtered
     view (4606:34722). */
  $("export-all").addEventListener("click", function () {
    closePanels();
    exportRows(ROWS, "distribution-records.csv");
  });

  $("export-filtered").addEventListener("click", function () {
    closePanels();
    exportRows(visibleRows(), "distribution-records-filtered.csv");
  });

  /* "all failed" / "all unused" work on the filtered result; "selected" works
     on the ticks (4895:144466, 4895:144484). */
  $("retry-all").addEventListener("click", function () {
    closePanels();
    openAction("retry", visibleRows().filter(canRetry));
  });

  $("retry-selected").addEventListener("click", function () {
    closePanels();
    openAction("retry", selectedRows());
  });

  $("recall-all").addEventListener("click", function () {
    closePanels();
    openAction("recall", visibleRows().filter(canRecall));
  });

  $("recall-selected").addEventListener("click", function () {
    closePanels();
    openAction("recall", selectedRows());
  });

  /* The alert bars reach the whole list, filters included (4606:33754). */
  $("alert-retry").addEventListener("click", function () {
    openAction("retry", ROWS.filter(canRetry));
  });

  $("alert-recall").addEventListener("click", function () {
    openAction("recall", ROWS.filter(function (row) { return row.recallFailed; }));
  });

  $("clear-selection").addEventListener("click", function () {
    clearSelection();
    render();
  });

  $("action-cancel").addEventListener("click", closeAction);
  $("action-close").addEventListener("click", closeAction);
  $("action-confirm").addEventListener("click", runAction);

  /* Backdrop closes the confirmation, but not once the action is running. */
  $("action-dialog").addEventListener("click", function (event) {
    if (event.target !== this) return;
    if ($("action-close").hidden) closeAction();
  });

  $("open-activity-log").addEventListener("click", function () {
    renderLog();
    $("activity-dialog").hidden = false;
    document.body.style.overflow = "hidden";
  });
  $("activity-close").addEventListener("click", function () {
    $("activity-dialog").hidden = true;
    document.body.style.overflow = "";
  });
  $("activity-dialog").addEventListener("click", function (event) {
    if (event.target === this) {
      this.hidden = true;
      document.body.style.overflow = "";
    }
  });

  /* Switching role in the top bar changes the column set, so redraw. */
  if (window.Role) window.Role.onChange(function () { state.page = 1; render(); });

  document.addEventListener("click", closePanels);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closePanels();
    if (!$("activity-dialog").hidden) {
      $("activity-dialog").hidden = true;
      document.body.style.overflow = "";
    }
  });

  render();
})();
