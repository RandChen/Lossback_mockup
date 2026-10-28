/* Who is signed in: Licensee or Oneworks.

   The UX gives the Oneworks build a wider scope than the Licensee one — it sees
   every site under an operator, so Distribution Records grows a Site Name column
   and filter, and the top bar carries the scope it is looking at
   (UX 5673:84525). Nothing in the prototype authenticates anybody, so the role
   is a switch in the top bar for looking at both builds.

   It lives in localStorage rather than the wizard draft because it has to hold
   across pages and reloads; the draft still gets a copy so Step 3's CSV
   template keeps following the role. */
(function (global) {
  "use strict";

  var KEY = "promotion-suite:role";
  var LISTENERS = [];

  function read() {
    try {
      return localStorage.getItem(KEY) === "oneworks" ? "oneworks" : "licensee";
    } catch (error) {
      return "licensee";
    }
  }

  var current = read();

  function isOneworks() { return current === "oneworks"; }

  function set(role) {
    current = role === "oneworks" ? "oneworks" : "licensee";
    try { localStorage.setItem(KEY, current); } catch (error) { /* private mode */ }
    /* Keep the wizard draft in step — Step 3 reads the role from there. */
    if (global.BonusDraft) {
      try {
        var general = global.BonusDraft.read().general;
        if (general && general.role !== current) {
          general.role = current;
          global.BonusDraft.write("general", general);
        }
      } catch (error) { /* no draft on this page */ }
    }
    normaliseScope();
    saveScope();
    paint();
    notify();
  }

  function onChange(fn) { LISTENERS.push(fn); }

  /* ---------- Top bar ------------------------------------------------------ */
  var chip = null, label = null, scope = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* Site and Subsidiary are the operator scope being looked at, not filters —
     the per-record Site Name filter lives on the table. UX 5507:36258:

       Oneworks            switches the Site, or one Subsidiary under it
       Licensee / White Label  switches only the Subsidiary; the Site is text
                               and the whole control is hidden when the site
                               has no subsidiaries

     Both pickers are single-select, both search their own options, and both
     pin one option to the top above a separator. */
  /* Site IDs are MOCK values (2026-10-26): the real Licensee Site ID format is
     not known yet. Subsidiary names repeat across sites, so the ID is what
     tells two "Subsidiary -01" apart. */
  function subsOf(siteId, count) {
    var list = [];
    for (var i = 1; i <= count; i++) {
      list.push({ name: "Subsidiary -" + (i < 10 ? "0" : "") + i, id: siteId + "-S0" + i });
    }
    return list;
  }
  var SITES = [
    { name: "SABA Sports", id: "SABA", pinned: true, subs: [] },
    { name: "Site-001", id: "LS1001", subs: subsOf("LS1001", 4) },
    { name: "Site-002", id: "LS1002", subs: subsOf("LS1002", 2) },
    { name: "Site-003", id: "LS1003", subs: [] },
    { name: "Site-004", id: "LS1004", subs: subsOf("LS1004", 3) }
  ];

  /* The scope is kept with the role so a page change or reload keeps looking
     at the same site. A Licensee never sits on SABA Sports (that is the
     Oneworks home), so it falls back to the first licensee site. */
  var SCOPE_KEY = "promotion-suite:scope";
  var LICENSEE_HOME = "Site-001";

  function readScope() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(SCOPE_KEY) || "null"); } catch (error) { saved = null; }
    var state = { site: current === "oneworks" ? "SABA Sports" : LICENSEE_HOME, sub: "" };
    if (saved && typeof saved.site === "string") {
      state.site = saved.site;
      state.sub = typeof saved.sub === "string" ? saved.sub : "";
    }
    return state;
  }

  function saveScope() {
    try { localStorage.setItem(SCOPE_KEY, JSON.stringify(scopeState)); } catch (error) { /* private mode */ }
  }

  function notify() {
    LISTENERS.forEach(function (fn) { fn(current); });
  }

  var scopeState = readScope();

  function siteOf(name) {
    for (var i = 0; i < SITES.length; i++) if (SITES[i].name === name) return SITES[i];
    return SITES[0];
  }
  function hasSubs() { return siteOf(scopeState.site).subs.length > 0; }

  /* Keeps a Licensee off SABA Sports and drops a subsidiary that is not under
     the current site. */
  function normaliseScope() {
    if (current !== "oneworks" && siteOf(scopeState.site).pinned) {
      scopeState.site = LICENSEE_HOME;
      scopeState.sub = "";
    }
    var site = siteOf(scopeState.site);
    scopeState.site = site.name;
    if (scopeState.sub && !site.subs.some(function (s) { return s.name === scopeState.sub; })) {
      scopeState.sub = "";
    }
  }
  normaliseScope();

  /* Who the signed-in account acts as, for pages that care (Create Bonus Step 1):
       saba        Oneworks — SABA's own staff
       main        a Licensee on its Main Site
       subsidiary  a Licensee on one of its Subsidiaries */
  function scopeInfo() {
    var site = siteOf(scopeState.site);
    var sub = null;
    site.subs.forEach(function (s) { if (s.name === scopeState.sub) sub = s; });
    return {
      kind: current === "oneworks" ? "saba" : (sub ? "subsidiary" : "main"),
      site: { name: site.name, id: site.id },
      subsidiary: sub ? { name: sub.name, id: sub.id } : null,
      subs: site.subs.map(function (s) { return { name: s.name, id: s.id }; })
    };
  }

  /* Every licensee site and its subsidiaries — SABA Sports itself is not a
     licensee, so it is left out. */
  function licensees() {
    return SITES.filter(function (s) { return !s.pinned; }).map(function (s) {
      return {
        name: s.name,
        id: s.id,
        subs: s.subs.map(function (sub) { return { name: sub.name, id: sub.id }; })
      };
    });
  }

  function closeScopePanels(except) {
    var open = document.querySelectorAll('.scope-select__panel:not([hidden])');
    Array.prototype.forEach.call(open, function (panel) {
      if (panel !== except) {
        panel.hidden = true;
        var trigger = panel.previousElementSibling;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* One picker: a trigger that reads "{label} {value}", and a panel holding a
     search box, the pinned option, a separator and the rest. */
  function picker(labelText, opts) {
    var node = el("div", "scope-select");
    var trigger = el("button", "scope-select__trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.appendChild(el("span", "scope-select__label", labelText));
    var value = el("span", "scope-select__value");
    trigger.appendChild(value);
    var icon = el("span", "icon icon--chevron-down scope-select__icon");
    icon.setAttribute("aria-hidden", "true");
    trigger.appendChild(icon);
    node.appendChild(trigger);

    var panel = el("div", "scope-select__panel");
    panel.setAttribute("role", "listbox");
    panel.hidden = true;
    node.appendChild(panel);

    function render() {
      var state = opts.read();
      value.textContent = state.value;
      node.classList.toggle("scope-select--disabled", Boolean(state.disabled));
      node.classList.toggle("scope-select--static", Boolean(state.readonly));
      trigger.disabled = Boolean(state.disabled) || Boolean(state.readonly);

      panel.innerHTML = "";
      if (state.disabled || state.readonly) return;

      var search = el("div", "input scope-select__search");
      var sIcon = el("span", "icon icon--search");
      sIcon.setAttribute("aria-hidden", "true");
      search.appendChild(sIcon);
      var field = document.createElement("input");
      field.type = "text";
      field.placeholder = opts.searchLabel;
      search.appendChild(field);
      panel.appendChild(search);

      var list = el("div", "scope-select__options");
      panel.appendChild(list);

      function paintList(term) {
        list.innerHTML = "";
        var items = state.options.filter(function (o) {
          return !term || o.label.toLowerCase().indexOf(term.toLowerCase()) >= 0;
        });
        items.forEach(function (o, i) {
          /* the pinned option sits above a rule, separated from the rest */
          if (i > 0 && items[i - 1].pinned && !o.pinned) {
            list.appendChild(el("span", "scope-select__separator"));
          }
          var option = el("button", "scope-select__option");
          option.type = "button";
          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(o.value === state.selected));
          var mark = el("span", "icon icon--check scope-select__check");
          mark.setAttribute("aria-hidden", "true");
          option.appendChild(mark);
          option.appendChild(document.createTextNode(o.label));
          option.addEventListener("click", function () {
            opts.pick(o.value);
            closeScopePanels();
            saveScope();
            paintScope();
            /* the scope decides who a campaign can be created for */
            notify();
          });
          list.appendChild(option);
        });
        if (!items.length) list.appendChild(el("p", "scope-select__empty", "No results found."));
      }
      paintList("");
      field.addEventListener("input", function () { paintList(field.value); });
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var opening = panel.hidden;
      closeScopePanels(panel);
      panel.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
      if (opening) {
        var input = panel.querySelector("input");
        if (input) input.focus();
      }
    });
    panel.addEventListener("click", function (event) { event.stopPropagation(); });

    node.render = render;
    return node;
  }

  var sitePicker = null, subPicker = null;

  function buildScope() {
    var wrap = el("div", "scope-switcher");
    wrap.dataset.role = "scope-switcher";

    sitePicker = picker("Site:", {
      searchLabel: "Search site",
      read: function () {
        return {
          value: scopeState.site,
          selected: scopeState.site,
          /* a Licensee cannot move between sites, so the Site reads as text */
          readonly: !isOneworks(),
          options: SITES.map(function (s) {
            return { value: s.name, label: s.name, pinned: Boolean(s.pinned) };
          })
        };
      },
      pick: function (v) { scopeState.site = v; scopeState.sub = ""; }
    });
    wrap.appendChild(sitePicker);

    subPicker = picker("Subsidiary:", {
      searchLabel: "Search subsidiary",
      read: function () {
        var site = siteOf(scopeState.site);
        if (!site.subs.length) {
          return { value: "No subsidiaries", disabled: true, options: [] };
        }
        /* nothing picked means the Site itself, which the UX calls Main Site */
        return {
          value: scopeState.sub || "Main Site",
          selected: scopeState.sub || "__main",
          options: [{ value: "__main", label: "Main Site（" + site.name + "）", pinned: true }]
            .concat(site.subs.map(function (s) { return { value: s.name, label: s.name }; }))
        };
      },
      pick: function (v) { scopeState.sub = v === "__main" ? "" : v; }
    });
    wrap.appendChild(subPicker);

    wrap.appendChild(el("span", "topbar__divider"));
    return wrap;
  }

  function paintScope() {
    if (sitePicker) sitePicker.render();
    if (subPicker) subPicker.render();
    if (!scope) return;
    /* Licensee only has something to switch when the site has subsidiaries */
    scope.hidden = !isOneworks() && !hasSubs();
  }

  document.addEventListener("click", function () { closeScopePanels(); });

  function paint() {
    if (!chip) return;
    label.textContent = isOneworks() ? "Oneworks" : "Licensee";
    chip.title = "Demo only: switch the signed-in role";
    paintScope();
    document.documentElement.setAttribute("data-role-view", current);
  }

  function mount() {
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    chip = bar.querySelector(".chip");
    if (!chip) return;

    /* The pages ship the chip as a plain "Licensee" label; this takes it over
       so every page gets the same switch without editing eleven files. */
    chip.dataset.role = "role-toggle";
    chip.innerHTML = '<span class="icon icon--user" aria-hidden="true"></span>';
    label = el("span", "chip__label");
    label.dataset.role = "role-label";
    chip.appendChild(label);
    chip.addEventListener("click", function () {
      set(isOneworks() ? "licensee" : "oneworks");
    });

    var time = bar.querySelector(".topbar__time");
    scope = buildScope();
    if (time) bar.insertBefore(scope, time);
    else bar.insertBefore(scope, chip);

    paint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  global.Role = {
    get: function () { return current; },
    isOneworks: isOneworks,
    set: set,
    onChange: onChange,
    scope: scopeInfo,
    licensees: licensees
  };
})(window);
