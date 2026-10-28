/* Usage Report — the transaction list for one promotion (UX 5557:1255).

   Base Currency sits in the card's title row because it is not a filter: it
   decides what every figure on the page is converted into, and switching it
   runs a conversion the page waits for. The filters narrow the rows; the total
   line above the table always covers the whole filtered set, not just the page
   on screen, and leaves unsettled bets out. */
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

  /* ---------- Data -------------------------------------------------------- */
  /* The seven rows the UX draws, with its figures. Amounts are held in the
     member's own currency; the table converts them on the way out. A null is a
     bet that has not settled — it shows a dash and counts for nothing. */
  var ROWS = [
    { site: "Site-001", member: "VM_10029340", currency: "USD", trans: "TX20260728001", voucher: "VH0123456", denomination: "USD 10.00", player: 0, licensee: 0 },
    { site: "Site-001", member: "VM_10029341", currency: "USD", trans: "TX20260728002", voucher: "VH0123457", denomination: "USD 10.00", player: 38.5, licensee: -38.5 },
    { site: "Site-002", member: "VM_10029355", currency: "IDR", trans: "TX20260728003", voucher: "VH0123458", denomination: "IDR 50,000", player: 9.45, licensee: -9.45 },
    { site: "Site-002", member: "VM_10029361", currency: "USD", trans: "TX20260728004", voucher: "VH0123459", denomination: "USD 10.00", player: 0, licensee: 0 },
    { site: "Site-003", member: "VM_10029372", currency: "THB", trans: "TX20260728005", voucher: "VH0123460", denomination: "THB 300.00", player: 0, licensee: 0 },
    { site: "Site-003", member: "VM_10029380", currency: "USD", trans: "TX20260728006", voucher: "VH0123461", denomination: "USD 10.00", player: null, licensee: null },
    { site: "Site-003", member: "VM_10029388", currency: "IDR", trans: "TX20260728007", voucher: "VH0123462", denomination: "IDR 50,000", player: 0, licensee: 0 }
  ];

  /* The UX says the list is the one the platform's other reports use. Until
     that list is confirmed these are the project's five currencies, and the
     rates stand in for the rate service. */
  var BASE_CURRENCIES = ["USD", "IDR", "GBP", "MYR", "THB"];
  var RATE = { USD: 1, IDR: 16000, GBP: 0.78, MYR: 4.7, THB: 36 };
  var DEFAULT_BASE = "USD";
  var CONVERT_MS = 1200;

  var state = {
    search: "",
    original: "",
    site: new Set(),
    base: DEFAULT_BASE,
    page: 1,
    perPage: 50,
    expanded: null,
    converting: null,
    totalOpen: false
  };

  function isOneworks() {
    return Boolean(window.Role && window.Role.isOneworks());
  }

  /* ---------- Money ------------------------------------------------------- */
  function money(value, base) {
    if (value === null) return "—";
    var converted = value * RATE[base];
    /* The high-denomination currencies have no minor unit worth showing. */
    var decimals = RATE[base] >= 1000 ? 0 : 2;
    var text = Math.abs(converted).toFixed(decimals);
    if (decimals === 0) text = Number(text).toLocaleString("en-US");
    return (converted > 0 ? "+" : converted < 0 ? "-" : "") + text;
  }

  function amountClass(value) {
    if (value === null) return "txn__amount--none";
    return value > 0 ? "txn__amount--up" : value < 0 ? "txn__amount--down" : "";
  }

  /* ---------- Selection --------------------------------------------------- */
  /* Only what this distribution actually reached can be filtered on. */
  function originalCurrencies() {
    var seen = [];
    ROWS.forEach(function (row) {
      if (seen.indexOf(row.currency) === -1) seen.push(row.currency);
    });
    return seen;
  }

  function siteOptions() {
    var seen = [];
    ROWS.forEach(function (row) {
      if (seen.indexOf(row.site) === -1) seen.push(row.site);
    });
    return seen;
  }

  /* Vendor Member ID and Original Currency both have to hold (UX 5557:2049).
     An empty site set means every site, which is what "預設全選" amounts to. */
  function visibleRows() {
    var term = state.search.trim().toLowerCase();
    return ROWS.filter(function (row) {
      if (term && row.member.toLowerCase().indexOf(term) === -1) return false;
      if (state.original && row.currency !== state.original) return false;
      if (isOneworks() && state.site.size && !state.site.has(row.site)) return false;
      return true;
    });
  }

  /* Base Currency is not a filter, so it does not light up Reset. */
  function hasFilters() {
    return state.search !== "" || state.original !== "" || state.site.size > 0;
  }

  /* ---------- Table ------------------------------------------------------- */
  function pageRows() {
    var rows = visibleRows();
    var start = (state.page - 1) * state.perPage;
    return rows.slice(start, start + state.perPage);
  }

  function amountCell(value) {
    var cell = el("div", "table__cell");
    cell.setAttribute("role", "cell");
    cell.appendChild(el("span", "txn__amount " + amountClass(value), money(value, state.base)));
    return cell;
  }

  function textCell(text) {
    var cell = el("div", "table__cell", text);
    cell.setAttribute("role", "cell");
    return cell;
  }

  function renderRows() {
    var host = $("rows");
    host.innerHTML = "";
    var rows = pageRows();
    var oneworks = isOneworks();

    rows.forEach(function (row) {
      var line = el("div", "table__row");
      line.setAttribute("role", "row");

      if (oneworks) line.appendChild(textCell(row.site));
      line.appendChild(textCell(row.member));
      line.appendChild(textCell(row.currency));

      /* Clicking the id opens the voucher behind the transaction. */
      var transCell = el("div", "table__cell");
      transCell.setAttribute("role", "cell");
      var open = state.expanded === row.trans;
      var toggle = el("button", "txn__toggle");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", String(open));
      var chevron = el("span", "icon icon--chevron-right");
      chevron.setAttribute("aria-hidden", "true");
      toggle.appendChild(chevron);
      toggle.appendChild(el("span", undefined, row.trans));
      toggle.addEventListener("click", function () {
        state.expanded = open ? null : row.trans;
        renderRows();
      });
      transCell.appendChild(toggle);
      line.appendChild(transCell);

      line.appendChild(amountCell(row.player));
      line.appendChild(amountCell(row.licensee));
      host.appendChild(line);

      if (open) {
        var detail = el("div", "txn__detail");
        /* one block so it can be placed in the Trans ID track as a whole */
        var detailText = el("div", "txn__detail-text");
        detailText.appendChild(el("span", undefined, "Voucher ID: " + row.voucher));
        detailText.appendChild(el("span", undefined, "\u00b7"));
        detailText.appendChild(el("span", undefined, "Denomination: " + row.denomination));
        detail.appendChild(detailText);
        host.appendChild(detail);
      }
    });

    $("empty").hidden = rows.length > 0;
    $("site-column").hidden = !oneworks;
    $("table").classList.toggle("txn-table--oneworks", oneworks);
  }

  /* ---------- Total ------------------------------------------------------- */
  function sum(rows, key) {
    return rows.reduce(function (carry, row) {
      return row[key] === null ? carry : carry + row[key];
    }, 0);
  }

  function renderTotal() {
    var rows = visibleRows();
    $("total-label").textContent = "Total in " + state.base;

    var player = sum(rows, "player"), licensee = sum(rows, "licensee");
    var playerNode = $("total-player"), licenseeNode = $("total-licensee");
    playerNode.textContent = money(player, state.base);
    playerNode.className = "txn__amount " + amountClass(player);
    licenseeNode.textContent = money(licensee, state.base);
    licenseeNode.className = "txn__amount " + amountClass(licensee);

    /* "Excludes N unsettled transaction(s)" — and nothing at all when they are
       all settled (UX 5557:1646). */
    var unsettled = rows.filter(function (row) { return row.player === null; }).length;
    var note = $("unsettled");
    note.hidden = unsettled === 0;
    note.textContent = "Excludes " + unsettled + " unsettled transaction" + (unsettled === 1 ? "" : "s");

    /* One original currency leaves nothing to break down. */
    var currencies = [];
    rows.forEach(function (row) {
      if (currencies.indexOf(row.currency) === -1) currencies.push(row.currency);
    });
    var toggle = $("total-toggle");
    toggle.disabled = currencies.length < 2;
    if (toggle.disabled) state.totalOpen = false;
    toggle.setAttribute("aria-expanded", String(state.totalOpen));

    var popover = $("total-popover");
    popover.hidden = !state.totalOpen;
    var host = $("total-rows");
    host.innerHTML = "";
    currencies.forEach(function (code) {
      var slice = rows.filter(function (row) { return row.currency === code; });
      var line = el("div", "txn-total__row");
      line.appendChild(el("span", undefined, code));
      var p = sum(slice, "player"), l = sum(slice, "licensee");
      line.appendChild(el("span", "txn__amount " + amountClass(p), money(p, state.base)));
      line.appendChild(el("span", "txn__amount " + amountClass(l), money(l, state.base)));
      host.appendChild(line);
    });
  }

  /* ---------- Filters ----------------------------------------------------- */
  /* Original Currency and Base Currency are single-value: the UX draws plain
     option rows with no checkboxes. Site Name is multi-select with tags. */
  function dropdown(key, options, roleTrigger, roleValue, rolePanel, placeholder, onPick) {
    var trigger = $(roleTrigger), value = $(roleValue), panel = $(rolePanel);

    function renderValue() {
      value.innerHTML = "";
      if (!state[key] && placeholder) value.appendChild(el("span", "select__placeholder", placeholder));
      else value.appendChild(document.createTextNode(state[key]));
    }

    function renderPanel() {
      panel.innerHTML = "";
      options().forEach(function (option) {
        var item = el("button", "filter-select__option");
        item.type = "button";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(state[key] === option));
        var mark = el("span", "icon icon--check filter-select__check");
        mark.setAttribute("aria-hidden", "true");
        item.appendChild(mark);
        item.appendChild(document.createTextNode(option));
        item.addEventListener("click", function () {
          /* Picking the one already chosen clears it — a single-value filter
             has no Clear control of its own. */
          var next = (placeholder && state[key] === option) ? "" : option;
          closePanels();
          if (onPick) onPick(next);
          else { state[key] = next; state.page = 1; render(); }
        });
        panel.appendChild(item);
      });
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

    return { renderValue: renderValue };
  }

  /* Site Name: multi-select, two full tags then +{x} (UX 5621:80499). */
  function siteFilter() {
    var trigger = $("site-trigger"), value = $("site-value"), panel = $("site-panel");

    function renderValue() {
      value.innerHTML = "";
      var chosen = siteOptions().filter(function (name) { return state.site.has(name); });
      if (!chosen.length) {
        value.appendChild(el("span", "select__placeholder", "Select"));
        return;
      }
      chosen.slice(0, 2).forEach(function (name) {
        var tag = el("span", "tag tag--normal select__tag");
        tag.appendChild(document.createTextNode(name));
        var remove = el("span", "select__tag-remove");
        remove.setAttribute("role", "button");
        remove.setAttribute("aria-label", "Remove " + name);
        remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
        remove.addEventListener("click", function (event) {
          event.stopPropagation();
          state.site.delete(name);
          state.page = 1;
          render();
        });
        tag.appendChild(remove);
        value.appendChild(tag);
      });
      if (chosen.length > 2) value.appendChild(el("span", "select__overflow", "+" + (chosen.length - 2)));
    }

    function renderPanel() {
      panel.innerHTML = "";
      siteOptions().forEach(function (name) {
        var option = el("label", "filter-select__option");
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = state.site.has(name);
        box.addEventListener("change", function () {
          if (box.checked) state.site.add(name); else state.site.delete(name);
          state.page = 1;
          render();
        });
        option.appendChild(box);
        option.appendChild(document.createTextNode(name));
        panel.appendChild(option);
      });

      var footer = el("div", "filter-select__footer");
      var count = el("span", "filter-select__count");
      count.appendChild(el("b", null, String(state.site.size)));
      count.appendChild(el("span", null, "selected"));
      footer.appendChild(count);
      var clear = el("button", "button button--ghost button--small", "Clear");
      clear.type = "button";
      clear.disabled = state.site.size === 0;
      clear.addEventListener("click", function () {
        state.site.clear();
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

    return { renderValue: renderValue };
  }

  function closePanels() {
    document.querySelectorAll(".filter-select__panel, .batch-action__menu").forEach(function (node) {
      node.hidden = true;
    });
    /* Only the controls that own those panels — the row toggles and the total
       use aria-expanded too, and they sit under the document click handler. */
    document.querySelectorAll('.filter-select .select[aria-expanded="true"], .batch-action .button[aria-expanded="true"]')
      .forEach(function (node) { node.setAttribute("aria-expanded", "false"); });
  }

  /* ---------- Converting --------------------------------------------------- */
  /* Switching Base Currency converts every figure. The page waits with the old
     numbers faded under an overlay; picking again mid-convert restarts it and
     the last choice wins (UX 5567:2970). */
  var convertTimer = null;

  function startConvert(base) {
    if (base === state.base && !state.converting) return;
    state.converting = base;
    if (convertTimer) clearTimeout(convertTimer);
    render();
    convertTimer = setTimeout(function () {
      state.base = state.converting;
      state.converting = null;
      convertTimer = null;
      render();
    }, CONVERT_MS);
  }

  function renderConverting() {
    var card = document.querySelector(".records__list");
    var overlay = $("converting");
    var busy = state.converting !== null;

    card.classList.toggle("records__list--converting", busy);
    overlay.hidden = !busy;
    if (busy) {
      $("converting-text").textContent = "Converting to " + state.converting + "…";
      /* The overlay covers the total and the table, nothing else. */
      var total = $("total"), table = $("table");
      var cardBox = card.getBoundingClientRect();
      var top = total.getBoundingClientRect().top - cardBox.top;
      var bottom = table.getBoundingClientRect().bottom - cardBox.top;
      overlay.style.top = Math.round(top) + "px";
      overlay.style.height = Math.round(bottom - top) + "px";
    }

    /* Everything except Base Currency goes inert while it runs. */
    $("search").disabled = busy;
    $("original-trigger").disabled = busy;
    $("site-trigger").disabled = busy;
    $("reset").disabled = busy || !hasFilters();
    $("export-trigger").disabled = busy || visibleRows().length === 0;
    $("per-page").disabled = busy;
    $("prev").disabled = busy || state.page === 1;
    $("next").disabled = busy || state.page >= pageCount();
    $("total-toggle").disabled = busy || $("total-toggle").disabled;
  }

  /* ---------- Pager -------------------------------------------------------- */
  function pageCount() {
    return Math.max(1, Math.ceil(visibleRows().length / state.perPage));
  }

  function renderPager() {
    var rows = visibleRows();
    var pages = pageCount();
    if (state.page > pages) state.page = pages;

    var start = rows.length === 0 ? 0 : (state.page - 1) * state.perPage + 1;
    var end = Math.min(rows.length, state.page * state.perPage);
    $("range").textContent = start + "–" + end + " / " + rows.length;

    var host = $("pages");
    host.innerHTML = "";
    for (var i = 1; i <= pages; i++) {
      (function (page) {
        var button = el("button", "pagination__page" + (page === state.page ? " pagination__page--current" : ""), String(page));
        button.type = "button";
        if (page === state.page) button.setAttribute("aria-current", "page");
        button.disabled = state.converting !== null;
        button.addEventListener("click", function () {
          if (page === state.page) return;
          state.page = page;
          render();
        });
        host.appendChild(button);
      })(i);
    }
  }

  /* ---------- Export ------------------------------------------------------- */
  function renderExport() {
    var shown = visibleRows();
    var all = $("export-all"), filtered = $("export-filtered");
    all.textContent = "All records (" + ROWS.length + ")";
    all.disabled = false;
    var narrowed = hasFilters();
    filtered.textContent = narrowed && shown.length ? "Filtered results (" + shown.length + ")" : "Filtered results";
    filtered.disabled = !narrowed || shown.length === 0;
  }

  /* The export carries the figures in the Base Currency on screen. */
  function exportRows(rows, name) {
    var head = ["Vendor Member ID", "Original Currency", "Trans ID", "Voucher ID", "Denomination",
      "Player Win Loss (" + state.base + ")", "Licensee Win Loss (" + state.base + ")"];
    if (isOneworks()) head.unshift("Site Name");
    var lines = [head.join(",")].concat(rows.map(function (row) {
      var values = [row.member, row.currency, row.trans, row.voucher, row.denomination,
        money(row.player, state.base), money(row.licensee, state.base)];
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

  /* ---------- Wiring -------------------------------------------------------- */
  var originalFilter = dropdown("original", originalCurrencies, "original-trigger", "original-value", "original-panel", "Select");
  var baseFilter = dropdown("base", function () { return BASE_CURRENCIES; }, "base-trigger", "base-value", "base-panel", "", startConvert);
  var sites = siteFilter();

  function render() {
    var oneworks = isOneworks();
    $("site-filter").hidden = !oneworks;
    if (!oneworks && state.site.size) state.site.clear();

    renderRows();
    renderTotal();
    renderPager();
    renderExport();
    originalFilter.renderValue();
    baseFilter.renderValue();
    sites.renderValue();
    renderConverting();
  }

  $("search").addEventListener("input", function (event) {
    state.search = event.target.value;
    state.page = 1;
    render();
  });

  $("total-toggle").addEventListener("click", function (event) {
    event.stopPropagation();
    state.totalOpen = !state.totalOpen;
    renderTotal();
  });

  /* Reset clears the filters — Site Name included — but leaves Base Currency,
     which is not one of them (UX 5557:2080, 5613:1204). */
  $("reset").addEventListener("click", function () {
    state.search = "";
    $("search").value = "";
    state.original = "";
    state.site.clear();
    state.page = 1;
    render();
  });

  $("export-trigger").addEventListener("click", function (event) {
    event.stopPropagation();
    var menu = $("export-menu");
    var opening = menu.hidden;
    closePanels();
    menu.hidden = !opening;
    this.setAttribute("aria-expanded", String(opening));
  });

  $("export-all").addEventListener("click", function () {
    closePanels();
    exportRows(ROWS, "usage-report.csv");
  });

  $("export-filtered").addEventListener("click", function () {
    closePanels();
    exportRows(visibleRows(), "usage-report-filtered.csv");
  });

  $("per-page").addEventListener("change", function (event) {
    state.perPage = Number(event.target.value);
    state.page = 1;
    render();
  });

  $("prev").addEventListener("click", function () {
    if (state.page > 1) { state.page--; render(); }
  });
  $("next").addEventListener("click", function () {
    if (state.page < pageCount()) { state.page++; render(); }
  });

  if (window.Role) window.Role.onChange(function () { state.page = 1; render(); });

  document.addEventListener("click", function () {
    closePanels();
    if (state.totalOpen) { state.totalOpen = false; renderTotal(); }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closePanels();
    if (state.totalOpen) { state.totalOpen = false; renderTotal(); }
  });

  render();
})();
