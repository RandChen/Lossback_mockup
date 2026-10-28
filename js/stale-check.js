/* Settings that were valid when the draft was saved but are not any more.

   UX 4712:38844「重新編輯活動 (Flow C) 與送審 (Flow D) 時，系統檢查已儲存設定
   是否仍有效」. Two things can go stale while a draft sits:

     Step 1  the promotion name was taken by someone else on the same site
     Step 2  a selected match stopped being available

   The rules the UX gives:
     · an error on the current step is shown on the field itself and is NOT
       listed in the page message
     · an error on another step goes in a message at the top of the page, each
       item carrying a Go to Step N
     · ordered by step, then by field order within a step
     · a bullet before each item only when there is more than one
     · Go to Step N jumps straight back; going forward behaves like Next, so the
       current step validates first
     · an item disappears once it is fixed, the whole message disappears when
       they all are, and it cannot be dismissed by hand */
(function (global) {
  "use strict";

  /* The app's clock is fixed, so "has passed" is measured against the same day
     the rest of the prototype shows. */
  var TODAY = "2026/07/27";

  /* Stand-in for the names the site already has; Step 1 checks against the same
     list when the field is edited. */
  var TAKEN_NAMES = ["World Cup Free Bet"];

  var CHECKS = [
    {
      step: 1,
      url: "create-bonus.html",
      field: "promotion-name",
      message: "This promotion name already exists. Enter a different name.",
      failing: function (draft) {
        return TAKEN_NAMES.indexOf((draft.general.name || "").trim()) !== -1;
      }
    },
    {
      /* 2026-10-26: Step 2 is now Campaign Settings. A picked match goes stale
         when it kicks off, Operations closes its market, or a joining site puts it in
         another campaign while this draft sits. */
      step: 2,
      url: "create-bonus-step2.html",
      field: "matches",
      message: "A selected match is no longer available. Please update the match list.",
      failing: function (draft) {
        var data = global.CampaignData;
        if (!data) return false;
        var sites = draft.general.participants || [];
        return (draft.settings.matches || []).some(function (id) {
          var match = data.matchById(id);
          return !match || Boolean(data.blockReason(match, sites));
        });
      }
    }
  ];

  function errors() {
    var draft = global.BonusDraft ? global.BonusDraft.read() : null;
    if (!draft) return [];
    return CHECKS.filter(function (check) { return check.failing(draft); });
  }

  /* Whether this step's own field should be showing one of these. */
  function forStep(step) {
    return errors().filter(function (check) { return check.step === step; });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* `validate` is the page's own Next check, used when the link points forward. */
  function render(step, validate) {
    var host = document.querySelector('[data-role="stale-message"]');
    if (!host) return;

    var items = errors().filter(function (check) { return check.step !== step; });
    host.innerHTML = "";
    host.hidden = items.length === 0;
    if (!items.length) return;

    var alert = el("div", "alert alert--destructive alert--page stale-message");
    var icon = el("span", "icon icon--circle-alert");
    icon.setAttribute("aria-hidden", "true");
    alert.appendChild(icon);

    var content = el("div", "alert__content");
    items.forEach(function (check) {
      var line = el("p", "alert__text stale-message__item");
      /* A bullet only earns its place when there is more than one. */
      line.appendChild(document.createTextNode(
        (items.length > 1 ? "• " : "") + check.message + " "));

      var go = el("button", "link-button stale-message__go", "Go to Step " + check.step);
      go.type = "button";
      go.addEventListener("click", function () {
        if (check.step > step && typeof validate === "function" && !validate()) return;
        window.location.href = check.url;
      });
      line.appendChild(go);
      content.appendChild(line);
    });

    alert.appendChild(content);
    host.appendChild(alert);
  }

  global.StaleCheck = { errors: errors, forStep: forStep, render: render, TODAY: TODAY };
})(window);
