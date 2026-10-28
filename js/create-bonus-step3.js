(function () {
  "use strict";

  /* Placeholder member directory and FX rates — the real values come from the
     platform and the Oanda feed. Currency is derived from the member, never
     typed by the user. */
  var MEMBERS = {
    VM_10029340: "USD",
    VM_10029341: "USD",
    VM_10029342: "IDR",
    VM_10029343: "THB",
    VM_10029344: "IDR",
    VM_10029345: "USD",
    VM_10029346: "USD",
    VM_10029347: "IDR"
  };

  var RATES = { USD: 1, IDR: 16000, THB: 36 };
  var MIN_USD = 5;
  /* Placeholder — the real list comes from the Site's configuration. */
  var SUPPORTED_CURRENCIES = ["USD", "IDR", "THB", "VND"];
  var MAX_ROWS = 10;
  var MAX_CSV_ROWS = 1000;

  var recipients = [];
  var draft = [];            // rows inside the manual dialog
  var dialogMode = "add";    // add | edit
  var editingIds = [];
  var imported = [];         // parsed CSV rows awaiting confirmation
  var search = "";
  var selected = new Set();

  var $ = function (role, scope) {
    return (scope || document).querySelector('[data-role="' + role + '"]');
  };

  var toasts = $("toasts");
  var recipientsDialog = $("recipients-dialog");
  var importDialog = $("import-dialog");
  var deleteDialog = $("delete-dialog");

  /* ---------- Helpers ------------------------------------------------------ */
  function minimumFor(currency) {
    return Math.ceil(MIN_USD * (RATES[currency] || 1));
  }

  function toLocal(usd, currency) {
    return Math.floor(usd * (RATES[currency] || 1));
  }

  /* The same toast-alert the Bonus list and Step 4 use. Nothing on this page
     carries a follow-up action, so no toast here shows a button. */
  function showToast(text, kind) {
    var notice = kind === "error";
    var node = document.createElement("div");
    node.className = "toast-alert toast-alert--" + (notice ? "notice" : "success");

    var icon = document.createElement("span");
    icon.className = "icon toast-alert__icon icon--" +
      (notice ? "attention-circle" : "check-circle");
    icon.setAttribute("aria-hidden", "true");

    var content = document.createElement("div");
    content.className = "toast-alert__content";
    var heading = document.createElement("p");
    heading.className = "toast-alert__title";
    heading.textContent = text;
    content.appendChild(heading);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast-alert__close";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
    close.addEventListener("click", function () { node.remove(); });

    /* toast-alert's `Icon + Content` row: the icon and the text travel
       together so the toast can centre them as one block. */
    var main = document.createElement("div");
    main.className = "toast-alert__main";
    main.appendChild(icon);
    main.appendChild(content);
    node.appendChild(main);
    /* The component's dismiss aligner — see .toast-alert__dismiss. */
    var dismiss = document.createElement("div");
    dismiss.className = "toast-alert__dismiss";
    dismiss.appendChild(close);
    node.appendChild(dismiss);
    toasts.appendChild(node);
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

  /* ---------- Recipient list ------------------------------------------------ */
  function visibleRecipients() {
    if (!search) return recipients;
    var query = search.trim().toLowerCase();
    return recipients.filter(function (item) {
      return item.memberId.toLowerCase().indexOf(query) !== -1;
    });
  }

  function iconButton(icon, label, destructive, onClick) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button" + (destructive ? " icon-button--destructive" : "");
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = '<span class="icon icon--' + icon + '" aria-hidden="true"></span>';
    button.addEventListener("click", onClick);
    return button;
  }

  function renderList() {
    var rowsHost = $("rows");
    var visible = visibleRecipients();
    rowsHost.innerHTML = "";

    $("empty").hidden = recipients.length > 0;
    if (recipients.length) {
      var listSection = $("empty").closest(".list-section");
      if (listSection) listSection.classList.remove("list-section--error");
    }
    $("table").hidden = recipients.length === 0;
    $("toolbar").hidden = recipients.length === 0;
    $("list-footer").hidden = recipients.length === 0;
    $("totals").hidden = recipients.length === 0;
    $("no-results").hidden = !(recipients.length > 0 && visible.length === 0);

    visible.forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = "recipient-row";

      var check = document.createElement("input");
      check.type = "checkbox";
      check.checked = selected.has(item.id);
      check.setAttribute("aria-label", "Select " + item.memberId);
      check.addEventListener("change", function () {
        if (check.checked) selected.add(item.id);
        else selected.delete(item.id);
        syncSelection();
      });

      row.appendChild(wrap(check));
      row.appendChild(text(String(index + 1), "#"));
      row.appendChild(text(item.memberId, "Vendor Member ID", search));
      row.appendChild(text(item.currency, "Currency"));
      row.appendChild(text(String(item.denomination), "Denomination"));
      row.appendChild(text(String(item.quantity), "Quantity"));

      var actions = document.createElement("span");
      actions.className = "recipient-row__actions";

      /* The two row actions are icon buttons; the label stays as the
         accessible name rather than visible text. */
      var edit = iconButton("pencil", "Edit", false, function () {
        openDialog("edit", [item.id]);
      });

      var remove = iconButton("trash", "Delete", true, function () {
        selected = new Set([item.id]);
        openDeleteDialog();
      });

      actions.appendChild(edit);
      actions.appendChild(remove);
      row.appendChild(actions);
      rowsHost.appendChild(row);
    });

    renderTotals();
    syncSelection();
  }

  function wrap(node) {
    var span = document.createElement("span");
    span.appendChild(node);
    return span;
  }

  /* The column name rides along on the cell so the narrow layout can print it
     beside the value once the table header is gone. */
  function text(value, label, query) {
    var span = document.createElement("span");
    if (query && String(query).trim()) span.appendChild(SearchHighlight(value, query));
    else span.textContent = value;
    if (label) span.dataset.label = label;
    return span;
  }

  /* The three totals describe what the list is currently showing, so they are
     counted from the filtered rows — the same set the footer's Total counts. */
  function renderTotals() {
    var counted = visibleRecipients();
    var members = new Set(counted.map(function (r) { return r.memberId; }));
    $("total-recipients").textContent = String(members.size);
    /* Quantity is stored as a string, so it has to be coerced before adding. */
    $("total-quantity").textContent = String(counted.reduce(function (sum, r) {
      return sum + Number(r.quantity);
    }, 0));

    var groups = {};
    counted.forEach(function (r) {
      var key = r.currency + "|" + r.denomination;
      groups[key] = (groups[key] || 0) + Number(r.quantity);
    });

    var host = $("total-amount");
    host.innerHTML = "";

    /* A search that matches nothing would leave this block empty and collapsed,
       so it falls back to the em dash the rest of the page uses for no value. */
    if (!Object.keys(groups).length) {
      var none = document.createElement("span");
      none.textContent = "\u2014";
      host.appendChild(none);
      return;
    }

    Object.keys(groups).forEach(function (key) {
      var parts = key.split("|");
      var line = document.createElement("span");
      line.className = "amount-row";
      line.innerHTML =
        '<span class="currency">' + parts[0] + "</span>" +
        "<span>" + parts[1] + "</span><span>x</span><span>" + groups[key] +
        "</span><span>=</span><span>" + (Number(parts[1]) * groups[key]).toLocaleString() + "</span>";
      host.appendChild(line);
    });
  }

  function syncFooterCount() {
    var node = $("visible-total");
    if (!node) return;
    node.textContent = selected.size
      ? selected.size + " selected"
      : "Total: " + visibleRecipients().length;
  }

  function syncSelection() {
    syncFooterCount();
    var ids = new Set(recipients.map(function (r) { return r.id; }));
    selected.forEach(function (id) {
      if (!ids.has(id)) selected.delete(id);
    });
    /* The UX gates one "Batch Action" control, disabled until rows are ticked. */
    var trigger = $("batch-trigger");
    trigger.disabled = selected.size === 0;
    if (trigger.disabled) closeBatchMenu();
    var all = $("select-all");
    var visible = visibleRecipients();
    all.checked = visible.length > 0 && visible.every(function (r) { return selected.has(r.id); });
  }

  $("select-all").addEventListener("change", function (event) {
    visibleRecipients().forEach(function (item) {
      if (event.target.checked) selected.add(item.id);
      else selected.delete(item.id);
    });
    renderList();
  });

  $("search").addEventListener("input", function (event) {
    search = event.target.value;
    renderList();
  });

  /* ---------- Manual add / edit dialog --------------------------------------- */
  function blankRow() {
    return { memberId: "", currency: "", denomination: "", quantity: "", error: "" };
  }

  function openDialog(mode, ids) {
    dialogMode = mode;
    editingIds = ids || [];

    if (mode === "edit") {
      draft = recipients
        .filter(function (r) { return editingIds.indexOf(r.id) !== -1; })
        .map(function (r) {
          return {
            memberId: r.memberId,
            currency: r.currency,
            denomination: String(r.denomination),
            quantity: String(r.quantity),
            error: ""
          };
        });
    } else {
      draft = [blankRow()];
    }

    document.getElementById("recipients-dialog-title").textContent =
      mode === "edit" ? "Edit Selected Recipients" : "Add Recipients Manually";
    $("save-recipients").textContent = mode === "edit" ? "Save Changes" : "Add Recipients";
    $("bulk-denomination").value = "";
    $("bulk-quantity").value = "";

    renderDraft();
    recipientsDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDialog() {
    recipientsDialog.hidden = true;
    document.body.style.overflow = "";
    draft = [];
  }

  /* A row is three fields wide: the member ID, the denomination behind its
     currency prefix, and the quantity. The currency is read from the member ID,
     so the denomination stays disabled until the ID resolves to one, and only
     rows the user added carry a remove button. */
  function renderDraft() {
    var host = $("recipient-rows");
    host.innerHTML = "";

    draft.forEach(function (row, index) {
      var line = document.createElement("div");
      line.className = "recipient-input-row";

      var member = document.createElement("div");
      member.className = "control";
      var memberInput = document.createElement("input");
      memberInput.type = "text";
      memberInput.placeholder = "Enter member ID";
      memberInput.value = row.memberId;
      member.appendChild(memberInput);

      var group = document.createElement("div");
      group.className = "input-group";
      var addon = document.createElement("span");
      addon.className = "input-group__addon";
      var denom = document.createElement("div");
      denom.className = "control";
      var denomInput = document.createElement("input");
      denomInput.type = "text";
      denomInput.inputMode = "numeric";
      denomInput.value = row.denomination;
      denom.appendChild(denomInput);
      group.appendChild(addon);
      group.appendChild(denom);

      function syncCurrency() {
        var known = Boolean(row.currency);
        addon.textContent = row.currency || "\u2014";
        addon.classList.toggle("input-group__addon--empty", !known);
        denomInput.disabled = !known;
        denom.classList.toggle("control--disabled", !known);
      }
      syncCurrency();

      memberInput.addEventListener("input", function () {
        row.memberId = memberInput.value.trim();
        row.currency = MEMBERS[row.memberId] || "";
        if (!row.currency) { row.denomination = ""; denomInput.value = ""; }
        syncCurrency();
        syncDialogActions();
      });
      denomInput.addEventListener("input", function () {
        row.denomination = denomInput.value.trim();
        syncDialogActions();
      });

      var qty = document.createElement("div");
      qty.className = "control";
      var qtyInput = document.createElement("input");
      qtyInput.type = "text";
      qtyInput.inputMode = "numeric";
      qtyInput.placeholder = "Enter quantity";
      qtyInput.value = row.quantity;
      qtyInput.addEventListener("input", function () {
        row.quantity = qtyInput.value.trim();
        syncDialogActions();
      });
      qty.appendChild(qtyInput);

      line.appendChild(member);
      line.appendChild(group);
      line.appendChild(qty);

      /* The first row is the one the dialog opens with, so it has nothing to
         remove; every row added after it does. */
      if (index > 0) {
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "field__remove";
        remove.setAttribute("aria-label", "Remove row " + (index + 1));
        remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
        remove.addEventListener("click", function () {
          draft.splice(index, 1);
          renderDraft();
        });
        line.appendChild(remove);
      } else {
        line.appendChild(document.createElement("span"));
      }

      (row.errors || []).forEach(function (message) {
        var error = document.createElement("p");
        error.className = "recipient-input-row__error";
        error.textContent = message;
        line.appendChild(error);
      });

      host.appendChild(line);
    });

    $("add-row").hidden = dialogMode === "edit";
    $("add-row").disabled = draft.length >= MAX_ROWS;
    $("row-limit").hidden = draft.length < MAX_ROWS;
    syncDialogActions();
  }

  /* Apply to All waits until one of the bulk fields has something to apply, and
     the footer waits until every required cell in every row is filled. */
  function syncDialogActions() {
    var bulkDenomination = $("bulk-denomination").value.trim();
    var bulkQuantity = $("bulk-quantity").value.trim();
    $("apply-all").disabled = !bulkDenomination && !bulkQuantity;

    var complete = draft.length > 0 && draft.every(function (row) {
      return row.memberId && row.denomination && row.quantity;
    });
    $("save-recipients").disabled = !complete;
  }

  $("add-row").addEventListener("click", function () {
    if (draft.length >= MAX_ROWS) return;
    draft.push(blankRow());
    renderDraft();
  });

  ["bulk-denomination", "bulk-quantity"].forEach(function (role) {
    $(role).addEventListener("input", syncDialogActions);
  });

  /* Bulk settings are entered in USD and converted into each member's own
     currency, rounded down. */
  $("apply-all").addEventListener("click", function () {
    var usd = $("bulk-denomination").value.trim();
    var qty = $("bulk-quantity").value.trim();

    if (usd && (!/^\d+$/.test(usd) || Number(usd) < MIN_USD)) {
      showToast("Denomination must be equivalent to at least USD " + MIN_USD + ".", "error");
      return;
    }

    /* The UX limits this to rows that already name a member — a row with no
       member has no currency to convert into — and it only overwrites the
       fields the user actually set. */
    draft.forEach(function (row) {
      if (!row.memberId || !row.currency) return;
      if (usd) row.denomination = String(toLocal(Number(usd), row.currency));
      if (qty) row.quantity = qty;
    });
    renderDraft();
  });

  /* Row-level copy is taken verbatim from the UX; every message carries the
     row number so it can be read on its own in the preview's Issue column. */
  function rowError(no, text) {
    return no ? "Row " + no + ": " + text : text;
  }

  /* The manual dialog has its own message table in the UX — it says "equivalent
     to at least USD 5" where the CSV import says "convert to at least 5 USD".
     Every problem on a row is listed, ordered Vendor Member ID → Currency →
     Denomination → Quantity, as the wireframe's annotation requires. */
  function validateRow(row, seen, firstSeen, no) {
    var errors = [];

    var missing = [];
    if (!row.memberId) missing.push("Vendor Member ID");
    /* Denomination stays disabled until the member ID names a currency, so it
       is not reported as missing while the user has no way to fill it. */
    if (row.currency && !row.denomination) missing.push("Denomination");
    if (!row.quantity) missing.push("Quantity");
    if (missing.length) {
      errors.push(rowError(no, missing.join(", ") +
        (missing.length > 1 ? " are required." : " is required.")));
    }

    if (row.memberId) {
      if (!MEMBERS[row.memberId]) {
        errors.push(rowError(no, "Vendor Member ID does not exist."));
      } else if (seen.has(row.memberId)) {
        errors.push(rowError(no, "Vendor Member ID already exists in the recipient list."));
      } else if (firstSeen[row.memberId]) {
        errors.push("Row " + firstSeen[row.memberId] + " and row " + no +
          ": duplicate Vendor Member ID.");
      } else {
        firstSeen[row.memberId] = no;
      }
    }

    if (row.denomination) {
      if (!/^\d+$/.test(row.denomination) || Number(row.denomination) <= 0) {
        errors.push(rowError(no, "Denomination must be a positive integer."));
      } else if (Number(row.denomination) < minimumFor(row.currency)) {
        errors.push(rowError(no, "Denomination must be equivalent to at least USD " + MIN_USD + "."));
      }
    }

    if (row.quantity && (!/^\d+$/.test(row.quantity) || Number(row.quantity) <= 0)) {
      errors.push(rowError(no, "Quantity must be a positive integer."));
    }

    return errors;
  }

  $("save-recipients").addEventListener("click", function () {
    var seen = new Set(
      recipients
        .filter(function (r) { return editingIds.indexOf(r.id) === -1; })
        .map(function (r) { return r.memberId; })
    );
    var ok = true;

    var firstSeen = {};
    draft.forEach(function (row, index) {
      row.errors = validateRow(row, seen, firstSeen, index + 1);
      if (row.errors.length) ok = false;
    });

    renderDraft();
    if (!ok) return;

    if (dialogMode === "edit") {
      draft.forEach(function (row, index) {
        var target = recipients.find(function (r) { return r.id === editingIds[index]; });
        if (target) {
          target.denomination = Number(row.denomination);
          target.quantity = Number(row.quantity);
        }
      });
      showToast("Recipients updated.");
    } else {
      draft.forEach(function (row) {
        recipients.push({
          id: "r" + Date.now() + Math.random().toString(16).slice(2),
          memberId: row.memberId,
          currency: row.currency,
          denomination: Number(row.denomination),
          quantity: Number(row.quantity)
        });
      });
      showToast("Recipients added successfully.");
    }

    closeDialog();
    renderList();
  });

  $("close-recipients").addEventListener("click", closeDialog);
  $("cancel-recipients").addEventListener("click", closeDialog);
  /* The Recipient List bar carries only its title in the UX; adding is done
     from the Add Recipients block above. */
  var addManually = $("add-manually");
  if (addManually) addManually.addEventListener("click", function () { openDialog("add"); });
  var batchMenu = $("batch-menu");

  function closeBatchMenu() {
    batchMenu.hidden = true;
    $("batch-trigger").setAttribute("aria-expanded", "false");
  }

  $("batch-trigger").addEventListener("click", function (event) {
    event.stopPropagation();
    var opening = batchMenu.hidden;
    batchMenu.hidden = !opening;
    $("batch-trigger").setAttribute("aria-expanded", String(opening));
  });

  document.addEventListener("click", closeBatchMenu);
  batchMenu.addEventListener("click", function (event) {
    event.stopPropagation();
    closeBatchMenu();
  });

  $("batch-edit").addEventListener("click", function () {
    openDialog("edit", Array.from(selected));
  });

  /* ---------- Delete ---------------------------------------------------------- */
  function openDeleteDialog() {
    $("delete-text").textContent =
      "Delete " + selected.size + " selected recipients? This action cannot be undone.";

    /* A read-only copy of the rows being removed, in the list's own order. */
    var list = $("delete-list");
    list.innerHTML = "";
    recipients
      .filter(function (r) { return selected.has(r.id); })
      .forEach(function (r) {
        var line = document.createElement("div");
        line.className = "delete-list__row";
        [r.memberId, r.currency, r.denomination, r.quantity].forEach(function (value) {
          var cell = document.createElement("span");
          cell.textContent = String(value);
          line.appendChild(cell);
        });
        list.appendChild(line);
      });
    deleteDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDeleteDialog() {
    deleteDialog.hidden = true;
    document.body.style.overflow = "";
  }

  $("batch-delete").addEventListener("click", openDeleteDialog);
  $("cancel-delete").addEventListener("click", closeDeleteDialog);
  $("confirm-delete").addEventListener("click", function () {
    recipients = recipients.filter(function (r) { return !selected.has(r.id); });
    selected.clear();
    closeDeleteDialog();
    renderList();
    showToast("Recipients deleted.");
  });

  /* ---------- CSV ------------------------------------------------------------- */
  /* The template spec is a header row and nothing else — a blank template. The
     Oneworks build adds Site Name in front; every other role omits it. */
  var TEMPLATE_COLUMNS = ["Vendor Member ID", "Currency", "Denomination", "Quantity"];

  function isOneworks() {
    /* The top bar owns the switch (js/role.js); the draft only keeps a copy of
       who was signed in, so read the live value when it is there. */
    if (window.Role) return window.Role.isOneworks();
    var general = BonusDraft.read().general;
    return Boolean(general && general.role === "oneworks");
  }

  function templateColumns() {
    return isOneworks()
      ? ["Site Name"].concat(TEMPLATE_COLUMNS)
      : TEMPLATE_COLUMNS.slice();
  }

  /* The requirement line lists the same columns the template carries, so both
     follow the role rather than being written twice. */
  function syncRequiredColumns() {
    var node = $("required-columns");
    if (node) node.textContent = "CSV required columns: " + templateColumns().join(", ");
  }

  syncRequiredColumns();
  /* Flipping the role in the top bar changes which columns the template asks
     for, so the requirement line follows it. */
  if (window.Role) window.Role.onChange(syncRequiredColumns);

  $("download-template").addEventListener("click", function () {
    download("recipients_template.csv", templateColumns().join(",") + "\n");
  });

  $("export").addEventListener("click", function () {
    var rows = recipients.map(function (r) {
      return [r.memberId, r.currency, r.denomination, r.quantity].join(",");
    });
    download("recipients_list.csv", "Vendor Member ID,Currency,Denomination,Quantity\n" + rows.join("\n"));
  });

  /* The UX allows one or several files at a time: the preview keeps the order
     the files were added, and the original row order inside each file. */
  document.getElementById("csv-file").addEventListener("change", function (event) {
    var files = Array.prototype.slice.call(event.target.files);
    if (!files.length) return;
    clearFileError();

    var wrongType = files.filter(function (f) { return !/\.csv$/i.test(f.name); });
    if (wrongType.length) {
      fileError("Invalid file format. Please upload a CSV file.");
      event.target.value = "";
      return;
    }

    Promise.all(files.map(function (file) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result)); };
        reader.onerror = function () { resolve(""); };
        reader.readAsText(file);
      });
    })).then(function (texts) {
      parseCsv(texts, files.map(function (f) { return f.name; }));
      event.target.value = "";
    });
  });

  /* File-level checks run first and block the upload; row-level checks run in
     the preview. */
  function parseCsv(contents, names) {
    var texts = Array.isArray(contents) ? contents : [contents];
    var fileNames = names || [];

    /* Each file is checked on its own, then the rows are concatenated in the
       order the files arrived — the preview order the UX describes. */
    var collected = [];
    for (var f = 0; f < texts.length; f++) {
      var lines = texts[f].split(/\r?\n/).filter(function (line) { return line.trim(); });
      if (lines.length < 2) {
        fileError("The CSV file contains no valid data. Please check and upload it again.");
        return;
      }

      var header = lines[0].split(",").map(function (h) { return h.trim().toLowerCase(); });
      /* Reported with the template's own spelling and in its column order, as
         the UX specifies — not the lower-cased forms used for matching. */
      var missing = TEMPLATE_COLUMNS.filter(function (name) {
        return header.indexOf(name.toLowerCase()) === -1;
      });
      if (missing.length) {
        fileError("Missing required columns: " + missing.join(", "));
        return;
      }

      if (lines.length - 1 > MAX_CSV_ROWS) {
        fileError("The CSV exceeds the 1,000-row limit. Please reduce the number of rows.");
        return;
      }

      for (var i = 1; i < lines.length; i++) {
        collected.push({ line: lines[i], header: header, row: i + 1, file: fileNames[f] || "" });
      }
    }

    imported = collected.map(function (entry) {
      var header = entry.header;
      var cells = entry.line.split(",").map(function (c) { return c.trim(); });
      return {
        row: entry.row,
        file: entry.file,
        memberId: cells[header.indexOf("vendor member id")] || "",
        currency: cells[header.indexOf("currency")] || "",
        denomination: cells[header.indexOf("denomination")] || "",
        quantity: cells[header.indexOf("quantity")] || ""
      };
    });

    revalidateImport();
    renderImport();
    importDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* Every field a row fails is reported, ordered Vendor Member ID → Currency →
     Denomination → Quantity, and a repeat names both rows it spans. Run over
     the whole set so edits in the preview re-check duplicates as well. */
  /* The UX's "欄位內驗證優先順序" table, followed exactly:
       1. every required column, reported together in one message
       2. Vendor Member ID — does not exist / wrong Site / duplicate
       3. Currency      — unsupported / disagrees with the member account
       4. Denomination  — positive integer / converts to at least 5 USD
       5. Quantity      — positive integer
     Within a field the first failure stops its later, dependent checks;
     across fields the errors are shown together. */
  function revalidateImport() {
    var existing = new Set(recipients.map(function (r) { return r.memberId; }));
    var firstSeen = {};
    var FIELD_OF = {
      "Vendor Member ID": "memberId",
      "Currency": "currency",
      "Denomination": "denomination",
      "Quantity": "quantity"
    };

    imported.forEach(function (row) {
      var errors = [];
      var bad = {};

      /* 1 — required, listed together in the template's column order. */
      var blank = templateColumns().filter(function (name) {
        var field = FIELD_OF[name];
        return field && !String(row[field] || "").trim();
      });
      if (blank.length) {
        errors.push(rowError(row.row, blank.join(", ") +
          (blank.length > 1 ? " are required." : " is required.")));
        blank.forEach(function (name) { bad[FIELD_OF[name]] = true; });
      }

      var expected = MEMBERS[row.memberId];

      /* 2 — Vendor Member ID. */
      if (row.memberId) {
        if (!expected) {
          errors.push(rowError(row.row, "Vendor Member ID does not exist."));
          bad.memberId = true;
        } else if (existing.has(row.memberId)) {
          errors.push(rowError(row.row, "Vendor Member ID already exists in the recipient list."));
          bad.memberId = true;
        } else if (firstSeen[row.memberId]) {
          errors.push("Row " + firstSeen[row.memberId] + " and row " + row.row +
            ": duplicate Vendor Member ID.");
          bad.memberId = true;
        } else {
          firstSeen[row.memberId] = row.row;
        }
      }

      /* 3 — Currency: unsupported first, then agreement with the account. */
      if (row.currency) {
        var code = row.currency.toUpperCase();
        if (SUPPORTED_CURRENCIES.indexOf(code) === -1) {
          errors.push(rowError(row.row, "Currency is not supported."));
          bad.currency = true;
        } else if (expected && code !== expected) {
          errors.push(rowError(row.row, "Vendor Member ID and Currency do not match."));
          bad.currency = true;
        }
      }

      /* 4 — Denomination. */
      if (row.denomination) {
        if (!/^\d+$/.test(row.denomination) || Number(row.denomination) <= 0) {
          errors.push(rowError(row.row, "Denomination must be a positive integer."));
          bad.denomination = true;
        } else if (expected && Number(row.denomination) < minimumFor(expected)) {
          errors.push(rowError(row.row, "Denomination must convert to at least 5 USD."));
          bad.denomination = true;
        }
      }

      /* 5 — Quantity. */
      if (row.quantity) {
        if (!/^\d+$/.test(row.quantity) || Number(row.quantity) <= 0) {
          errors.push(rowError(row.row, "Quantity must be a positive integer."));
          bad.quantity = true;
        }
      }

      row.errors = errors;
      row.badFields = bad;
      row.error = errors[0] || "";
    });
  }

  /* File-level problems are stated inline above the requirements panel, not in
     a toast — the UX keeps the toast for the success case only. */
  function fileError(message) {
    var node = $("file-error");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
  }

  function clearFileError() {
    var node = $("file-error");
    if (node) node.hidden = true;
  }

  var IMPORT_LABELS = {
    memberId: "Vendor Member ID",
    currency: "Currency",
    denomination: "Denomination",
    quantity: "Quantity"
  };

  function renderImport() {
    var errors = imported.filter(function (r) { return r.error; }).length;
    var onlyErrors = $("errors-only").checked;

    /* The UX states three counts side by side rather than one sentence. */
    var host = $("import-summary");
    host.innerHTML = "";
    [
      ["Rows", imported.length, false],
      ["Valid", imported.length - errors, false],
      ["Errors", errors, errors > 0]
    ].forEach(function (pair) {
      var item = document.createElement("span");
      item.className = "import-summary__item" + (pair[2] ? " import-summary__item--error" : "");
      item.textContent = pair[0] + " " + pair[1];
      host.appendChild(item);
    });

    var host = $("import-rows");
    host.innerHTML = "";

    imported
      .filter(function (r) { return !onlyErrors || r.error; })
      .forEach(function (r) {
        var line = document.createElement("div");
        line.className = "recipient-row" + (r.error ? " recipient-row--invalid" : "");
        line.appendChild(text(String(r.row), "Row"));

        /* Only the cells that failed become editable; the rest stay read-only,
           so the preview can be corrected without re-uploading the file. */
        ["memberId", "currency", "denomination", "quantity"].forEach(function (field) {
          if (r.badFields && r.badFields[field]) {
            line.appendChild(fixCell(r, field));
          } else {
            line.appendChild(text(String(r[field]), IMPORT_LABELS[field]));
          }
        });

        var status = document.createElement("span");
        status.className = r.error ? "recipient-row__error" : "";
        (r.errors || []).forEach(function (message) {
          var item = document.createElement("span");
          item.className = "issue-line";
          item.textContent = message;
          status.appendChild(item);
        });
        line.appendChild(status);
        host.appendChild(line);
      });

    $("confirm-import").disabled = errors > 0;
  }

  function fixCell(row, field) {
    var wrap = document.createElement("span");
    var input = document.createElement("input");
    input.type = "text";
    input.className = "issue-input";
    input.value = String(row[field]);
    input.setAttribute("aria-label", "Fix " + field + " on row " + row.row);
    input.addEventListener("change", function () {
      row[field] = input.value.trim();
      revalidateImport();
      renderImport();
    });
    wrap.appendChild(input);
    return wrap;
  }

  $("errors-only").addEventListener("change", renderImport);

  function closeImport() {
    importDialog.hidden = true;
    document.body.style.overflow = "";
    imported = [];
  }

  $("close-import").addEventListener("click", closeImport);
  $("cancel-import").addEventListener("click", closeImport);

  $("confirm-import").addEventListener("click", function () {
    imported.forEach(function (r) {
      recipients.push({
        id: "r" + Date.now() + Math.random().toString(16).slice(2),
        memberId: r.memberId,
        currency: MEMBERS[r.memberId],
        denomination: Number(r.denomination),
        quantity: Number(r.quantity)
      });
    });
    showToast("CSV uploaded successfully. Recipients have been added.");
    closeImport();
    renderList();
  });

  /* ---------- Method toggle + footer ------------------------------------------ */
  /* Two plain actions, as the UX draws them — neither is a persistent state. */
  document.querySelectorAll("[data-method]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.method === "csv") document.getElementById("csv-file").click();
      else openDialog("add");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!recipientsDialog.hidden) closeDialog();
    else if (!importDialog.hidden) closeImport();
    else if (!deleteDialog.hidden) closeDeleteDialog();
  });

  $("next").addEventListener("click", function () {
    if (!recipients.length) {
      /* The UX puts the complaint on the list itself, not in a toast
         (「未新增任何名單下點擊 Next - Error State」). */
      var section = $("empty").closest(".list-section");
      if (section) section.classList.add("list-section--error");
      $("empty").scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    window.location.href = "create-bonus-step4.html";
  });

  $("save-draft").addEventListener("click", function () {
    showToast("Draft saved.");
  });

  /* ---------- Shared draft -------------------------------------------------- */
  function persist() {
    BonusDraft.write("recipients", recipients);
  }

  recipients = BonusDraft.read().recipients || [];

  var baseRenderList = renderList;
  renderList = function () {
    baseRenderList();
    persist();
  };

  renderList();

  /* Errors on earlier steps are listed at the top of the page, each with its own
     Go to Step N (UX 4712:38844). */
  StaleCheck.render(3);
})();
