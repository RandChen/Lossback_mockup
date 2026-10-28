(function () {
  "use strict";

  /* The Approval Inbox holds the three states the UX state diagram
     (3958:68596) draws inside its boundary. Draft and Deleted sit on the Bonus
     list and are never shown here. */

  var ROWS = {
    pending: [
      { name: "EPL Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111" },
      { name: "World Cup Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/20 11:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111" },
      { name: "World Cup Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/10 12:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111" },
      /* Past its distribution date and still unreviewed — the row the UX marks
         Expired. It stays in the queue; only its look changes. */
      { name: "EPL Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/07/30 10:00", submitted: "2026/07/28 10:00", submittedBy: "Admin111",
        expired: true }
    ],
    approved: [
      { name: "World Cup Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/08/18 10:00", decidedBy: "Admin111", stage: "Scheduled" },
      { name: "World Cup Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/08/18 10:00", decidedBy: "Admin111", stage: "Scheduled" },
      { name: "World Cup Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/08/18 10:00", decidedBy: "Admin111", stage: "Distributed" }
    ],
    rejected: [
      { name: "EPL Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/07/28 10:00", decidedBy: "By oneworks" },
      { name: "EPL Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/07/28 10:00", decidedBy: "By oneworks" },
      { name: "EPL Free Bet", code: "FB20260715001", type: "Free Bet",
        distribution: "2026/08/28 10:00", submitted: "2026/08/18 10:00", submittedBy: "Admin111",
        decided: "2026/07/28 10:00", decidedBy: "By oneworks" }
    ]
  };

  var TABS = {
    pending: {
      columns: ["Bonus Promotion", "Bonus Type", "Distribution Date (GMT-4)", "Submitted", "Action"],
      action: "Review",
      empty: { title: "No pending reviews", hint: "New submissions will appear here." }
    },
    approved: {
      columns: ["Bonus Promotion", "Bonus Type", "Distribution Date (GMT-4)", "Submitted", "Approved", "Action"],
      action: "View",
      empty: { title: "No approved promotions", hint: "Approved promotions will appear here." }
    },
    rejected: {
      columns: ["Bonus Promotion", "Bonus Type", "Distribution Date (GMT-4)", "Submitted", "Rejected", "Action"],
      action: "View",
      empty: { title: "No rejected promotions", hint: "Rejected promotions will appear here." }
    }
  };

  var $ = function (role, scope) {
    return (scope || document).querySelector('[data-role="' + role + '"]');
  };

  /* Approved and Rejected only say "something new landed here"; the UX notes
     the dot is per viewer and does not follow another reviewer's reading. */
  var unread = { approved: true, rejected: true };

  var current = (function () {
    var tab = new URLSearchParams(location.search).get("tab");
    return TABS[tab] ? tab : "pending";
  })();

  function cell(text, modifier) {
    var node = document.createElement("div");
    node.className = "table__cell" + (modifier ? " " + modifier : "");
    node.setAttribute("role", "cell");
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function stacked(lines) {
    var node = cell();
    lines.forEach(function (line, index) {
      var p = document.createElement("span");
      p.className = index === 0 ? "" : "review-cell__meta";
      p.textContent = line;
      node.appendChild(p);
    });
    node.classList.add("review-cell");
    return node;
  }

  /* Bonus Promotion carries the name, the id, and whichever tag the row's own
     state calls for: Expired while pending, the distribution stage once
     approved. Rejected rows carry none. */
  function promotionCell(row) {
    var node = document.createElement("div");
    node.className = "table__cell review-cell";
    node.setAttribute("role", "cell");

    var name = document.createElement("span");
    name.className = "review-cell__name";
    name.textContent = row.name;
    node.appendChild(name);

    var code = document.createElement("span");
    code.className = "review-cell__id";
    code.textContent = row.code;
    node.appendChild(code);

    var tag = null;
    if (row.expired) tag = { label: "Expired", kind: "warning" };
    else if (row.stage) tag = { label: row.stage, kind: row.stage === "Distributed" ? "success" : "normal" };

    if (tag) {
      var chip = document.createElement("span");
      chip.className = "tag tag--" + tag.kind + " review-cell__tag";
      chip.textContent = tag.label;
      node.appendChild(chip);
    }
    return node;
  }

  function render() {
    var config = TABS[current];
    var rows = ROWS[current];
    var table = $("table");
    var head = $("head");
    var host = $("rows");

    table.dataset.tab = current;
    head.innerHTML = "";
    host.innerHTML = "";

    config.columns.forEach(function (label) {
      var th = document.createElement("div");
      th.className = "table__th";
      th.setAttribute("role", "columnheader");
      th.textContent = label;
      head.appendChild(th);
    });

    rows.forEach(function (row) {
      var line = document.createElement("div");
      line.className = "table__row" + (row.expired ? " table__row--expired" : "");
      line.setAttribute("role", "row");

      line.appendChild(promotionCell(row));
      line.appendChild(cell(row.type));
      line.appendChild(cell(row.distribution));
      line.appendChild(stacked([row.submitted, row.submittedBy]));
      if (current !== "pending") line.appendChild(stacked([row.decided, row.decidedBy]));

      var action = document.createElement("div");
      action.className = "table__cell review-action";
      action.setAttribute("role", "cell");
      var button = document.createElement("a");
      /* Review / View is the row's primary action on this page, so it uses the
         Primary variant rather than the Outline the Bonus list rows use. */
      button.className = "button button--primary";
      /* An expired submission opens its own state, not the plain in-review one:
         the UX gives it an Expired alert and only lets the reviewer Reject
         (預覽頁面 - 已過期, 3929:65651). */
      var target = current === "pending" ? (row.expired ? "expired" : "in-review") : current;
      button.href = "detail.html?status=" + target + "&from=approval";
      button.textContent = config.action;
      action.appendChild(button);
      line.appendChild(action);

      host.appendChild(line);
    });

    table.hidden = rows.length === 0;
    $("empty").hidden = rows.length > 0;
    $("empty-title").textContent = config.empty.title;
    $("empty-hint").textContent = config.empty.hint;

    document.querySelectorAll(".tabs .tab").forEach(function (tab) {
      var active = tab.dataset.tab === current;
      tab.classList.toggle("tab--active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    /* The badge counts what is still actionable. An Expired submission stays
       in the queue but is past its distribution date, so the UX leaves it out
       of the count — four rows, badge of three. */
    var outstanding = ROWS.pending.filter(function (row) { return !row.expired; }).length;
    $("count-pending").textContent = String(outstanding);

    /* The UX draws the left menu twice: with a number when something is waiting
       and with nothing at all when it is not. */
    var badge = $("sidebar-count");
    badge.textContent = String(outstanding);
    badge.hidden = outstanding === 0;
    $("dot-approved").hidden = !unread.approved;
    $("dot-rejected").hidden = !unread.rejected;
  }

  document.querySelectorAll(".tabs .tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      current = tab.dataset.tab;
      /* Opening a tab clears its own unread mark. The UX is explicit that this
         is per viewer and does not clear it for another reviewer. */
      if (current in unread) unread[current] = false;
      history.replaceState(null, "", "?tab=" + current);
      render();
    });
  });

  render();
})();
