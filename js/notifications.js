/* Notification Bell — shared by every page, since the bell lives in the top bar.

   The five types, who receives each one and where each one leads come from the
   UX's Scenario Table (3984:71636):

     pending      "… is waiting for approval."            → the approval page, Pending tab
     approved     "… was approved."                        → the promotion's detail page
     rejected     "… was rejected."                        → the promotion's detail page
     distributed  "… has been distribution to recipients." → the distribution record
     failed       "Some bonus distributions for … failed." → the distribution record,
                                                             showing the failure reason

   Recipients differ per type (reviewers, creator, submitter), but a static
   prototype has no signed-in user to filter by, so every type is listed here. */
(function () {
  "use strict";

  var NAME = "{Bonus Promotion Name}";

  var TYPES = {
    pending: {
      icon: "clock",
      text: function (name) { return ["“" + name + "”", " is waiting for approval."]; },
      href: "approval-inbox.html?tab=pending"
    },
    approved: {
      icon: "circle-check",
      text: function (name) { return ["“" + name + "”", " was approved."]; },
      href: "detail.html?status=approved"
    },
    rejected: {
      icon: "circle-x",
      text: function (name) { return ["“" + name + "”", " was rejected."]; },
      href: "detail.html?status=rejected"
    },
    distributed: {
      icon: "gift",
      text: function (name) { return ["“" + name + "”", " has been distribution to recipients."]; },
      href: "detail.html?status=distributed"
    },
    failed: {
      icon: "triangle-alert",
      text: function (name) { return ["Some bonus distributions for “" + name + "”", " failed."]; },
      href: "detail.html?status=distributed"
    }
  };

  var ITEMS = [
    { type: "pending", name: NAME, time: "2026/10/10 18:00", unread: true },
    { type: "approved", name: NAME, time: "2026/10/10 18:00", unread: true },
    { type: "rejected", name: NAME, time: "2026/10/10 18:00", unread: true },
    { type: "distributed", name: NAME, time: "Yesterday 18:00", unread: false },
    { type: "failed", name: NAME, time: "Yesterday 18:00", unread: false }
  ];

  var host = document.querySelector(".notification");
  if (!host) return;

  var trigger = host.querySelector(".icon-button");
  var badge = host.querySelector(".notification__badge");
  var tab = "all";

  var panel = document.createElement("div");
  panel.className = "notification__panel";
  panel.hidden = true;
  panel.innerHTML =
    '<div class="notification__head">' +
      '<p class="notification__title">Notifications</p>' +
      '<button type="button" class="button button--outline button--xs notification__mark" data-role="mark-all">Mark all as read</button>' +
    '</div>' +
    '<div class="tabs notification__tabs" data-role="tabs" role="tablist">' +
      '<button type="button" class="tab notification__tab" role="tab" data-tab="all">' +
        '<span class="tab__label">All</span>' +
      '</button>' +
      '<button type="button" class="tab notification__tab" role="tab" data-tab="unread">' +
        '<span class="tab__label">Unread</span>' +
        '<span class="tab__count" data-role="unread-count"></span>' +
      '</button>' +
    '</div>' +
    '<div class="notification__list" data-role="list"></div>';
  host.appendChild(panel);

  var $ = function (role) { return panel.querySelector('[data-role="' + role + '"]'); };

  function unreadCount() {
    return ITEMS.filter(function (item) { return item.unread; }).length;
  }

  function render() {
    var list = $("list");
    list.innerHTML = "";

    /* With nothing at all there is no point offering a filter, so the UX drops
       the tabs and shows a single line. */
    var empty = ITEMS.length === 0;
    $("tabs").hidden = empty;

    var shown = empty ? [] :
      ITEMS.filter(function (item) { return tab === "all" || item.unread; });

    if (empty || !shown.length) {
      /* The same empty state the pages use, with the art at half scale — the
         panel is only 370 wide. */
      var note = document.createElement("div");
      note.className = "table-empty table-empty--sm notification__empty";
      note.innerHTML =
        '<img class="table-empty__art" src="icons/empty-notifications.svg" width="90" height="90" alt="" />' +
        '<div class="table-empty__content">' +
          '<p class="table-empty__title"></p>' +
        '</div>';
      note.querySelector(".table-empty__title").textContent =
        empty ? "No notification" : "No unread notifications";
      list.appendChild(note);
    }

    shown.forEach(function (item) {
      var type = TYPES[item.type];
      var row = document.createElement("a");
      row.className = "notification__item" + (item.unread ? " notification__item--unread" : "");
      row.href = type.href;

      var icon = document.createElement("span");
      icon.className = "icon notification__icon icon--" + type.icon +
        " notification__icon--" + item.type;
      icon.setAttribute("aria-hidden", "true");
      row.appendChild(icon);

      var body = document.createElement("div");
      body.className = "notification__body";
      var text = document.createElement("p");
      text.className = "notification__text";
      var parts = type.text(item.name);
      var strong = document.createElement("b");
      strong.textContent = parts[0];
      text.appendChild(strong);
      text.appendChild(document.createTextNode(parts[1]));
      body.appendChild(text);

      var time = document.createElement("p");
      time.className = "notification__time";
      time.textContent = item.time;
      body.appendChild(time);
      row.appendChild(body);

      /* Opening a notification is what marks it read. */
      row.addEventListener("click", function () { item.unread = false; });
      list.appendChild(row);
    });

    /* The count is there to say how much is waiting; with nothing waiting it
       has nothing to report, so it goes rather than showing a zero. */
    var count = unreadCount();
    $("unread-count").textContent = String(count);
    $("unread-count").hidden = count === 0;
    $("mark-all").disabled = count === 0;

    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }

    panel.querySelectorAll(".notification__tab").forEach(function (button) {
      var active = button.dataset.tab === tab;
      button.classList.toggle("tab--active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  panel.querySelectorAll(".notification__tab").forEach(function (button) {
    button.addEventListener("click", function () { tab = button.dataset.tab; render(); });
  });

  $("mark-all").addEventListener("click", function () {
    ITEMS.forEach(function (item) { item.unread = false; });
    render();
  });

  trigger.addEventListener("click", function (event) {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
  });

  document.addEventListener("click", function (event) {
    if (!panel.hidden && !host.contains(event.target)) panel.hidden = true;
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") panel.hidden = true;
  });

  render();
})();
