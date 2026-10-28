(function () {
  "use strict";

  var $ = function (role) {
    return document.querySelector('[data-role="' + role + '"]');
  };

  var dialog = $("preview-dialog");
  var toasts = $("toasts");
  var draft = BonusDraft.read();
  var EMPTY = "—";

  /* The same toast the Bonus list uses, so both pages read alike. Nothing here
     carries an action, so each one clears itself after 3s. */
  function showToast(title) {
    var node = document.createElement("div");
    node.className = "toast-alert toast-alert--success";

    var icon = document.createElement("span");
    icon.className = "icon toast-alert__icon icon--check-circle";
    icon.setAttribute("aria-hidden", "true");

    var content = document.createElement("div");
    content.className = "toast-alert__content";
    var heading = document.createElement("p");
    heading.className = "toast-alert__title";
    heading.textContent = title;
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

  /* ---------- Review rendering --------------------------------------------- */
  function row(label, values, options) {
    var wrap = document.createElement("div");
    wrap.className = "list";

    var name = document.createElement("p");
    name.className = "list__label";
    name.textContent = label;

    var value = document.createElement("div");
    value.className = "list__value";

    (Array.isArray(values) ? values : [values]).forEach(function (item) {
      /* The design leaves an optional field's value blank when it was not
         filled in; only required fields fall back to a dash. */
      if (!item && options && options.optional) return;
      var line = document.createElement("p");
      if (options && options.note) line.className = "note";
      line.textContent = item || EMPTY;
      /* The odds format sits beside the value as its own muted label. */
      if (options && options.unit && item) {
        var unit = document.createElement("span");
        unit.className = "unit";
        unit.textContent = options.unit;
        line.appendChild(unit);
      }
      value.appendChild(line);
    });

    wrap.appendChild(name);
    wrap.appendChild(value);
    return wrap;
  }

  function subtitle(text) {
    var node = document.createElement("h3");
    node.className = "card__subtitle";
    node.textContent = text;
    return node;
  }

  /* Each Usage & Schedule sub-section is a sub-heading plus its rows; the card
     spaces the blocks, the block spaces heading from rows. */
  function block(heading) {
    var node = document.createElement("section");
    node.className = "review-block";
    node.appendChild(subtitle(heading));
    return node;
  }

  function area(tight) {
    var node = document.createElement("div");
    node.className = "list-area" + (tight ? " list-area--tight" : "");
    return node;
  }

  function group(rows) {
    var node = document.createElement("div");
    node.className = "sport-group";
    node.appendChild(rows);
    var line = document.createElement("hr");
    line.className = "separator";
    node.appendChild(line);
    return node;
  }

  function dateTime(date, time) {
    if (!date && !time) return EMPTY;
    return [date, time].filter(Boolean).join(" ") + " (GMT-4)";
  }

  function renderGeneral() {
    var general = draft.general;
    var host = document.querySelector('[data-review="general"]');

    var names = [];
    if (general.english) names.push("English: " + general.english);
    general.languages.forEach(function (language) {
      /* The review lists each language under its English name, as Step 1's
         field labels do. */
      if (language.value) names.push((language.label || language.native) + ": " + language.value);
    });

    host.appendChild(row("Bonus Promotion Name", general.name));
    host.appendChild(row("Bonus Display Name", names.length ? names : EMPTY));
    host.appendChild(row("Bonus Promotion Note", general.note, {
      note: Boolean(general.note),
      optional: true
    }));
  }

  function renderUsage() {
    var usage = draft.usage;
    var host = document.querySelector('[data-review="usage"]');

    var sports = block("Sports Conditions");

    if (usage.sportsMode === "all" || !usage.sports.length) {
      /* All Sports collapses to one group whose three values all read "All". */
      var all = area(true);
      all.appendChild(row("Sport", "All"));
      all.appendChild(row("League", "All"));
      all.appendChild(row("Bet Type", "All"));
      sports.appendChild(group(all));
    } else {
      var list = document.createElement("div");
      list.className = "sport-groups";
      usage.sports.forEach(function (sport, index) {
        var rows = area(true);
        rows.appendChild(row("Sport " + (index + 1), sport.sportName));
        rows.appendChild(row("League", sport.leagues.join(", ")));
        rows.appendChild(row("Bet Type", sport.betTypes.join(", ")));
        list.appendChild(group(rows));
      });
      sports.appendChild(list);
    }
    host.appendChild(sports);

    var odds = block("Odds Range");
    var oddsRows = area();
    oddsRows.appendChild(row("Min Odds", usage.minOdds, { unit: "(DEC)" }));
    oddsRows.appendChild(row("Max Odds", usage.maxOdds || "No limit", {
      unit: usage.maxOdds ? "(DEC)" : ""
    }));
    odds.appendChild(oddsRows);
    host.appendChild(odds);

    var schedule = block("Distribution Schedule");
    var scheduleRows = area();
    scheduleRows.appendChild(row("Distribution Date", dateTime(usage.distributionDate, usage.distributionTime)));
    schedule.appendChild(scheduleRows);
    host.appendChild(schedule);

    var validity = block("Validity Period");
    var validityRows = area();
    validityRows.appendChild(row("Effective Date", dateTime(usage.effectiveDate, usage.effectiveTime)));
    validityRows.appendChild(row("Expiry Date", dateTime(usage.expiryDate, usage.expiryTime)));
    validity.appendChild(validityRows);
    host.appendChild(validity);
  }

  function renderRecipients() {
    var recipients = draft.recipients;
    var host = document.querySelector('[data-review="recipients"]');

    var members = new Set(recipients.map(function (r) { return r.memberId; }));
    var quantity = recipients.reduce(function (sum, r) { return sum + Number(r.quantity); }, 0);

    host.appendChild(row("Total Recipients", members.size ? members.size.toLocaleString() : EMPTY));
    host.appendChild(row("Total Quantity", quantity ? quantity.toLocaleString() : EMPTY));

    var groups = {};
    recipients.forEach(function (r) {
      var key = r.currency + "|" + r.denomination;
      groups[key] = (groups[key] || 0) + Number(r.quantity);
    });

    var amount = document.createElement("div");
    amount.className = "list";
    var amountLabel = document.createElement("p");
    amountLabel.className = "list__label";
    amountLabel.textContent = "Total Denomination";
    var amountValue = document.createElement("div");
    amountValue.className = "list__value";

    if (!Object.keys(groups).length) {
      var none = document.createElement("p");
      none.textContent = EMPTY;
      amountValue.appendChild(none);
    }

    Object.keys(groups).forEach(function (key) {
      var parts = key.split("|");
      var line = document.createElement("p");
      line.className = "denomination";
      line.innerHTML =
        '<span class="currency">' + parts[0] + "</span><span>" + parts[1] +
        "</span><span>x</span><span>" + groups[key] + "</span><span>=</span><span>" +
        (Number(parts[1]) * groups[key]).toLocaleString() + "</span>";
      amountValue.appendChild(line);
    });

    amount.appendChild(amountLabel);
    amount.appendChild(amountValue);
    host.appendChild(amount);

    var fileName = (draft.general.name || "bonus").replace(/\s+/g, "_") + "_recipients_list.csv";
    var listRow = document.createElement("div");
    listRow.className = "list";
    var listLabel = document.createElement("p");
    listLabel.className = "list__label";
    listLabel.textContent = "Recipients List";
    var listValue = document.createElement("div");
    listValue.className = "list__value";

    if (recipients.length) {
      var link = document.createElement("a");
      link.className = "blue-link";
      link.href = "#";
      link.textContent = fileName;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var rows = recipients.map(function (r) {
          return [r.memberId, r.currency, r.denomination, r.quantity].join(",");
        });
        var blob = new Blob(
          ["Vendor Member ID,Currency,Denomination,Quantity\n" + rows.join("\n")],
          { type: "text/csv;charset=utf-8" }
        );
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      });
      listValue.appendChild(link);
    } else {
      var empty = document.createElement("p");
      empty.textContent = EMPTY;
      listValue.appendChild(empty);
    }

    listRow.appendChild(listLabel);
    listRow.appendChild(listValue);
    host.appendChild(listRow);
  }

  /* ---------- Preview dialog ------------------------------------------------- */
  function openPreview() {
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    document.querySelector('[data-role="close-preview"]').focus();
  }

  function closePreview() {
    dialog.hidden = true;
    document.body.style.overflow = "";
    $("open-preview").focus();
  }

  $("open-preview").addEventListener("click", openPreview);
  $("close-preview").addEventListener("click", closePreview);

  /* Clicking the dimmed backdrop closes this preview, matching the wireframe. */
  dialog.addEventListener("click", function (event) {
    if (!event.target.closest(".dialog")) closePreview();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !dialog.hidden) closePreview();
  });

  document.querySelectorAll("[data-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("[data-tab]").forEach(function (item) {
        var active = item === tab;
        item.classList.toggle("button--primary", active);
        item.classList.toggle("button--outline", !active);
        item.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-panel]").forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== tab.dataset.tab;
      });
    });
  });

  /* ---------- Footer ---------------------------------------------------------- */
  $("save-draft").addEventListener("click", function () {
    showToast("Draft saved.");
  });

  $("submit").addEventListener("click", function () {
    /* Flow D: 送審 re-runs the check, so a draft whose settings went stale
       cannot be submitted. The reasons are already listed at the top of the
       page, so bring that message into view rather than saying it twice. */
    if (StaleCheck.errors().length) {
      document.querySelector('[data-role="stale-message"]')
        .scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    showToast("Submitted for approval.");
    BonusDraft.clear();
  });

  renderGeneral();
  renderUsage();
  renderRecipients();

  /* Errors on earlier steps are listed at the top of the page, each with its own
     Go to Step N (UX 4712:38844). */
  StaleCheck.render(4);
})();
