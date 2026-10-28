/* Activity Log — one dialog shared by the Bonus list and the Bonus detail page.

   Both pages used to carry their own copy of the markup, which drifted: the
   list page was missing the "Returned to Draft" entry. The component now owns
   its own markup and both pages just load this file.

   Labels and dot styles follow the design's own table (UI file, Log 紀錄標籤定義):
   Approved is the green dot, Rejected the red one, everything else a hollow
   grey dot. */
(function (global) {
  "use strict";

  var WHEN = "2026/07/10 14:30 (GMT-4)";

  var REJECT_REASON =
    "The promotion does not align with the current campaign strategy and " +
    "budget allocation for Q3 2026.";

  /* Newest first, the order the design draws. */
  var ENTRIES = [
    { label: "Returned to Draft", actor: "Admin" },
    { label: "Approved", actor: "Oneworks", tone: "success" },
    { label: "Submitted", actor: "Admin" },
    { label: "Edited", actor: "Admin" },
    { label: "Rejected", actor: "Oneworks", tone: "destructive", reason: REJECT_REASON },
    { label: "Submitted", actor: "Admin" },
    { label: "Edited", actor: "Admin" },
    { label: "Created", actor: "Admin" }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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

  function entryRow(entry) {
    var row = el("li", "log__row");

    var rail = el("span", "log__rail");
    rail.appendChild(el("span", "log__dot" + (entry.tone ? " log__dot--" + entry.tone : "")));

    var status = el("span", "log__status");
    status.appendChild(el("span", "log__label" + (entry.tone ? " log__label--" + entry.tone : ""), entry.label));
    status.appendChild(el("span", "log__actor", entry.actor));

    row.appendChild(rail);
    row.appendChild(status);
    row.appendChild(el("span", "log__date", WHEN));
    return row;
  }

  /* The reason sits on its own row so the rail runs straight past it. */
  function reasonRow(reason) {
    var row = el("li", "log__row log__row--wide");
    row.appendChild(el("span", "log__rail log__rail--line"));

    var alert = el("div", "alert alert--destructive");
    var icon = el("span", "icon icon--circle-alert");
    icon.setAttribute("aria-hidden", "true");
    var content = el("div", "alert__content");
    content.appendChild(el("p", "alert__title", "Reason"));
    content.appendChild(el("p", "alert__text", reason));

    alert.appendChild(icon);
    alert.appendChild(content);
    row.appendChild(alert);
    return row;
  }

  function build() {
    var backdrop = el("div", "backdrop");
    backdrop.dataset.role = "activity-log";
    backdrop.hidden = true;

    var dialog = el("div", "dialog dialog--activity-log");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "activity-log-title");

    var header = el("div", "dialog__header");
    var title = el("h2", "dialog__title", "Activity Log");
    title.id = "activity-log-title";
    var close = el("button", "dialog__close");
    close.type = "button";
    close.dataset.role = "close-activity-log";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
    header.appendChild(title);
    header.appendChild(close);

    var body = el("div", "dialog__body");
    var list = el("ol", "log");
    ENTRIES.forEach(function (entry) {
      list.appendChild(entryRow(entry));
      if (entry.reason) list.appendChild(reasonRow(entry.reason));
    });
    capRail(list);
    body.appendChild(list);

    dialog.appendChild(header);
    dialog.appendChild(body);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  var backdrop = build();
  var dialog = backdrop.querySelector(".dialog");
  var opener = document.querySelector('[data-role="open-activity-log"]');
  var lastFocused = null;

  function open() {
    lastFocused = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    backdrop.querySelector('[data-role="close-activity-log"]').focus();
  }

  function close() {
    backdrop.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  /* The list page opens it from a row action, so the opener button is optional
     and the controls stay available to other scripts. */
  if (opener) opener.addEventListener("click", open);
  global.ActivityLog = { open: open, close: close };

  backdrop.addEventListener("click", function (event) {
    if (event.target.closest('[data-role="close-activity-log"]')) {
      close();
      return;
    }
    if (!dialog.contains(event.target)) close();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !backdrop.hidden) close();
  });
})(window);
