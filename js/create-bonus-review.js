(function () {
  "use strict";

  /* Create Bonus — Step 3: Review (2026-10-26; was Step 4 before the wizard
     went from four steps to three). Lossback edition. Read-only rows reuse the Bonus Detail
     list styles. */

  var D = window.CampaignData;
  var $ = function (role) {
    return document.querySelector('[data-role="' + role + '"]');
  };
  var draft = BonusDraft.read();
  var general = draft.general;
  var settings = draft.settings;
  var EMPTY = "—";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fmt(n) {
    return Number(n).toLocaleString("en-US");
  }

  function showToast(title) {
    var node = el("div", "toast-alert toast-alert--success");
    var main = el("div", "toast-alert__main");
    var mark = el("span", "icon toast-alert__icon icon--check-circle");
    mark.setAttribute("aria-hidden", "true");
    var content = el("div", "toast-alert__content");
    content.appendChild(el("p", "toast-alert__title", title));
    main.appendChild(mark);
    main.appendChild(content);
    node.appendChild(main);
    var dismiss = el("div", "toast-alert__dismiss");
    var close = el("button", "toast-alert__close");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span>';
    close.addEventListener("click", function () { node.remove(); });
    dismiss.appendChild(close);
    node.appendChild(dismiss);
    $("toasts").appendChild(node);
    setTimeout(function () { node.remove(); }, 3000);
  }

  /* One label + one or more value lines, as Bonus Detail draws them. */
  function row(label, values, options) {
    var wrap = el("div", "list");
    wrap.appendChild(el("p", "list__label", label));
    var value = el("div", "list__value");
    var list = Array.isArray(values) ? values : [values];
    if (!list.length) list = [""];
    list.forEach(function (item) {
      if (item instanceof Node) {
        value.appendChild(item);
        return;
      }
      if (!item && options && options.optional) return;
      var line = el("p", options && options.note ? "note" : null, item || EMPTY);
      value.appendChild(line);
    });
    wrap.appendChild(value);
    return wrap;
  }

  function block(heading) {
    var node = el("section", "review-block");
    node.appendChild(el("h3", "card__subtitle", heading));
    var area = el("div", "list-area");
    node.appendChild(area);
    node.area = area;
    return node;
  }

  function dateTime(date, time) {
    if (!date && !time) return EMPTY;
    return [date, time].filter(Boolean).join(" ") + " (GMT-4)";
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

  /* ---------- General ------------------------------------------------------- */
  function renderGeneral() {
    var host = document.querySelector('[data-review="general"]');
    var sites = (general.participants || []).map(function (id) {
      return D.site(id).label + " (" + id + ")";
    });
    host.appendChild(row("Who Join the Campaign", sites));
    host.appendChild(row("Campaign Internal Name", general.name));
    host.appendChild(row("Bonus Promotion Note", general.note, { note: Boolean(general.note), optional: true }));
  }

  /* ---------- Content, one block per language ------------------------------- */
  function renderContent() {
    var host = document.querySelector('[data-review="content"]');
    var languages = [{
      label: "English", value: general.english, desktop: general.englishBannerDesktop,
      mobile: general.englishBannerMobile, tnc: general.englishTnc
    }].concat((general.languages || []).map(function (l) {
      return { label: l.label || l.native, value: l.value, desktop: l.bannerDesktop, mobile: l.bannerMobile, tnc: l.tnc };
    }));

    function file(banner) {
      return banner ? banner.name + " (" + Math.max(1, Math.round(banner.size / 1024)) + " KB)" : "";
    }

    languages.forEach(function (l) {
      var b = block(l.label);
      b.area.appendChild(row("Campaign External Name", l.value));
      /* Only the file details survive the draft; the image itself is not kept. */
      b.area.appendChild(row("Desktop Banner", file(l.desktop)));
      b.area.appendChild(row("Mobile Banner", file(l.mobile)));
      b.area.appendChild(row("T&C", l.tnc, { note: true }));
      host.appendChild(b);
    });
  }

  function renderPromo() {
    var host = document.querySelector('[data-review="promo"]');
    host.appendChild(row("Display Order", general.promoOrder));
    host.appendChild(row("Display Start Time", dateTime(general.promoStartDate, general.promoStartTime)));
    host.appendChild(row("Display End Time", dateTime(general.promoEndDate, general.promoEndTime)));
  }

  /* ---------- Campaign Settings --------------------------------------------- */
  function renderSettings() {
    var host = document.querySelector('[data-review="settings"]');
    /* ---- User groups, one per joining site (set in Step 1) ---- */
    var groups = general.groups || {};
    (general.participants || []).forEach(function (siteId) {
      var list = groups[siteId] || [];
      var group = block("User Group · " + D.site(siteId).label + " (" + siteId + ")");
      group.area.appendChild(row("Total Players", list.length ? fmt(list.length) : ""));
      var bySource = {};
      list.forEach(function (m) { bySource[m.source] = (bySource[m.source] || 0) + 1; });
      group.area.appendChild(row("Sources", Object.keys(bySource).map(function (k) {
        return k + " — " + fmt(bySource[k]);
      })));
      if (list.length) {
        var name = (general.name || "campaign").replace(/\s+/g, "_") + "_" + siteId + "_user_group.csv";
        var link = el("a", "blue-link", name);
        link.href = "#";
        link.addEventListener("click", function (event) {
          event.preventDefault();
          download(name, "Vendor Member ID,Site ID,Currency,Source\n" + list.map(function (m) {
            return [m.memberId, m.siteId, m.currency, '"' + m.source.replace(/"/g, '""') + '"'].join(",");
          }).join("\n"));
        });
        group.area.appendChild(row("Player List", [link]));
      }
      host.appendChild(group);
    });

    /* ---- Calculation scope ---- */
    var period = settings.scopeMode === "period";
    var scope = block("Calculation Scope");
    scope.area.appendChild(row("Type", period
      ? "By Period — totalled across matches, paid once after the period ends and all matches are settled"
      : "By Match — paid once the match is officially settled"));
    if (period) {
      scope.area.appendChild(row("Period", (settings.periodStartDate ? dateTime(settings.periodStartDate, settings.periodStartTime) : EMPTY) +
        " – " + (settings.periodEndDate ? dateTime(settings.periodEndDate, settings.periodEndTime) : EMPTY)));
    }
    var picked = (settings.matches || []).map(D.matchById).filter(Boolean).sort(function (a, b) {
      return a.kickoff < b.kickoff ? -1 : 1;
    });
    scope.area.appendChild(row(period ? "Matches (" + picked.length + ")" : "Match", picked.map(function (m) {
      return m.kickoff + " (GMT-4) · " + m.sport + " · " + m.league + " · " + m.home + " vs " + m.away;
    })));
    host.appendChild(scope);

    /* ---- Free bet calculation ---- */
    var amountMode = settings.calcMode === "amount";
    var rule = block("Free Bet Calculation");
    rule.area.appendChild(row("Calculation Method", amountMode ? "Rebate Absolute Amount" : "Rebate Percentage"));
    var minLoss = settings.minLoss || {};
    var second = (amountMode ? settings.rebateAmount : settings.maxFreeBet) || {};
    if (!amountMode) {
      rule.area.appendChild(row("Rebate Percentage", settings.rebatePct ? settings.rebatePct + "%" : ""));
    }
    /* A currency left blank is not paid, so only the ones set are listed. */
    var set = D.CURRENCIES.filter(function (c) { return minLoss[c] && second[c]; });
    rule.area.appendChild(row(amountMode ? "Min. Net Loss / Rebate Amount" : "Min. Net Loss / Max Free Bet",
      set.length ? set.map(function (c) {
        return c + ": " + fmt(minLoss[c]) + " / " + fmt(second[c]);
      }) : [""]));
    var unset = D.CURRENCIES.filter(function (c) { return set.indexOf(c) === -1; });
    if (set.length && unset.length) {
      rule.area.appendChild(row("Not Set (no free bet)", unset.join(", "), { note: true }));
    }
    rule.area.appendChild(row("Formula", [
      "Net loss = total valid stake − total payout" + (period ? " over the period" : "") + "; 0 when payout ≥ stake",
      "Qualifies when net loss ≥ Min. Net Loss",
      amountMode
        ? "Free bet = Rebate Amount (fixed), in the player's currency"
        : "Free bet = min(net loss × " + (settings.rebatePct || "?") + "%, Max Free Bet), rounded down, in the player's currency"
    ]));
    host.appendChild(rule);

    /* ---- Free bet ---- */
    var fb = block("Free Bet Setup");
    if (settings.fbScope === "specific") {
      fb.area.appendChild(row("Applicable Scope", (settings.fbSports || []).map(function (s) {
        return s.sportName + " · " + (s.allLeagues ? "All leagues" : s.leagues.join(", ")) + " · " +
          (s.allBetTypes ? "All bet types" : s.betTypes.join(", "));
      })));
    } else {
      fb.area.appendChild(row("Applicable Scope", "All sports, leagues and bet types"));
    }
    fb.area.appendChild(row("Odds", (settings.minOdds || EMPTY) + " – " +
      (settings.maxOddsNoLimit ? "No limit" : (settings.maxOdds || EMPTY)) + " (DEC)"));
    fb.area.appendChild(row("Valid From", dateTime(settings.fbStartDate, settings.fbStartTime)));
    fb.area.appendChild(row("Valid Until", dateTime(settings.fbEndDate, settings.fbEndTime)));
    host.appendChild(fb);
  }

  /* ---------- Preview dialog (unchanged) ------------------------------------ */
  var dialog = $("preview-dialog");

  function openPreview() {
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    $("close-preview").focus();
  }

  function closePreview() {
    dialog.hidden = true;
    document.body.style.overflow = "";
    $("open-preview").focus();
  }

  $("open-preview").addEventListener("click", openPreview);
  $("close-preview").addEventListener("click", closePreview);
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

  /* ---------- Footer -------------------------------------------------------- */
  $("save-draft").addEventListener("click", function () {
    showToast("Draft saved.");
  });

  $("submit").addEventListener("click", function () {
    /* Flow D: submitting re-runs the stale check. */
    if (StaleCheck.errors().length) {
      $("stale-message").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    showToast("Submitted for approval.");
    BonusDraft.clear();
  });

  renderGeneral();
  renderContent();
  renderPromo();
  renderSettings();
  StaleCheck.render(3);
})();
