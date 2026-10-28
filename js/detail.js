/* Bonus Detail — the page renders one bonus, so which controls it shows is
   decided by the row's status. The list page passes it on the query string.

   Statuses follow the wireframe's four boards:
     draft            Overview only, Edit + Submit for Approval
     draft-incomplete Overview only, Edit, no Submit, unset values read "—"
     in-review        Overview only, read-only
     approved         Overview only, read-only (waiting to be distributed)
     distributed      all four tabs, read-only
     rejected         Overview only, Edit + Submit, inline reject banner */
(function () {
  "use strict";

  var EMPTY = "—";
  var REJECT_REASON =
    "The promotion does not align with the current campaign strategy and " +
    "budget allocation for Q3 2026.";

  var params = new URLSearchParams(window.location.search);
  var status = params.get("status") || "distributed";
  var step = params.get("step");

  /* The same page serves two readers. The owner arrives from the Bonus list and
     can edit and submit; the reviewer arrives from the Approval Inbox and can
     only approve or reject. The state diagram (UX 3958:68596) gives the
     reviewer no way to change the promotion itself. */
  var review = params.get("from") === "approval";

  var $ = function (role) { return document.querySelector('[data-role="' + role + '"]'); };

  var editable = !review &&
    (status === "draft" || status === "draft-incomplete" || status === "rejected");
  var submittable = !review && (status === "draft" || status === "rejected");

  /* Licensee PT is Oneworks' own number — the licensee reading this page has no
     say over it and the UX leaves the row out entirely rather than showing a
     fixed 100% they cannot change. */
  (function () {
    var row = $("licensee-pt");
    if (!row) return;
    function sync() {
      row.hidden = !(window.Role && window.Role.isOneworks());
    }
    sync();
    if (window.Role) window.Role.onChange(sync);
  })();

  /* The three report tabs appear only once the bonus has been distributed. */
  document.querySelectorAll('[data-role="tab-extra"]').forEach(function (tab) {
    tab.hidden = status !== "distributed";
  });

  var edit = $("edit");
  edit.hidden = !editable;
  /* Draft resumes at the step it was left on; Rejected starts over at step 1,
     the same rule the list page's Edit follows. */
  if (status === "draft" || status === "draft-incomplete") {
    edit.href = step && Number(step) > 1 ? "create-bonus-step" + step + ".html" : "create-bonus.html";
  }

  $("submit-row").hidden = !submittable;

  /* One banner, three outcomes. Expired is the only one that also changes what
     the reviewer may do, so its copy says so outright. */
  var BANNERS = {
    expired: { kind: "warning", icon: "triangle-alert", title: "Expired",
      text: "This promotion has expired and can no longer be approved. " +
            "Reject it to remove it from Pending Review." },
    approved: { kind: "success", icon: "circle-check", title: "Approved", text: "" },
    rejected: { kind: "destructive", icon: "circle-alert", title: "Rejected", text: REJECT_REASON }
  };

  var banner = $("reject-banner");
  var shown = BANNERS[status];
  /* Outside the reviewer's view only Rejected has ever had a banner. */
  if (!review && status !== "rejected") shown = null;

  banner.hidden = !shown;
  if (shown) {
    banner.className = "alert alert--" + shown.kind + " alert--page";
    $("banner-icon").className = "icon icon--" + shown.icon;
    $("banner-title").textContent = shown.title;
    $("reject-reason").textContent = shown.text;
    $("reject-reason").hidden = !shown.text;
  }

  if (review) {
    /* The reviewer came in from the inbox, so the sidebar follows them there
       rather than leaving Bonus Management lit. */
    var owner = document.querySelector(".nav-item--active");
    if (owner) { owner.classList.remove("nav-item--active"); owner.setAttribute("aria-expanded", "false"); }
    var sub = document.querySelector(".nav-sub-item--active");
    if (sub) { sub.classList.remove("nav-sub-item--active"); sub.removeAttribute("aria-current"); }
    var inbox = document.querySelector('.nav-item[href="approval-inbox.html"]');
    if (inbox) { inbox.classList.add("nav-item--active"); inbox.setAttribute("aria-current", "page"); }

    $("back-link").href = "approval-inbox.html";
    $("back-label").textContent = "Approval Inbox";

    var meta = $("submitted-meta");
    meta.hidden = false;
    meta.textContent = "Submitted By Admin111 2026/07/14 09:00 (GMT-4)";

    $("open-preview").hidden = false;
    $("open-activity-log").hidden = true;

    /* A decision is only open while the promotion is still in the queue.
       Expired keeps Reject so the submission can be cleared out, but Approve
       is closed — the distribution date has already passed. */
    var pending = status === "in-review" || status === "expired";
    $("review-actions").hidden = !pending;
    $("approve").disabled = status === "expired";
  }

  /* An incomplete draft shows a dash for every required field still unset and
     leaves the optional note blank. */
  if (status === "draft-incomplete") {
    document.querySelectorAll("[data-value]").forEach(function (value) {
      value.innerHTML = "";
      if (value.dataset.optional === "true") return;
      var line = document.createElement("p");
      line.textContent = EMPTY;
      value.appendChild(line);
    });

    var sports = $("sports");
    sports.innerHTML = "";
    var area = document.createElement("div");
    area.className = "list-area list-area--tight";
    ["Sport", "League", "Bet Type"].forEach(function (label) {
      var row = document.createElement("div");
      row.className = "list";
      var name = document.createElement("p");
      name.className = "list__label";
      name.textContent = label;
      var value = document.createElement("div");
      value.className = "list__value";
      var line = document.createElement("p");
      line.textContent = EMPTY;
      value.appendChild(line);
      row.appendChild(name);
      row.appendChild(value);
      area.appendChild(row);
    });
    var rule = document.createElement("hr");
    rule.className = "separator";
    area.appendChild(rule);
    sports.appendChild(area);
  }

  $("submit").addEventListener("click", function () {
    window.location.href = "index.html";
  });

  /* Preview Player View — the same dialog Step 4 shows, opened from the
     reviewer's header. Its body is the design's own player-view mock, so there
     is nothing to fill in; this only drives opening, closing and the tabs. */
  (function () {
    var dialog = $("preview-dialog");
    if (!dialog) return;

    function open() { dialog.hidden = false; document.body.style.overflow = "hidden"; }
    function close() { dialog.hidden = true; document.body.style.overflow = ""; }

    $("open-preview").addEventListener("click", open);
    $("close-preview").addEventListener("click", close);
    dialog.addEventListener("click", function (event) { if (event.target === dialog) close(); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !dialog.hidden) close();
    });

    document.querySelectorAll(".preview__tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".preview__tab").forEach(function (item) {
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
  })();


  /* Approve / Reject. Approving is a plain confirm; rejecting has to carry a
     reason, so its dialog holds a required field and keeps Reject closed until
     something is written. */
  (function () {
    var rejectDialog = $("reject-dialog");
    var approveDialog = $("approve-dialog");
    if (!rejectDialog || !approveDialog) return;

    var toasts = $("toasts");
    var reason = $("reason");
    var counter = $("reason-counter");
    var confirmReject = $("confirm-reject");

    function toast(text) {
      var node = document.createElement("div");
      node.className = "toast-alert toast-alert--success";
      node.innerHTML =
        '<div class="toast-alert__main">' +
        '<span class="icon toast-alert__icon icon--check-circle" aria-hidden="true"></span>' +
        '<div class="toast-alert__content"><p class="toast-alert__title"></p></div>' +
        '</div>';
      node.querySelector(".toast-alert__title").textContent = text;
      var close = document.createElement("button");
      close.type = "button";
      close.className = "toast-alert__close";
      close.setAttribute("aria-label", "Dismiss");
      close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
      close.addEventListener("click", function () { node.remove(); });
      /* The component's dismiss aligner — see .toast-alert__dismiss. */
      var dismiss = document.createElement("div");
      dismiss.className = "toast-alert__dismiss";
      dismiss.appendChild(close);
      node.appendChild(dismiss);
      toasts.appendChild(node);
      setTimeout(function () { node.remove(); }, 3000);
    }

    function open(dialog) { dialog.hidden = false; document.body.style.overflow = "hidden"; }
    function close(dialog) { dialog.hidden = true; document.body.style.overflow = ""; }

    function syncReason() {
      var value = reason.value.trim();
      counter.textContent = reason.value.length + "/200";
      confirmReject.disabled = value.length === 0;
    }

    $("reject").addEventListener("click", function () {
      reason.value = "";
      syncReason();
      open(rejectDialog);
      reason.focus();
    });
    reason.addEventListener("input", syncReason);
    $("cancel-reject").addEventListener("click", function () { close(rejectDialog); });
    $("close-reject").addEventListener("click", function () { close(rejectDialog); });
    $("confirm-reject").addEventListener("click", function () {
      close(rejectDialog);
      toast("Promotion rejected.");
      setTimeout(function () { window.location.href = "approval-inbox.html?tab=rejected"; }, 900);
    });

    $("approve").addEventListener("click", function () { open(approveDialog); });
    $("cancel-approve").addEventListener("click", function () { close(approveDialog); });
    $("confirm-approve").addEventListener("click", function () {
      close(approveDialog);
      toast("Promotion approved.");
      setTimeout(function () { window.location.href = "approval-inbox.html?tab=approved"; }, 900);
    });

    /* The UX splits the two deliberately: the Approve popup closes on a
       backdrop click (3948:68006 — 點擊遮黑關閉彈窗), while the Reject dialog
       does not (3944:66818 — 點擊遮黑 不關閉彈窗), because it holds typed input
       and only the X or Cancel may discard it. Escape still closes both. */
    approveDialog.addEventListener("click", function (event) {
      if (event.target === approveDialog) close(approveDialog);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!rejectDialog.hidden) close(rejectDialog);
      if (!approveDialog.hidden) close(approveDialog);
    });
  })();

})();
