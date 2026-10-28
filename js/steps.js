(function () {
  "use strict";

  /* The UX allows jumping back to completed steps only, and the rule differs per
     page: Step 1 can jump nowhere, Step 2 back to 1, Step 3 (Review) back to
     1-2. (2026-10-26: four steps became three — Recipients merged into Step 2.) That is exactly the set marked `step--done`, so the markup
     already carries the rule and this script just makes those steps navigable.

     The link is an overlay rather than a wrapper so the step's own column layout
     (badge, bar, label) is left untouched. */
  var URLS = [
    "create-bonus.html",
    "create-bonus-step2.html",
    "create-bonus-step3.html"
  ];

  var steps = document.querySelectorAll(".steps .step");

  steps.forEach(function (step, index) {
    if (!step.classList.contains("step--done")) return;

    var label = step.querySelector(".step__label");
    var link = document.createElement("a");
    link.className = "step__jump";
    link.href = URLS[index];
    link.setAttribute("aria-label",
      "Go back to step " + (index + 1) + (label ? ": " + label.textContent : ""));
    step.appendChild(link);
    step.classList.add("step--jumpable");
  });
})();
