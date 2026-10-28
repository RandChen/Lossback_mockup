(function () {
  "use strict";

  /* Create Bonus — Step 1 (General).

     2026-10-27 Lossback requirements (Basic setup, shared):
       · Who join the campaign — scoped by the signed-in role, Site ID shown
       · User Group — one per joining Main Site / Subsidiary (js/user-group.js)
       · Campaign Internal Name
       · per language: Campaign External Name, Banner (Desktop + Mobile, both
         optional), T&C
       · Promotion page: Display Order (1–99) and Display Start / End Time

     Values marked ASSUMPTION below are prototype defaults the spec has not
     fixed yet; change them here when it does. */

  /* Order is the spec's locale order (En -> Cs -> Id -> Th -> Vn -> Jp -> Ko);
     the character advice differs per language (CJK 12, latin/thai 24).
     The dialog lists each language under its own name, while the block it adds
     is labelled in English — that is how the wireframe draws the two. */
  var ENGLISH = { id: "en", native: "English", label: "English", limit: 24 };
  var LANGUAGES = [
    { id: "zh-CN", native: "简体中文", label: "Chinese (Simplified)", limit: 12 },
    { id: "id-ID", native: "Bahasa Indonesia", label: "Indonesia", limit: 24 },
    { id: "th-TH", native: "ไทย", label: "Thai", limit: 24 },
    { id: "vi-VN", native: "Tiếng Việt", label: "Vietnamese", limit: 24 },
    { id: "ja-JP", native: "日本語", label: "Japanese", limit: 12 },
    { id: "ko-KR", native: "한국어", label: "Korean", limit: 12 }
  ];

  /* ASSUMPTION: banner file rules (suggested, not in the spec): JPG or PNG;
     Desktop 1200 × 400 px (3:1) up to 2 MB; Mobile 750 × 400 px up to 1 MB.
     Only type and size are enforced here; the pixel size is guidance. */
  var BANNER = {
    types: ["image/jpeg", "image/png"],
    accept: ".jpg,.jpeg,.png",
    kinds: {
      desktop: { label: "Desktop Banner", maxBytes: 2 * 1024 * 1024, maxText: "2 MB", size: "1200 × 400 px (3:1)" },
      mobile: { label: "Mobile Banner", maxBytes: 1 * 1024 * 1024, maxText: "1 MB", size: "750 × 400 px" }
    }
  };
  var BANNER_KINDS = ["desktop", "mobile"];

  var ORDER_MIN = 1;
  var ORDER_MAX = 99;

  /* The app's clock is fixed, the same day the top bar shows. */
  var TODAY = (window.StaleCheck && window.StaleCheck.TODAY) || "2026/07/27";

  /* Names already taken, so the duplicate-name state can be demonstrated. The
     spec counts "A123", "a123" and a name with a stray space as different, so
     this compares exactly. */
  var EXISTING_NAMES = ["World Cup Free Bet"];

  var MESSAGES = {
    required: "This field is required.",
    duplicate: "This campaign name already exists. Enter a different name.",
    participants: "Select at least one site.",
    order: "Enter a whole number from 1 to 99.",
    bannerType: "Upload a JPG or PNG image.",
    startPast: "Start time cannot be earlier than today.",
    endBeforeStart: "End time must be later than the start time."
  };

  var form = document.querySelector('[data-role="form"]');
  var participantsHost = document.querySelector('[data-role="participants"]');
  var participantsHint = document.querySelector('[data-role="participants-hint"]');
  var languageHost = document.querySelector('[data-role="language-fields"]');
  var openLanguages = document.querySelector('[data-role="open-languages"]');
  var languagesDialog = document.querySelector('[data-role="languages-dialog"]');
  var optionHost = document.querySelector('[data-role="language-options"]');
  var selectedCount = document.querySelector('[data-role="selected-count"]');
  var clearButton = document.querySelector('[data-role="clear-languages"]');
  var addButton = document.querySelector('[data-role="add-languages"]');
  var leaveDialog = document.querySelector('[data-role="leave-dialog"]');

  var added = [];          // languages added on top of English
  var pending = [];        // ticked in the dialog, not added yet
  var content = {};        // language id -> { name, bannerDesktop, bannerMobile, tnc }
  var previews = {};       // language id -> object URL (memory only)
  var participants = [];   // Site IDs
  var participantTerm = "";

  function isOneworks() {
    return Boolean(window.Role && window.Role.isOneworks());
  }

  function entry(id) {
    if (!content[id]) content[id] = { name: "", bannerDesktop: null, bannerMobile: null, tnc: "" };
    return content[id];
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    var node = el("span", "icon icon--" + name);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  /* ---------- Who join the campaign: scope -------------------------------- */
  /* What the signed-in account may pick, from the top bar's role + scope. */
  function scope() {
    if (window.Role && window.Role.scope) return window.Role.scope();
    return { kind: "main", site: { name: "Site-001", id: "LS1001" }, subsidiary: null, subs: [] };
  }

  /* Every option as { id, name, kind, parent } in display order. */
  function participantOptions() {
    var s = scope();
    var list = [];
    if (s.kind === "saba") {
      (window.Role ? window.Role.licensees() : []).forEach(function (site) {
        list.push({ id: site.id, name: site.name, kind: "Main Site", parent: null });
        site.subs.forEach(function (sub) {
          list.push({ id: sub.id, name: sub.name, kind: "Subsidiary", parent: site });
        });
      });
    } else if (s.kind === "main") {
      list.push({ id: s.site.id, name: s.site.name, kind: "Main Site", parent: null });
      s.subs.forEach(function (sub) {
        list.push({ id: sub.id, name: sub.name, kind: "Subsidiary", parent: s.site });
      });
    } else {
      list.push({ id: s.subsidiary.id, name: s.subsidiary.name, kind: "Subsidiary", parent: s.site });
    }
    return list;
  }

  /* Only one option means there is nothing to choose: it is fixed and shown
     read-only (a Subsidiary, or a Main Site without subsidiaries). */
  function isFixed() {
    return scope().kind !== "saba" && participantOptions().length === 1;
  }

  /* Drop picks the current scope cannot make, and fill the defaults:
     fixed scope -> itself; Main Site with subsidiaries -> itself (ASSUMPTION). */
  function syncParticipants() {
    var options = participantOptions();
    var allowed = options.map(function (o) { return o.id; });
    participants = participants.filter(function (id) { return allowed.indexOf(id) !== -1; });
    if (isFixed()) participants = [allowed[0]];
    else if (!participants.length && scope().kind === "main") participants = [allowed[0]];
  }

  /* The joining sites in display order, as the user-group blocks list them. */
  function groupSites() {
    return participantOptions().filter(function (o) {
      return participants.indexOf(o.id) !== -1;
    }).map(function (o) { return o.id; });
  }

  function refreshGroups() {
    if (!window.UserGroup) return;
    window.UserGroup.setOptions(participantOptions());
    window.UserGroup.render();
  }

  function hintText() {
    var s = scope();
    if (s.kind === "saba") return "SABA staff can create this campaign for one or more Licensees. Pick any Main Site, Subsidiary, or both.";
    if (s.kind === "main") {
      return s.subs.length
        ? "Create this campaign for your Main Site, your Subsidiaries, or both."
        : "This campaign is created for your site.";
    }
    return "A Subsidiary can only create campaigns for itself.";
  }

  function idTag(id) {
    return el("span", "participant__id", "Site ID: " + id);
  }

  function participantRow(option, readOnly) {
    /* Subsidiaries sit indented under their Main Site in a pick list. */
    var row = el(readOnly ? "div" : "label",
      "participant" + (readOnly ? " participant--static" : (option.kind === "Subsidiary" ? " participant--sub" : "")));

    if (!readOnly) {
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = "checkbox";
      box.value = option.id;
      box.checked = participants.indexOf(option.id) !== -1;
      box.addEventListener("change", function () {
        if (box.checked) {
          if (participants.indexOf(option.id) === -1) participants.push(option.id);
        } else {
          participants = participants.filter(function (id) { return id !== option.id; });
        }
        paintParticipantSummary();
        validateParticipants();
        refreshGroups();
        persist();
      });
      row.appendChild(box);
    }

    var text = el("span", "participant__text");
    var name = el("span", "participant__name", option.name);
    text.appendChild(name);
    /* A subsidiary's name repeats across sites, so a read-only one also
       says which site it belongs to. */
    if (readOnly && option.parent) {
      text.appendChild(el("span", "participant__parent", "under " + option.parent.name + " (" + option.parent.id + ")"));
    }
    row.appendChild(text);
    row.appendChild(el("span", "tag tag--normal participant__kind", option.kind));
    row.appendChild(idTag(option.id));
    return row;
  }

  var summaryNode = null;

  function paintParticipantSummary() {
    if (!summaryNode) return;
    summaryNode.querySelector("strong").textContent = String(participants.length);
    var clear = summaryNode.querySelector("button");
    if (clear) clear.disabled = participants.length === 0;
  }

  function renderParticipantList(listHost) {
    listHost.innerHTML = "";
    var options = participantOptions();
    var term = participantTerm.trim().toLowerCase();

    function hit(o) {
      return !term || o.name.toLowerCase().indexOf(term) !== -1 || o.id.toLowerCase().indexOf(term) !== -1;
    }

    /* A site that matches shows with all of its subsidiaries; a subsidiary that
       matches shows under its site, so it is never listed without context. */
    var shown = options.filter(function (o) {
      if (!term) return true;
      if (hit(o)) return true;
      if (o.parent) {
        return options.some(function (p) { return p.id === o.parent.id && hit(p); });
      }
      return options.some(function (c) { return c.parent && c.parent.id === o.id && hit(c); });
    });

    if (!shown.length) {
      listHost.appendChild(el("p", "participant-list__empty", "No results found."));
      return;
    }
    shown.forEach(function (o) {
      listHost.appendChild(participantRow(o, false));
    });
  }

  function renderParticipants() {
    syncParticipants();
    participantsHint.textContent = hintText();
    participantsHost.innerHTML = "";
    summaryNode = null;

    if (isFixed()) {
      var only = participantOptions()[0];
      var wrap = el("div", "participant-list participant-list--static");
      wrap.appendChild(participantRow(only, true));
      participantsHost.appendChild(wrap);
      return;
    }

    var picker = el("div", "participant-picker");

    /* Searching only earns its place when the list is long — SABA's view. */
    var listHost = el("div", "participant-list");
    if (scope().kind === "saba") {
      var search = el("div", "control participant-picker__search");
      search.appendChild(icon("search"));
      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search site name or Site ID";
      input.value = participantTerm;
      input.setAttribute("aria-label", "Search site name or Site ID");
      input.addEventListener("input", function (event) {
        event.stopPropagation();
        participantTerm = input.value;
        renderParticipantList(listHost);
      });
      search.appendChild(input);
      picker.appendChild(search);
    }

    renderParticipantList(listHost);
    picker.appendChild(listHost);

    summaryNode = el("div", "participant-picker__footer");
    var count = el("span", "selected-count");
    count.appendChild(el("strong", null, "0"));
    count.appendChild(document.createTextNode(" selected"));
    summaryNode.appendChild(count);
    var clear = el("button", "button button--ghost button--small", "Clear");
    clear.type = "button";
    clear.addEventListener("click", function () {
      participants = [];
      renderParticipantList(listHost);
      paintParticipantSummary();
      refreshGroups();
      persist();
    });
    summaryNode.appendChild(clear);
    picker.appendChild(summaryNode);

    participantsHost.appendChild(picker);
    paintParticipantSummary();
  }

  /* ---------- Shared draft ------------------------------------------------ */
  function bannerMeta(id, kind) {
    var banner = entry(id)[kind === "mobile" ? "bannerMobile" : "bannerDesktop"];
    return banner ? { name: banner.name, size: banner.size, type: banner.type } : null;
  }

  function persist() {
    var en = entry(ENGLISH.id);
    BonusDraft.write("general", {
      name: document.getElementById("promotion-name").value,
      role: isOneworks() ? "oneworks" : "licensee",
      participants: participants.slice(),
      /* One user group per joining site: { siteId: [{ memberId, siteId, currency, source }] }. */
      groups: window.UserGroup ? window.UserGroup.groups() : (BonusDraft.read().general.groups || {}),
      /* The design dropped Licensee PT from the wizard — Free Bet is always
         fully covered — but Bonus Detail still lists it, so the draft keeps
         carrying the fixed value for whatever reads it downstream. */
      licenseePt: "100",
      english: en.name,
      englishBannerDesktop: bannerMeta(ENGLISH.id, "desktop"),
      englishBannerMobile: bannerMeta(ENGLISH.id, "mobile"),
      englishTnc: en.tnc,
      languages: added.map(function (language) {
        var item = entry(language.id);
        return {
          id: language.id,
          native: language.native,
          label: language.label,
          limit: language.limit,
          value: item.name,
          bannerDesktop: bannerMeta(language.id, "desktop"),
          bannerMobile: bannerMeta(language.id, "mobile"),
          tnc: item.tnc
        };
      }),
      note: document.getElementById("note").value,
      promoOrder: document.getElementById("promo-order").value,
      promoStartDate: document.getElementById("promo-start-date").value,
      promoStartTime: document.getElementById("promo-start-time").value,
      promoEndDate: document.getElementById("promo-end-date").value,
      promoEndTime: document.getElementById("promo-end-time").value
    });
  }

  function restore() {
    var saved = BonusDraft.read().general;
    document.getElementById("promotion-name").value = saved.name || "";
    document.getElementById("note").value = saved.note || "";
    document.getElementById("promo-order").value = saved.promoOrder || "";
    document.getElementById("promo-start-date").value = saved.promoStartDate || "";
    document.getElementById("promo-start-time").value = saved.promoStartTime || "";
    document.getElementById("promo-end-date").value = saved.promoEndDate || "";
    document.getElementById("promo-end-time").value = saved.promoEndTime || "";
    participants = (saved.participants || []).slice();

    content[ENGLISH.id] = {
      name: saved.english || "",
      bannerDesktop: saved.englishBannerDesktop || null,
      bannerMobile: saved.englishBannerMobile || null,
      tnc: saved.englishTnc || ""
    };
    added = (saved.languages || []).map(function (language) {
      content[language.id] = {
        name: language.value || "",
        bannerDesktop: language.bannerDesktop || null,
        bannerMobile: language.bannerMobile || null,
        tnc: language.tnc || ""
      };
      return {
        id: language.id,
        native: language.native,
        label: language.label || language.native,
        limit: language.limit
      };
    });
  }

  /* ---------- Field helpers ---------------------------------------------- */
  /* The Field's Error variant adds a message line under the control; the
     description above it stays put, so the two are separate elements. */
  function errorNode(field) {
    var node = field.querySelector(":scope > .field__error");
    if (!node) {
      node = document.createElement("p");
      node.className = "field__error";
      node.hidden = true;
      field.appendChild(node);
    }
    return node;
  }

  function setError(field, text) {
    var node = errorNode(field);
    field.classList.add("field--invalid");
    node.textContent = text;
    node.hidden = false;
    return false;
  }

  function clearError(field) {
    field.classList.remove("field--invalid");
    errorNode(field).hidden = true;
    return true;
  }

  function fieldOf(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  /* ---------- Validation (runs on blur, per the UX notes) ----------------- */
  function validateParticipants() {
    var field = fieldOf("participants");
    if (!participants.length) return setError(field, MESSAGES.participants);
    return clearError(field);
  }

  function validateName() {
    var field = fieldOf("promotion-name");
    var value = document.getElementById("promotion-name").value;
    if (!value.trim()) return setError(field, MESSAGES.required);
    if (EXISTING_NAMES.indexOf(value) !== -1) return setError(field, MESSAGES.duplicate);
    return clearError(field);
  }

  function validateExternal(id) {
    var field = fieldOf("display-" + id);
    if (!field) return true;
    if (!entry(id).name.trim()) return setError(field, MESSAGES.required);
    return clearError(field);
  }

  function validateTnc(id) {
    var field = fieldOf("tnc-" + id);
    if (!field) return true;
    if (!entry(id).tnc.trim()) return setError(field, MESSAGES.required);
    return clearError(field);
  }

  function allLanguages() {
    return [ENGLISH].concat(added);
  }

  function validateContent() {
    var ok = true;
    allLanguages().forEach(function (language) {
      var a = validateExternal(language.id);
      var c = validateTnc(language.id);
      ok = ok && a && c;
    });
    return ok;
  }

  function validateOrder() {
    var field = fieldOf("promo-order");
    var value = document.getElementById("promo-order").value.trim();
    if (!value) return setError(field, MESSAGES.required);
    if (!/^\d{1,2}$/.test(value) || Number(value) < ORDER_MIN || Number(value) > ORDER_MAX) {
      return setError(field, MESSAGES.order);
    }
    return clearError(field);
  }

  function stamp(prefix) {
    var date = document.getElementById(prefix + "-date").value.trim();
    var time = document.getElementById(prefix + "-time").value.trim();
    return { date: date, time: time, full: date && time ? date + " " + time : "" };
  }

  function validateStart() {
    var field = fieldOf("promo-start");
    var start = stamp("promo-start");
    if (!start.full) return setError(field, MESSAGES.required);
    if (start.date < TODAY) return setError(field, MESSAGES.startPast);
    return clearError(field);
  }

  function validateEnd() {
    var field = fieldOf("promo-end");
    var start = stamp("promo-start");
    var end = stamp("promo-end");
    if (!end.full) return setError(field, MESSAGES.required);
    if (start.full && end.full <= start.full) return setError(field, MESSAGES.endBeforeStart);
    return clearError(field);
  }

  /* The calendar cannot offer days before the start, nor the start before today. */
  function syncDateLimits() {
    document.getElementById("promo-start-date").dataset.minDate = TODAY;
    var startDate = document.getElementById("promo-start-date").value.trim();
    document.getElementById("promo-end-date").dataset.minDate = startDate && startDate > TODAY ? startDate : TODAY;
  }

  function validateAll() {
    var checks = [
      validateParticipants(),
      window.UserGroup ? window.UserGroup.validate() : true,
      validateName(),
      validateContent(),
      validateOrder(),
      validateStart(),
      validateEnd()
    ];
    return checks.indexOf(false) === -1;
  }

  function focusFirstInvalid() {
    var field = form.querySelector(".field--invalid") || (window.UserGroup && window.UserGroup.firstInvalid());
    if (!field) return;
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    var target = field.querySelector("input:not([type=file]):not([readonly]), textarea, button, input[type=checkbox]");
    if (target) target.focus({ preventScroll: true });
  }

  document.getElementById("promotion-name").addEventListener("blur", validateName);
  document.getElementById("promo-order").addEventListener("blur", validateOrder);
  /* Only digits go in; the range is checked on blur. */
  document.getElementById("promo-order").addEventListener("input", function (event) {
    var input = event.target;
    var digits = input.value.replace(/\D+/g, "").slice(0, 2);
    if (digits !== input.value) input.value = digits;
  });
  /* The picker commits with input + change + blur on the input itself. */
  ["promo-start-date", "promo-start-time"].forEach(function (id) {
    document.getElementById(id).addEventListener("blur", function () {
      syncDateLimits();
      var start = stamp("promo-start");
      if (start.date && start.time) validateStart();
      var end = stamp("promo-end");
      if (end.full) validateEnd();
      persist();
    });
  });
  ["promo-end-date", "promo-end-time"].forEach(function (id) {
    document.getElementById(id).addEventListener("blur", function () {
      var end = stamp("promo-end");
      if (end.date && end.time) validateEnd();
      persist();
    });
  });

  /* ---------- Role switch ------------------------------------------------- */
  /* The role and the scope decide who the campaign can be created for, so a
     switch redraws the picker and drops picks the new scope cannot make. */
  if (window.Role) {
    window.Role.onChange(function () {
      participantTerm = "";
      renderParticipants();
      refreshGroups();
      if (fieldOf("participants").classList.contains("field--invalid")) validateParticipants();
      persist();
    });
  }

  /* ---------- Language blocks --------------------------------------------- */
  function labelNode(forId, text, required) {
    var label = el(forId ? "label" : "span", "field__label", text);
    if (forId) label.setAttribute("for", forId);
    if (required) {
      var mark = el("span", "field__required", "*");
      mark.setAttribute("aria-hidden", "true");
      label.appendChild(mark);
    }
    return label;
  }

  function bannerKey(kind) { return kind === "mobile" ? "bannerMobile" : "bannerDesktop"; }

  function renderBanner(language, host, kind) {
    var id = language.id;
    var item = entry(id);
    var spec = BANNER.kinds[kind];
    var key = bannerKey(kind);
    var fieldName = "banner-" + kind + "-" + id;
    var previewKey = kind + ":" + id;
    host.innerHTML = "";

    var file = document.createElement("input");
    file.type = "file";
    file.accept = BANNER.accept;
    file.id = fieldName;
    file.hidden = true;
    file.addEventListener("change", function () {
      var picked = file.files && file.files[0];
      if (!picked) return;
      var field = fieldOf(fieldName);
      if (BANNER.types.indexOf(picked.type) === -1) {
        setError(field, MESSAGES.bannerType);
        file.value = "";
        return;
      }
      if (picked.size > spec.maxBytes) {
        setError(field, "The image must be " + spec.maxText + " or smaller.");
        file.value = "";
        return;
      }
      if (previews[previewKey]) URL.revokeObjectURL(previews[previewKey]);
      previews[previewKey] = URL.createObjectURL(picked);
      item[key] = { name: picked.name, size: picked.size, type: picked.type };
      renderBanner(language, host, kind);
      clearError(field);
      persist();
    });
    host.appendChild(file);

    if (!item[key]) {
      var upload = el("button", "button button--outline button--small banner-upload__button");
      upload.type = "button";
      upload.appendChild(icon("upload"));
      upload.appendChild(document.createTextNode("Upload " + spec.label));
      upload.setAttribute("aria-label", "Upload " + spec.label.toLowerCase() + " for " + language.label);
      upload.addEventListener("click", function () { file.click(); });
      host.appendChild(upload);
      return;
    }

    var card = el("div", "banner-file");
    var thumb = el("div", "banner-file__thumb");
    if (previews[previewKey]) {
      var img = document.createElement("img");
      img.src = previews[previewKey];
      img.alt = spec.label + " preview for " + language.label;
      thumb.appendChild(img);
    } else {
      /* Restored from the draft: only the file details were kept. */
      thumb.appendChild(icon("file-check"));
    }
    card.appendChild(thumb);

    var meta = el("div", "banner-file__meta");
    meta.appendChild(el("span", "banner-file__name", item[key].name));
    meta.appendChild(el("span", "banner-file__size", formatSize(item[key].size)));
    card.appendChild(meta);

    var replace = el("button", "button button--ghost button--small", "Replace");
    replace.type = "button";
    replace.addEventListener("click", function () { file.click(); });
    card.appendChild(replace);

    var remove = el("button", "field__remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + spec.label.toLowerCase() + " for " + language.label);
    remove.appendChild(icon("x"));
    remove.addEventListener("click", function () {
      if (previews[previewKey]) URL.revokeObjectURL(previews[previewKey]);
      delete previews[previewKey];
      item[key] = null;
      renderBanner(language, host, kind);
      persist();
    });
    card.appendChild(remove);

    host.appendChild(card);
  }

  function languageBlock(language, removable) {
    var id = language.id;
    var item = entry(id);
    var block = el("div", "lang-block");
    block.dataset.lang = id;

    var head = el("div", "lang-block__head");
    head.appendChild(el("h3", "lang-block__title", language.label));
    if (removable) {
      var remove = el("button", "field__remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + language.label);
      remove.appendChild(icon("x"));
      remove.addEventListener("click", function () {
        added = added.filter(function (other) { return other.id !== id; });
        /* Re-adding a language starts from a blank block, per the UX notes. */
        delete content[id];
        BANNER_KINDS.forEach(function (kind) {
          var pk = kind + ":" + id;
          if (previews[pk]) URL.revokeObjectURL(previews[pk]);
          delete previews[pk];
        });
        renderLanguageFields();
        syncOpenButton();
        persist();
      });
      head.appendChild(remove);
    }
    block.appendChild(head);

    /* Campaign External Name */
    var nameField = el("div", "field");
    nameField.dataset.field = "display-" + id;
    nameField.appendChild(labelNode("display-" + id, "Campaign External Name", true));
    var control = el("div", "control");
    var input = document.createElement("input");
    input.type = "text";
    input.id = "display-" + id;
    input.value = item.name;
    input.addEventListener("input", function () { item.name = input.value; persist(); });
    input.addEventListener("blur", function () { validateExternal(id); });
    control.appendChild(input);
    nameField.appendChild(control);
    nameField.appendChild(el("p", "field__message", "Recommended: up to " + language.limit + " characters"));
    block.appendChild(nameField);

    /* Banner: one for Desktop, one for Mobile; both optional. */
    var pair = el("div", "banner-pair");
    BANNER_KINDS.forEach(function (kind) {
      var spec = BANNER.kinds[kind];
      var bannerField = el("div", "field");
      bannerField.dataset.field = "banner-" + kind + "-" + id;
      bannerField.appendChild(labelNode(null, spec.label, false));
      bannerField.appendChild(el("p", "field__description",
        "Optional. JPG or PNG, up to " + spec.maxText + ". Recommended size: " + spec.size + "."));
      var bannerHost = el("div", "banner-upload");
      bannerField.appendChild(bannerHost);
      renderBanner(language, bannerHost, kind);
      pair.appendChild(bannerField);
    });
    block.appendChild(pair);

    /* T&C */
    var tncField = el("div", "field");
    tncField.dataset.field = "tnc-" + id;
    tncField.appendChild(labelNode("tnc-" + id, "T&C", true));
    var textarea = el("textarea", "textarea lang-block__tnc");
    textarea.id = "tnc-" + id;
    textarea.placeholder = "Enter the terms and conditions shown to players";
    textarea.value = item.tnc;
    textarea.addEventListener("input", function () { item.tnc = textarea.value; persist(); });
    textarea.addEventListener("blur", function () { validateTnc(id); });
    tncField.appendChild(textarea);
    block.appendChild(tncField);

    return block;
  }

  function renderLanguageFields() {
    languageHost.innerHTML = "";
    languageHost.appendChild(languageBlock(ENGLISH, false));
    added.forEach(function (language) {
      languageHost.appendChild(languageBlock(language, true));
    });
  }

  function syncOpenButton() {
    openLanguages.disabled = added.length === LANGUAGES.length;
  }

  /* ---------- Select Languages dialog ------------------------------------- */
  function availableLanguages() {
    return LANGUAGES.filter(function (language) {
      return !added.some(function (item) { return item.id === language.id; });
    });
  }

  function syncDialogFooter() {
    selectedCount.textContent = String(pending.length);
    clearButton.disabled = pending.length === 0;
    addButton.disabled = pending.length === 0;
  }

  function renderOptions() {
    optionHost.innerHTML = "";
    var available = availableLanguages();

    if (!available.length) {
      optionHost.appendChild(el("p", "option-list__empty", "All languages have been added."));
      return;
    }

    available.forEach(function (language) {
      var option = el("label", "option");
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = language.id;
      checkbox.checked = pending.indexOf(language.id) !== -1;
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) pending.push(language.id);
        else pending = pending.filter(function (id) { return id !== language.id; });
        syncDialogFooter();
      });
      option.appendChild(checkbox);
      option.appendChild(el("span", null, language.native));
      optionHost.appendChild(option);
    });
  }

  function openLanguagesDialog() {
    pending = [];
    renderOptions();
    syncDialogFooter();
    languagesDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* Closing always discards the pending ticks — nothing is added. */
  function closeLanguagesDialog() {
    languagesDialog.hidden = true;
    document.body.style.overflow = "";
    openLanguages.focus();
  }

  openLanguages.addEventListener("click", openLanguagesDialog);
  document.querySelector('[data-role="close-languages"]').addEventListener("click", closeLanguagesDialog);

  clearButton.addEventListener("click", function () {
    pending = [];
    renderOptions();
    syncDialogFooter();
  });

  /* Added languages keep the option order, not the order they were ticked,
     and are appended after the ones already on the form. */
  addButton.addEventListener("click", function () {
    LANGUAGES.forEach(function (language) {
      if (pending.indexOf(language.id) !== -1) added.push(language);
    });
    renderLanguageFields();
    syncOpenButton();
    closeLanguagesDialog();
    persist();
  });

  /* ---------- Leave confirmation ------------------------------------------ */
  /* Both the back link and Cancel raise it, per the wireframe's two notes. */
  function openLeaveDialog(event) {
    if (event) event.preventDefault();
    leaveDialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  document.querySelector('[data-role="cancel"]').addEventListener("click", openLeaveDialog);
  document.querySelector('[data-role="back-link"]').addEventListener("click", openLeaveDialog);

  document.querySelector('[data-role="keep-editing"]').addEventListener("click", function () {
    leaveDialog.hidden = true;
    document.body.style.overflow = "";
  });

  document.querySelector('[data-role="leave"]').addEventListener("click", function () {
    window.location.href = "index.html";
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!languagesDialog.hidden) closeLanguagesDialog();
    else if (!leaveDialog.hidden) {
      leaveDialog.hidden = true;
      document.body.style.overflow = "";
    }
  });

  /* ---------- Footer actions ---------------------------------------------- */
  document.querySelector('[data-role="next"]').addEventListener("click", function () {
    if (validateAll()) {
      persist();
      window.location.href = "create-bonus-step2.html";
      return;
    }
    focusFirstInvalid();
  });

  document.querySelector('[data-role="save-draft"]').addEventListener("click", function () {
    validateAll();
    persist();
  });

  restore();
  renderParticipants();
  window.UserGroup.init({
    host: document.querySelector('[data-role="user-groups"]'),
    sites: groupSites,
    groups: BonusDraft.read().general.groups || {},
    onChange: function () { persist(); }
  });
  window.UserGroup.setOptions(participantOptions());
  window.UserGroup.render();
  renderLanguageFields();
  syncOpenButton();
  syncDateLimits();
  DateTimePicker.init(form);
  persist();

  /* A draft can go stale while it sits: the name may have been taken and the
     distribution date may have passed. The one that belongs to this step shows
     on its own field, the other in the message at the top (UX 4712:38844). */
  if (StaleCheck.forStep(1).length) validateName();
  StaleCheck.render(1, function () {
    /* Going forward is the same promise as Next: this step must be valid first. */
    if (validateAll()) return true;
    focusFirstInvalid();
    return false;
  });

  /* Typed fields that are not handled above (name, note, display order). */
  form.addEventListener("input", function (event) {
    if (event.target.type === "file") return;
    persist();
  });
})();
