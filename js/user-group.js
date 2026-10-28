(function (global) {
  "use strict";

  /* User Group per site (Lossback, 2026-10-27).

     Every Main Site and Subsidiary that joins the campaign has its own user
     group, built any of three ways: Manually Enter, CSV Upload, Saba BI Tag.
     Draws one block per joining site into `host`; the dialogs (manual, csv, bi,
     delete) and the toast stack live once in the page and serve whichever
     site's block opened them.

     A Vendor Member ID carries its site (M1001-S01-007 belongs to LS1001-S01),
     so a member can only enter the group of its own site, and the same member
     cannot show up in two groups.

     Values marked ASSUMPTION are prototype defaults the spec has not fixed. */

  var D = global.CampaignData;

  var LIMITS = {
    manualMax: 500,        // ASSUMPTION: IDs per manual entry
    csvMaxRows: 10000      // ASSUMPTION: rows per CSV file
  };

  var $ = function (role) { return document.querySelector('[data-role="' + role + '"]'); };

  var host = null;
  var getSites = function () { return []; };
  var onChange = function () {};
  var groups = {};            // siteId -> [{ memberId, siteId, currency, source }]
  var search = {};            // siteId -> text
  var selected = {};          // siteId -> Set of memberIds
  var ctx = null;             // site the open dialog works for
  var invalid = {};           // siteId -> true while its "add a player" error shows

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

  function fmt(n) { return Number(n).toLocaleString("en-US"); }

  function members(siteId) {
    if (!groups[siteId]) groups[siteId] = [];
    return groups[siteId];
  }

  function chosen(siteId) {
    if (!selected[siteId]) selected[siteId] = new Set();
    return selected[siteId];
  }

  function has(siteId, memberId) {
    return members(siteId).some(function (m) { return m.memberId === memberId; });
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

  function toast(text, kind) {
    var stack = $("toasts");
    if (!stack) return;
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
    stack.appendChild(node);
    setTimeout(function () { node.remove(); }, 3000);
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

  /* The page's own Escape handler (languages / leave) must not also fire. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !openDialogs.length) return;
    event.stopImmediatePropagation();
    closeDialog(openDialogs[openDialogs.length - 1]);
  }, true);

  function siteName(siteId) { return D.site(siteId).label; }

  /* ---------- Checks ----------------------------------------------------------- */
  /* One ID against the directory and the site whose group it is going into. */
  function check(siteId, id, seen) {
    var found = D.member(id);
    if (!found) return { ok: false, reason: "Vendor Member ID does not exist." };
    if (found.siteId !== siteId) {
      return { ok: false, reason: "Belongs to " + siteName(found.siteId) + " (" + found.siteId + "), not this site." };
    }
    if (has(siteId, found.memberId)) return { ok: false, skip: true, reason: "Already in this site's user group." };
    if (seen && seen[found.memberId]) return { ok: false, skip: true, reason: "Duplicate of row " + seen[found.memberId] + "." };
    return { ok: true, member: found };
  }

  function add(siteId, list, source) {
    var count = 0;
    list.forEach(function (m) {
      if (has(siteId, m.memberId)) return;
      members(siteId).push({ memberId: m.memberId, siteId: siteId, currency: m.currency, source: source });
      count++;
    });
    if (count) delete invalid[siteId];
    render();
    onChange();
    return count;
  }

  /* ---------- One site's block ------------------------------------------------- */
  function visible(siteId) {
    var q = (search[siteId] || "").trim().toLowerCase();
    var list = members(siteId);
    if (!q) return list;
    return list.filter(function (m) { return m.memberId.toLowerCase().indexOf(q) !== -1; });
  }

  function methodButton(siteId, method, iconName, title, hint) {
    var button = el("button", "cs-method");
    button.type = "button";
    button.dataset.method = method;
    button.appendChild(icon(iconName));
    var body = el("span", "cs-method__body");
    body.appendChild(el("span", "cs-method__title", title));
    body.appendChild(el("span", "cs-method__hint", hint));
    button.appendChild(body);
    button.addEventListener("click", function () {
      ctx = siteId;
      if (method === "manual") openManual();
      else if (method === "csv") document.getElementById("csv-file").click();
      else openBi();
    });
    return button;
  }

  function siteBlock(option) {
    var siteId = option.id;
    var list = members(siteId);
    var sel = chosen(siteId);
    var block = el("div", "ug-site");
    block.dataset.site = siteId;
    if (invalid[siteId]) block.classList.add("ug-site--invalid");

    var head = el("div", "ug-site__head");
    var title = el("div", "ug-site__title");
    title.appendChild(el("span", "ug-site__name", option.name));
    title.appendChild(el("span", "tag tag--normal", option.kind));
    head.appendChild(title);
    var meta = el("span", "ug-site__meta");
    meta.appendChild(el("span", "participant__id", "Site ID: " + siteId));
    meta.appendChild(el("span", "tag tag--normal", D.currencyOf(siteId)));
    head.appendChild(meta);
    block.appendChild(head);

    var methods = el("div", "cs-methods");
    methods.setAttribute("role", "group");
    methods.setAttribute("aria-label", "Add players for " + option.name);
    methods.appendChild(methodButton(siteId, "manual", "user-plus", "Manually Enter", "Type or paste Vendor Member IDs"));
    methods.appendChild(methodButton(siteId, "csv", "upload", "CSV Upload", "Up to " + fmt(LIMITS.csvMaxRows) + " rows per file"));
    methods.appendChild(methodButton(siteId, "bi", "target", "Saba BI Tag", "Import members of a BI audience tag"));
    block.appendChild(methods);

    if (!list.length) {
      var empty = el("div", "cs-empty cs-empty--compact");
      empty.appendChild(el("p", "cs-empty__title", "No players added for this site yet."));
      block.appendChild(empty);
      if (invalid[siteId]) block.appendChild(el("p", "field__error", "Add at least one player for " + option.name + "."));
      return block;
    }

    /* Toolbar */
    var toolbar = el("div", "cs-list__toolbar");
    var input = el("div", "input");
    input.appendChild(icon("search"));
    var field = document.createElement("input");
    field.type = "text";
    field.placeholder = "Search Vendor Member ID";
    field.value = search[siteId] || "";
    field.setAttribute("aria-label", "Search Vendor Member ID in " + option.name);
    field.addEventListener("input", function (event) {
      event.stopPropagation();
      search[siteId] = field.value;
      var caret = field.selectionStart;
      render();
      var again = host.querySelector('[data-site="' + siteId + '"] .input input');
      if (again) { again.focus(); again.setSelectionRange(caret, caret); }
    });
    input.appendChild(field);
    toolbar.appendChild(input);

    var actions = el("div", "cs-list__actions");
    var del = el("button", "button button--outline button--small");
    del.type = "button";
    del.disabled = sel.size === 0;
    del.appendChild(icon("trash"));
    del.appendChild(document.createTextNode("Delete"));
    del.addEventListener("click", function () { ctx = siteId; askDelete(); });
    actions.appendChild(del);
    var exp = el("button", "button button--outline button--small");
    exp.type = "button";
    exp.appendChild(icon("download"));
    exp.appendChild(document.createTextNode("Export"));
    exp.addEventListener("click", function () {
      var lines = list.map(function (m) {
        return [m.memberId, m.siteId, m.currency, '"' + m.source.replace(/"/g, '""') + '"'].join(",");
      });
      download("user_group_" + siteId + ".csv", "Vendor Member ID,Site ID,Currency,Source\n" + lines.join("\n"));
    });
    actions.appendChild(exp);
    toolbar.appendChild(actions);
    block.appendChild(toolbar);

    /* Table */
    var shown = visible(siteId);
    var table = el("div", "cs-table cs-table--ugroup");
    var thead = el("div", "cs-table__head");
    var headBox = el("span");
    var all = document.createElement("input");
    all.type = "checkbox";
    all.className = "checkbox";
    all.setAttribute("aria-label", "Select all in " + option.name);
    all.checked = shown.length > 0 && shown.every(function (m) { return sel.has(m.memberId); });
    all.indeterminate = !all.checked && shown.some(function (m) { return sel.has(m.memberId); });
    all.addEventListener("change", function () {
      shown.forEach(function (m) { if (all.checked) sel.add(m.memberId); else sel.delete(m.memberId); });
      render();
    });
    headBox.appendChild(all);
    thead.appendChild(headBox);
    thead.appendChild(el("span", null, "Vendor Member ID"));
    thead.appendChild(el("span", null, "Currency"));
    var srcHead = el("span", null, "Source");
    srcHead.dataset.col = "source";
    thead.appendChild(srcHead);
    thead.appendChild(el("span"));
    table.appendChild(thead);

    var body = el("div", "cs-table__body");
    shown.slice(0, 200).forEach(function (m) {
      var row = el("div", "cs-table__row");
      var cell = el("span");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = "checkbox";
      box.checked = sel.has(m.memberId);
      box.setAttribute("aria-label", "Select " + m.memberId);
      box.addEventListener("change", function () {
        if (box.checked) sel.add(m.memberId); else sel.delete(m.memberId);
        render();
      });
      cell.appendChild(box);
      row.appendChild(cell);

      var idCell = el("span", "cs-num cs-cell-ellipsis");
      if ((search[siteId] || "").trim() && global.SearchHighlight) idCell.appendChild(global.SearchHighlight(m.memberId, search[siteId]));
      else idCell.textContent = m.memberId;
      row.appendChild(idCell);
      row.appendChild(el("span", null, m.currency));
      var source = el("span", "cs-cell-ellipsis", m.source);
      source.dataset.col = "source";
      source.title = m.source;
      row.appendChild(source);

      var remove = el("button", "field__remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + m.memberId);
      remove.appendChild(icon("x"));
      remove.addEventListener("click", function () {
        ctx = siteId;
        selected[siteId] = new Set([m.memberId]);
        askDelete();
      });
      row.appendChild(remove);
      body.appendChild(row);
    });
    if (shown.length > 200) {
      body.appendChild(el("p", "cs-table__empty", "Showing the first 200 of " + fmt(shown.length) + ". Search to find others."));
    }
    if (!shown.length) body.appendChild(el("p", "cs-table__empty", "No results found."));
    table.appendChild(body);
    block.appendChild(table);

    var bySource = {};
    list.forEach(function (m) {
      var key = m.source.split(":")[0];
      bySource[key] = (bySource[key] || 0) + 1;
    });
    var footer = el("div", "cs-list__footer");
    footer.appendChild(el("span", null, "Total: " + fmt(list.length) + " players"));
    footer.appendChild(el("span", "cs-list__breakdown",
      Object.keys(bySource).map(function (k) { return k + " " + fmt(bySource[k]); }).join(" · ")));
    block.appendChild(footer);
    return block;
  }

  /* `options` = [{ id, name, kind }] in display order, chosen by the page. */
  var currentOptions = [];

  function render() {
    if (!host) return;
    host.innerHTML = "";
    var ids = getSites();
    if (!ids.length) {
      host.appendChild(el("p", "cs-table__empty", "Select who joins the campaign first. Each site gets its own user group here."));
      return;
    }
    ids.forEach(function (id) {
      var option = currentOptions.filter(function (o) { return o.id === id; })[0] ||
        { id: id, name: D.site(id).label, kind: D.site(id).parent ? "Subsidiary" : "Main Site" };
      host.appendChild(siteBlock(option));
    });
  }

  /* ----- Delete ----------------------------------------------------------------- */
  function askDelete() {
    var count = chosen(ctx).size;
    $("delete-text").textContent = "Remove " + fmt(count) + " player" + (count > 1 ? "s" : "") +
      " from " + siteName(ctx) + "'s user group?";
    openDialog($("delete-dialog"));
  }

  $("cancel-delete").addEventListener("click", function () { closeDialog($("delete-dialog")); });
  $("confirm-delete").addEventListener("click", function () {
    var sel = chosen(ctx);
    var count = sel.size;
    groups[ctx] = members(ctx).filter(function (m) { return !sel.has(m.memberId); });
    sel.clear();
    closeDialog($("delete-dialog"));
    render();
    onChange();
    toast(fmt(count) + " player" + (count > 1 ? "s" : "") + " removed.");
  });

  /* ----- Manually Enter ---------------------------------------------------------- */
  var manualInput = document.getElementById("manual-ids");

  function manualTokens() {
    return manualInput.value.split(/[\s,;]+/).map(function (t) { return t.trim(); }).filter(Boolean);
  }

  function syncManual() {
    var count = manualTokens().length;
    $("manual-count").textContent = fmt(count) + " ID" + (count === 1 ? "" : "s") +
      (count > LIMITS.manualMax ? " — up to " + LIMITS.manualMax + " at a time" : "");
    $("save-manual").disabled = count === 0 || count > LIMITS.manualMax;
  }

  manualInput.addEventListener("input", function (event) { event.stopPropagation(); syncManual(); });

  function openManual() {
    manualInput.value = "";
    $("manual-issues").hidden = true;
    $("manual-site").textContent = siteName(ctx) + " (" + ctx + ")";
    syncManual();
    openDialog($("manual-dialog"));
    manualInput.focus();
  }

  $("save-manual").addEventListener("click", function () {
    var seen = {};
    var good = [];
    var bad = [];
    manualTokens().forEach(function (id, index) {
      var result = check(ctx, id, seen);
      if (result.ok) {
        seen[result.member.memberId] = index + 1;
        good.push(result.member);
      } else if (!result.skip) {
        bad.push({ id: id, reason: result.reason });
      }
    });
    var added = add(ctx, good, "Manual");
    if (added) toast(fmt(added) + " player" + (added > 1 ? "s" : "") + " added.");

    if (!bad.length) {
      closeDialog($("manual-dialog"));
      return;
    }
    var issues = $("manual-issues");
    issues.innerHTML = "";
    issues.appendChild(el("p", null, bad.length + " ID" + (bad.length > 1 ? "s were" : " was") + " not added:"));
    bad.forEach(function (b) { issues.appendChild(el("p", null, b.id + " — " + b.reason)); });
    issues.hidden = false;
    manualInput.value = bad.map(function (b) { return b.id; }).join("\n");
    syncManual();
  });

  $("close-manual").addEventListener("click", function () { closeDialog($("manual-dialog")); });
  $("cancel-manual").addEventListener("click", function () { closeDialog($("manual-dialog")); });

  /* ----- CSV Upload ---------------------------------------------------------------- */
  /* The site is the block the upload started from, so the file only needs the
     member ID. */
  function fileError(text) {
    var node = $("file-error");
    node.textContent = text;
    node.hidden = !text;
    if (text) node.scrollIntoView({ block: "nearest" });
  }

  var csvRows = [];
  var csvName = "";

  document.getElementById("csv-file").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    fileError("");
    if (!/\.csv$/i.test(file.name)) {
      fileError("Invalid file format. Please upload a CSV file.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () { parseCsv(String(reader.result), file.name); };
    reader.readAsText(file);
  });

  function parseCsv(text, name) {
    var lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) {
      fileError("The CSV file contains no valid data. Please check and upload it again.");
      return;
    }
    var header = lines[0].split(",").map(function (h) { return h.trim().toLowerCase(); });
    var idCol = header.indexOf("vendor member id");
    if (idCol === -1) {
      fileError("Missing required column: Vendor Member ID");
      return;
    }
    if (lines.length - 1 > LIMITS.csvMaxRows) {
      fileError("The CSV exceeds the " + fmt(LIMITS.csvMaxRows) + "-row limit. Please reduce the number of rows.");
      return;
    }
    var seen = {};
    csvName = name;
    csvRows = lines.slice(1).map(function (line, index) {
      var id = (line.split(",")[idCol] || "").trim();
      var rowNo = index + 2;
      if (!id) return { row: rowNo, id: id, status: "error", reason: "Vendor Member ID is required." };
      var result = check(ctx, id, seen);
      if (result.ok) {
        seen[result.member.memberId] = rowNo;
        return { row: rowNo, id: id, status: "ok", reason: "Will be added", member: result.member };
      }
      return { row: rowNo, id: id, status: result.skip ? "skip" : "error", reason: result.reason };
    });
    renderCsv();
    openDialog($("csv-dialog"));
  }

  function renderCsv() {
    var counts = { ok: 0, skip: 0, error: 0 };
    csvRows.forEach(function (r) { counts[r.status]++; });

    var summary = $("csv-summary");
    summary.innerHTML = "";
    [
      ["Site", siteName(ctx) + " (" + ctx + ")", "tag--normal"],
      ["File", csvName, "tag--normal"],
      ["Rows", fmt(csvRows.length), "tag--normal"],
      ["To add", fmt(counts.ok), "tag--success"],
      ["Skipped", fmt(counts.skip), "tag--normal"],
      ["Errors", fmt(counts.error), counts.error ? "tag--destructive" : "tag--normal"]
    ].forEach(function (pair) {
      summary.appendChild(el("span", "tag " + pair[2], pair[0] + ": " + pair[1]));
    });

    var order = { error: 0, skip: 1, ok: 2 };
    var rows = $("csv-rows");
    rows.innerHTML = "";
    csvRows.slice().sort(function (a, b) {
      return order[a.status] - order[b.status] || a.row - b.row;
    }).slice(0, 500).forEach(function (r) {
      var row = el("div", "cs-table__row" + (r.status === "error" ? " cs-table__row--invalid" : ""));
      row.appendChild(el("span", "cs-num", String(r.row)));
      row.appendChild(el("span", "cs-num cs-cell-ellipsis", r.id || "—"));
      row.appendChild(el("span", "cs-result--" + r.status, r.reason));
      rows.appendChild(row);
    });

    var confirm = $("confirm-csv");
    confirm.disabled = counts.ok === 0;
    confirm.textContent = counts.ok ? "Import " + fmt(counts.ok) + " player" + (counts.ok > 1 ? "s" : "") : "Import";
  }

  /* Rows with errors are left out rather than blocking the whole file
     (ASSUMPTION); they can be fixed in the file and uploaded again. */
  $("confirm-csv").addEventListener("click", function () {
    var good = csvRows.filter(function (r) { return r.status === "ok"; }).map(function (r) { return r.member; });
    var added = add(ctx, good, "CSV: " + csvName);
    closeDialog($("csv-dialog"));
    toast("CSV imported. " + fmt(added) + " player" + (added === 1 ? "" : "s") + " added.");
  });

  $("close-csv").addEventListener("click", function () { closeDialog($("csv-dialog")); });
  $("cancel-csv").addEventListener("click", function () { closeDialog($("csv-dialog")); });

  $("download-template").addEventListener("click", function () {
    download("user_group_template.csv", "Vendor Member ID\n");
  });

  /* ----- Saba BI Tag ---------------------------------------------------------------- */
  var biPicked = new Set();
  var biSearch = "";

  function biNew() {
    var map = {};
    biPicked.forEach(function (tagId) {
      D.tagMembers(tagId, [ctx]).forEach(function (m) {
        if (!has(ctx, m.memberId)) map[m.memberId] = m;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function renderBi() {
    var rows = $("bi-rows");
    rows.innerHTML = "";
    var q = biSearch.trim().toLowerCase();
    D.biTags().filter(function (t) {
      return !q || t.name.toLowerCase().indexOf(q) !== -1 || t.id.toLowerCase().indexOf(q) !== -1;
    }).forEach(function (t) {
      var inSite = D.tagMembers(t.id, [ctx]).length;
      var row = el("label", "cs-table__row" + (inSite ? "" : " cs-table__row--disabled"));
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = "checkbox";
      box.checked = biPicked.has(t.id);
      box.disabled = inSite === 0;
      box.addEventListener("change", function () {
        if (box.checked) biPicked.add(t.id); else biPicked.delete(t.id);
        syncBi();
      });
      var cell = el("span");
      cell.appendChild(box);
      row.appendChild(cell);
      var name = el("span", null, t.name);
      name.appendChild(el("span", "cs-cell-sub cs-num", t.id + " · " + fmt(t.total) + " members across all sites"));
      row.appendChild(name);
      row.appendChild(el("span", "cs-num", t.updated));
      row.appendChild(el("span", "cs-num", fmt(inSite)));
      rows.appendChild(row);
    });
    syncBi();
  }

  function syncBi() {
    var count = biNew().length;
    $("bi-count").textContent = fmt(count);
    $("confirm-bi").disabled = count === 0;
  }

  $("bi-search").addEventListener("input", function (event) {
    event.stopPropagation();
    biSearch = event.target.value;
    renderBi();
  });

  function openBi() {
    biPicked.clear();
    biSearch = "";
    $("bi-search").value = "";
    $("bi-site").textContent = "Members of " + siteName(ctx) + " (" + ctx + ") only. Members are imported as they are tagged now; later changes to the tag do not update this campaign.";
    renderBi();
    openDialog($("bi-dialog"));
  }

  $("confirm-bi").addEventListener("click", function () {
    var total = 0;
    var tags = D.biTags();
    biPicked.forEach(function (tagId) {
      var tag = tags.filter(function (t) { return t.id === tagId; })[0];
      total += add(ctx, D.tagMembers(tagId, [ctx]), "BI: " + tag.name + " (" + tag.id + ")");
    });
    closeDialog($("bi-dialog"));
    toast(fmt(total) + " player" + (total === 1 ? "" : "s") + " imported from Saba BI.");
  });

  $("close-bi").addEventListener("click", function () { closeDialog($("bi-dialog")); });
  $("cancel-bi").addEventListener("click", function () { closeDialog($("bi-dialog")); });

  /* ---------- Public API --------------------------------------------------------------- */
  function validate() {
    var ok = true;
    getSites().forEach(function (id) {
      if (!members(id).length) { invalid[id] = true; ok = false; }
      else delete invalid[id];
    });
    render();
    return ok;
  }

  /* Sites that left the campaign take their group with them. */
  function prune() {
    var ids = getSites();
    Object.keys(groups).forEach(function (id) { if (ids.indexOf(id) === -1) delete groups[id]; });
    Object.keys(invalid).forEach(function (id) { if (ids.indexOf(id) === -1) delete invalid[id]; });
  }

  global.UserGroup = {
    init: function (config) {
      host = config.host;
      getSites = config.sites;
      onChange = config.onChange || function () {};
      groups = JSON.parse(JSON.stringify(config.groups || {}));
      render();
    },
    setOptions: function (options) { currentOptions = options; },
    render: function () { prune(); render(); },
    groups: function () { prune(); return JSON.parse(JSON.stringify(groups)); },
    validate: validate,
    firstInvalid: function () { return host && host.querySelector(".ug-site--invalid"); }
  };
})(window);
