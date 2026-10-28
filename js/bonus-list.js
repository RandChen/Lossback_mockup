(function () {
  "use strict";

  /* Row actions follow the spec's Action Rules: the pair of Approval Status and
     Bonus Distribution Status decides which actions a row offers. */
  /* The UX's Status filter lists six (01_ 的 Dropdown-Menu)：四個審核狀態，加上
     Approved 底下的兩個發放階段。列表把階段顯示在發放日期底下，篩選也認它。 */
  var STATUSES = ["Draft", "In Review", "Rejected", "Approved", "Scheduled", "Distributed"];

  /* Status Filter (4171:50293): Scheduled and Distributed are distribution
     states an approved promotion moves through, so the dropdown nests them one
     level under Approved. The nesting is presentational — each box still
     filters on its own, the design draws no parent/child selection. */
  var STATUS_TREE = [
    { name: "Draft" },
    { name: "In Review" },
    { name: "Rejected" },
    { name: "Approved", children: ["Scheduled", "Distributed"] }
  ];
	
	
  var rows = [
    { id: 1, name: "World Cup Lossback", code: "FB20260715021", distribution: "2026/08/28 10:00", expiry: "2026/09/28 10:00", createdBy: "admin", status: "Draft", stage: null, lastStep: 2 },
    { id: 2, name: "雙11 Lossback", code: "FB20260715022", distribution: "2026/08/28 10:00", expiry: "2026/09/28 10:00", createdBy: "admin", status: "In Review", stage: null },
    { id: 3, name: "Happy new year Lossback", code: "FB20260715023", distribution: "2026/08/28 10:00", expiry: "2026/09/28 10:00", createdBy: "admin", status: "Rejected", stage: null },
    { id: 4, name: "Euro Cup Lossback", code: "FB20260715024", distribution: "2026/08/28 10:00", expiry: "2026/09/28 10:00", createdBy: "admin", status: "Approved", stage: "Scheduled" },
    { id: 5, name: "Saba Lossback", code: "FB20260715025", distribution: "2026/08/28 10:00", expiry: "2026/09/28 10:00", createdBy: "admin", status: "Approved", stage: "Distributed" }
  ];

  var nextId = 6;
  var search = "";
  var statusFilter = new Set();
  var dateRange = { from: null, to: null };
  var openMenu = null;
  var confirmAction = null;

  var $ = function (role, scope) {
    return (scope || document).querySelector('[data-role="' + role + '"]');
  };

  var confirmDialog = $("confirm-dialog");

  /* ---------- Toasts -------------------------------------------------------- */
  function toast(options) {
    var node = document.createElement("div");
    node.className = "toast-alert toast-alert--" + (options.kind || "success");

    var icon = document.createElement("span");
    icon.className = "icon toast-alert__icon icon--" +
      (options.kind === "notice" ? "attention-circle" : "check-circle");
    icon.setAttribute("aria-hidden", "true");

    var content = document.createElement("div");
    content.className = "toast-alert__content";
    var title = document.createElement("p");
    title.className = "toast-alert__title";
    title.textContent = options.title;
    content.appendChild(title);
    if (options.text) {
      var body = document.createElement("p");
      body.textContent = options.text;
      content.appendChild(body);
    }

    /* toast-alert's `Icon + Content` row: the icon and the text travel
       together so the toast can centre them as one block. */
    var main = document.createElement("div");
    main.className = "toast-alert__main";
    main.appendChild(icon);
    main.appendChild(content);
    node.appendChild(main);

    if (options.action) {
      var action = document.createElement("button");
      action.type = "button";
      action.className = "button button--outline";
      action.textContent = options.action;
      action.addEventListener("click", function () {
        node.remove();
        if (options.onAction) options.onAction();
      });
      node.appendChild(action);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast-alert__close";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
    close.addEventListener("click", function () {
      node.remove();
    });
    /* The component's dismiss aligner — see .toast-alert__dismiss. */
    var dismiss = document.createElement("div");
    dismiss.className = "toast-alert__dismiss";
    dismiss.appendChild(close);
    node.appendChild(dismiss);

    $("toasts").appendChild(node);
    /* The UX sets 5s for the toast that carries an action, 3s for the rest. */
    setTimeout(function () {
      node.remove();
    }, options.duration || (options.action ? 5000 : 3000));
  }

  /* ---------- Confirmation --------------------------------------------------- */
  function confirmThen(options) {
    document.getElementById("confirm-title").textContent = options.title;
    $("confirm-text").textContent = options.text;
    $("confirm-ok").textContent = options.confirmLabel;
    /* The design's destructive confirm is a tinted button with a red label,
       not a solid red one. */
    $("confirm-ok").className = "button " +
      (options.destructive ? "button--destructive-soft" : "button--primary");
    /* Each alert carries a decorative icon that matches the action. */
    $("confirm-mark").className = "alert-dialog__mark" +
      (options.destructive ? " alert-dialog__mark--destructive" : "");
    $("confirm-icon").className = "icon icon--" + options.icon;
    confirmAction = options.onConfirm;
    confirmDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeConfirm() {
    confirmDialog.hidden = true;
    document.body.style.overflow = "";
    confirmAction = null;
  }

  $("confirm-cancel").addEventListener("click", closeConfirm);
  $("confirm-ok").addEventListener("click", function () {
    var run = confirmAction;
    closeConfirm();
    if (run) run();
  });

  /* ---------- Actions -------------------------------------------------------- */
  function primaryActionFor(row) {
    if (row.status === "Draft" || row.status === "Rejected") return "Edit";
    if (row.status === "In Review") return "Return to Draft";
    return row.stage === "Distributed" ? "Duplicate" : "Return to Draft";
  }

  function canDelete(row) {
    return row.status === "Draft" || row.status === "Rejected";
  }

  function canSubmit(row) {
    return row.status === "Draft" || row.status === "Rejected";
  }

  /* A row with nothing left to offer drops the ... trigger, which is how the
     design draws the distributed row: one full-width Duplicate button. */
  function hasMenu(row) {
    return menuActions(row).some(function (action) { return !action.separator; });
  }

  /* Draft returns to the step it was left on; every other route starts over. */
  function stepUrl(step) {
    return step && step > 1 ? "create-bonus-step" + step + ".html" : "create-bonus.html";
  }

  function edit(row) {
    window.location.href = stepUrl(row.status === "Draft" ? row.lastStep : 1);
  }

  /* A draft saved before the last step has not been filled in completely, which
     is the state the design draws with dashes for every unset required field. */
  function detailUrl(row) {
    var status = "distributed";
    if (row.status === "Draft") {
      status = row.lastStep && row.lastStep < 4 ? "draft-incomplete" : "draft";
    } else if (row.status === "In Review") {
      status = "in-review";
    } else if (row.status === "Rejected") {
      status = "rejected";
    } else if (row.status === "Approved") {
      status = row.stage === "Distributed" ? "distributed" : "approved";
    }
    var url = "detail.html?status=" + status;
    if (row.status === "Draft" && row.lastStep) url += "&step=" + row.lastStep;
    return url;
  }

  function view(row) {
    window.location.href = detailUrl(row);
  }

  function submitForApproval(row) {
    row.status = "In Review";
    row.stage = null;
    render();
    toast({ title: "Submitted for approval", text: row.name });
  }

  /* A copy starts as a Draft with its own id; the internal note and the three
     schedule dates are cleared, per the UX notes. */
  function duplicate(row) {
    var copy = {
      id: nextId++,
      name: row.name + " - Copy",
      code: "FB2026071" + (5030 + nextId),
      distribution: "",
      expiry: "",
      createdBy: "admin",
      status: "Draft",
      stage: null
    };
    rows.unshift(copy);
    render();
    toast({
      title: "Duplicated as Draft",
      text: copy.name,
      action: "Edit",
      onAction: function () {
        window.location.href = "create-bonus.html";
      },
      duration: 5000
    });
  }

  function remove(row) {
    confirmThen({
      title: "Delete Bonus Promotion?",
      icon: "trash",
      text: row.name + " (" + row.code + ") will be permanently deleted and cannot be restored.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: function () {
        rows = rows.filter(function (item) { return item.id !== row.id; });
        render();
        toast({ title: "Deleted", text: row.name });
      }
    });
  }

  /* In Review returns to draft immediately; an approved, scheduled promotion
     asks first because its schedule is cancelled. */
  function returnToDraft(row) {
    function apply() {
      row.status = "Draft";
      row.stage = null;
      render();
      toast({ title: "Returned to draft", text: row.name });
    }

    if (row.status === "In Review") {
      apply();
      return;
    }

    confirmThen({
      title: "Return Bonus Promotion to draft?",
      icon: "file-symlink",
      text: row.name + " (" + row.code + ") will return to draft. Its schedule will be canceled, and approval will be required again.",
      confirmLabel: "Return to Draft",
      onConfirm: apply
    });
  }

  function runPrimary(row) {
    var label = primaryActionFor(row);
    if (label === "Edit") edit(row);
    else if (label === "Duplicate") duplicate(row);
    else returnToDraft(row);
  }

  /* ---------- Rendering ------------------------------------------------------ */
  function statusTag(row) {
    var map = {
      Draft: "normal",
      "In Review": "warning",
      Rejected: "destructive",
      Approved: "success"
    };
    var tag = document.createElement("span");
    tag.className = "tag tag--" + map[row.status];
    tag.textContent = row.status;
    return tag;
  }

  function cell(className) {
    var node = document.createElement("div");
    node.className = "table__cell";
    node.setAttribute("role", "cell");
    if (className) node.classList.add(className);
    return node;
  }

  function line(className, text) {
    var node = document.createElement("p");
    node.className = className;
    node.textContent = text;
    return node;
  }

  /* "2026/08/28 10:00" -> a Date at midnight, so range ends stay inclusive. */
  function rowDate(row) {
    var match = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(row.distribution || "");
    return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
  }

  function inDateRange(row) {
    if (!dateRange.from && !dateRange.to) return true;
    var date = rowDate(row);
    if (!date) return false;
    if (dateRange.from && date < stripTime(dateRange.from)) return false;
    if (dateRange.to && date > stripTime(dateRange.to)) return false;
    return true;
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function hasFilters() {
    return Boolean(search.trim()) || statusFilter.size > 0 ||
      Boolean(dateRange.from) || Boolean(dateRange.to);
  }

  function visibleRows() {
    var query = search.trim().toLowerCase();
    return rows.filter(function (row) {
      if (query && (row.name + " " + row.code).toLowerCase().indexOf(query) === -1) return false;
      /* A row matches on its status or on its stage, so Approved still returns
         both stages while Scheduled and Distributed narrow to one. */
      if (statusFilter.size &&
          !statusFilter.has(row.status) &&
          !(row.stage && statusFilter.has(row.stage))) return false;
      if (!inDateRange(row)) return false;
      return true;
    });
  }

  function render() {
    var host = $("rows");
    host.innerHTML = "";
    var visible = visibleRows();

    syncReset();
    $("empty-none").hidden = rows.length > 0;
    $("empty-filtered").hidden = !(rows.length > 0 && visible.length === 0);

    visible.forEach(function (row) {
      var line1 = document.createElement("div");
      line1.className = "table__row";
      line1.setAttribute("role", "row");

      var nameCell = cell();
      var link = document.createElement("a");
      link.className = "cell-link";
      link.href = detailUrl(row);
      link.textContent = row.name;
      nameCell.appendChild(link);
      nameCell.appendChild(line("cell-id", row.code));

      var distributionCell = cell();
      distributionCell.appendChild(line("cell-date", row.distribution || "—"));
      if (row.stage) distributionCell.appendChild(line("cell-sub", row.stage));

      var expiryCell = cell();
      expiryCell.appendChild(line("cell-date", row.expiry || "—"));

      var createdCell = cell();
      createdCell.appendChild(line("cell-text", row.createdBy));

      var statusCell = cell();
      statusCell.appendChild(statusTag(row));
      if (row.status === "Rejected") {
        var reason = document.createElement("a");
        reason.className = "cell-link cell-link--mini";
        reason.href = detailUrl(row);
        reason.textContent = "View Reason";
        statusCell.appendChild(reason);
      }

      var reportsCell = cell();
      if (row.status === "Approved" && row.stage === "Distributed") {
        /* The first one is the Distribution Records page built from UX
           4606:32940; the other two are not designed yet. Note that this list's
           UX calls it "Distribution History" while the records page's own UX
           calls the same destination "Distribution Records". */
        [["Distribution History", "distribution-records.html"],
         ["Usage Report", "usage-report.html"],
         ["Performance Dashboard", null]].forEach(function (entry) {
          var report = document.createElement("a");
          report.className = "cell-link cell-link--mini";
          report.href = entry[1] || detailUrl(row);
          report.textContent = entry[0];
          reportsCell.appendChild(report);
        });
      } else {
        reportsCell.appendChild(line("cell-empty", "—"));
      }

      line1.appendChild(nameCell);
      line1.appendChild(distributionCell);
      line1.appendChild(expiryCell);
      line1.appendChild(createdCell);
      line1.appendChild(statusCell);
      line1.appendChild(reportsCell);
      line1.appendChild(actionsCell(row));

      host.appendChild(line1);
    });

    document.querySelector(".pager__count").textContent =
      visible.length ? "1–" + visible.length + " / " + visible.length : "0 / 0";
  }

  function actionsCell(row) {
    var wrap = cell();
    var actions = document.createElement("div");
    actions.className = "row-actions";

    var group = document.createElement("div");
    group.className = "button-group";

    var primary = document.createElement("button");
    primary.type = "button";
    primary.className = "button-group__button" + (hasMenu(row) ? "" : " button-group__button--only");
    primary.textContent = primaryActionFor(row);
    primary.addEventListener("click", function () {
      runPrimary(row);
    });
    group.appendChild(primary);

    if (hasMenu(row)) {
      var more = document.createElement("button");
      more.type = "button";
      more.className = "button-group__icon";
      more.setAttribute("aria-label", "More actions");
      more.setAttribute("aria-haspopup", "menu");
      more.innerHTML = '<span class="icon icon--ellipsis" aria-hidden="true"></span>';
      group.appendChild(more);

      var menu = buildMenu(row);
      actions.appendChild(group);
      actions.appendChild(menu);

      more.addEventListener("click", function (event) {
        event.stopPropagation();
        var opening = menu.hidden;
        closeMenus();
        menu.hidden = !opening;
        openMenu = opening ? menu : null;
        if (opening) positionMenu(menu, more);
      });
    } else {
      actions.appendChild(group);
    }

    wrap.appendChild(actions);
    return wrap;
  }

  /* The UI file draws exactly two menus: Duplicate + Delete on a draft row, and
     Duplicate alone on an approved one. Nothing else belongs here — View is the
     promotion-name link, and Activity Log and Submit for Approval are buttons on
     the detail page. */
  function menuActions(row) {
    var actions = [];
    if (primaryActionFor(row) !== "Duplicate") {
      actions.push({ icon: "copy", label: "Duplicate", run: duplicate });
    }
    if (canDelete(row)) {
      actions.push({ separator: true });
      actions.push({ icon: "trash", label: "Delete", destructive: true, run: remove });
    }
    return actions;
  }

  function buildMenu(row) {
    var menu = document.createElement("div");
    menu.className = "menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    var section = document.createElement("div");
    section.className = "menu__section";

    menuActions(row).forEach(function (action) {
      if (action.separator) {
        var rule = document.createElement("div");
        rule.className = "menu__separator";
        section.appendChild(rule);
        return;
      }
      section.appendChild(menuItem(action.icon, action.label, Boolean(action.destructive), function () {
        action.run(row);
      }));
    });

    menu.appendChild(section);
    menu.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
    });
    return menu;
  }

  function menuItem(icon, label, destructive, onClick) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "menu__item" + (destructive ? " menu__item--destructive" : "");
    item.setAttribute("role", "menuitem");
    item.innerHTML =
      '<span class="menu__decoration">' +
      (icon ? '<span class="icon icon--' + icon + '" aria-hidden="true"></span>' : "") +
      "</span><span>" + label + "</span>";
    item.addEventListener("click", onClick);
    return item;
  }

  /* Anchored under the trigger, nudged back on screen when it would overflow. */
  function positionMenu(menu, trigger) {
    var rect = trigger.getBoundingClientRect();
    var width = menu.offsetWidth;
    var left = Math.min(rect.right - width, document.documentElement.clientWidth - width - 8);
    menu.style.top = rect.bottom + 4 + "px";
    menu.style.left = Math.max(8, left) + "px";
  }

  function closeMenus() {
    document.querySelectorAll(".menu").forEach(function (menu) {
      menu.hidden = true;
    });
    openMenu = null;
  }

  /* ---------- Filters --------------------------------------------------------- */
  document.getElementById("promotion-name").addEventListener("input", function (event) {
    search = event.target.value;
    render();
  });

  var statusPanel = $("status-panel");
  var statusTrigger = $("status-trigger");

  function renderStatusValue() {
    var host = $("status-value");
    host.innerHTML = "";

    if (!statusFilter.size) {
      var placeholder = document.createElement("span");
      placeholder.className = "select__placeholder";
      placeholder.textContent = "Select";
      host.appendChild(placeholder);
      return;
    }

    if (statusFilter.size === STATUSES.length) {
      host.appendChild(document.createTextNode("All statuses"));
      return;
    }

    var selected = STATUSES.filter(function (name) { return statusFilter.has(name); });

    selected.slice(0, 2).forEach(function (name) {
      var tag = document.createElement("span");
      tag.className = "tag tag--normal select__tag";
      tag.appendChild(document.createTextNode(name));

      var remove = document.createElement("span");
      remove.className = "select__tag-remove";
      remove.setAttribute("role", "button");
      remove.setAttribute("aria-label", "Remove " + name);
      remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
      remove.addEventListener("click", function (event) {
        event.stopPropagation();
        statusFilter.delete(name);
        renderStatusValue();
        renderStatusPanel();
        render();
      });
      tag.appendChild(remove);
      host.appendChild(tag);
    });

    if (selected.length > 2) {
      var overflow = document.createElement("span");
      overflow.className = "select__overflow";
      overflow.textContent = "+" + (selected.length - 2);
      host.appendChild(overflow);
    }
  }

  function renderStatusPanel() {
    statusPanel.innerHTML = "";

    function option(name) {
      var node = document.createElement("label");
      node.className = "filter-select__option";
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = statusFilter.has(name);
      box.addEventListener("change", function () {
        if (box.checked) statusFilter.add(name);
        else statusFilter.delete(name);
        renderStatusValue();
        renderStatusPanel();
        render();
      });
      node.appendChild(box);
      node.appendChild(document.createTextNode(name));
      return node;
    }

    STATUS_TREE.forEach(function (entry) {
      statusPanel.appendChild(option(entry.name));
      if (!entry.children) return;
      /* The kit indents the sub-states in their own container rather than
         padding each row, so their checkboxes line up with each other. */
      var sub = document.createElement("div");
      sub.className = "filter-select__sub";
      entry.children.forEach(function (child) { sub.appendChild(option(child)); });
      statusPanel.appendChild(sub);
    });

    /* Dropdown Menu - Nova as the kit draws it for a filter (4171:50293): a
       separator, the count, and a Ghost Small Clear that is disabled until
       something is selected. */
    var footer = document.createElement("div");
    footer.className = "filter-select__footer";
    var count = document.createElement("span");
    count.className = "filter-select__count";
    var number = document.createElement("b");
    number.textContent = String(statusFilter.size);
    var label = document.createElement("span");
    label.textContent = "selected";
    count.appendChild(number);
    count.appendChild(label);
    footer.appendChild(count);

    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button button--ghost button--small";
    clear.textContent = "Clear";
    clear.disabled = statusFilter.size === 0;
    clear.addEventListener("click", function () {
      statusFilter.clear();
      renderStatusValue();
      renderStatusPanel();
      render();
    });
    footer.appendChild(clear);
    statusPanel.appendChild(footer);
  }

  statusTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    var opening = statusPanel.hidden;
    closeMenus();
    statusPanel.hidden = !opening;
    statusTrigger.setAttribute("aria-expanded", String(opening));
    if (opening) renderStatusPanel();
  });

  statusPanel.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  var resetButton = document.querySelector(".filter-card__reset");

  /* The UX disables Reset until something is actually filtered. */
  function syncReset() {
    resetButton.disabled = !hasFilters();
  }

  resetButton.addEventListener("click", function () {
    search = "";
    document.getElementById("promotion-name").value = "";
    statusFilter.clear();
    dateRange = { from: null, to: null };
    var pickerRoot = document.querySelector("[data-date-range-picker]");
    if (pickerRoot && pickerRoot.rangePicker) pickerRoot.rangePicker.clear();
    renderStatusValue();
    render();
    document.dispatchEvent(new CustomEvent("filters:reset"));
  });

  var pickerRoot = document.querySelector("[data-date-range-picker]");
  if (pickerRoot) {
    pickerRoot.addEventListener("rangechange", function (event) {
      dateRange = { from: event.detail.from, to: event.detail.to };
      render();
    });
  }

  document.addEventListener("click", function () {
    closeMenus();
    statusPanel.hidden = true;
    statusTrigger.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeMenus();
    statusPanel.hidden = true;
    if (!confirmDialog.hidden) closeConfirm();
  });

  renderStatusValue();
  render();
})();
