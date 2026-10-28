/* Responsive sidebar: fixed on desktop, an overlay drawer below 960px.
   The markup is identical in both cases — only the presentation changes. */
(function () {
  "use strict";

  var sidebar = document.querySelector(".sidebar");
  var trigger = document.querySelector('[data-role="sidebar-trigger"]');
  var scrim = document.querySelector('[data-role="sidebar-scrim"]');
  if (!sidebar || !trigger || !scrim) return;

  function open() {
    sidebar.classList.add("sidebar--open");
    scrim.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    sidebar.querySelector("a, button").focus();
  }

  function close() {
    sidebar.classList.remove("sidebar--open");
    scrim.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", function () {
    if (sidebar.classList.contains("sidebar--open")) close();
    else open();
  });

  scrim.addEventListener("click", close);

  /* Following a link inside the drawer should dismiss it. */
  sidebar.addEventListener("click", function (event) {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
  });

  /* Returning to the desktop layout clears the drawer state. */
  window.addEventListener("resize", function () {
    if (window.innerWidth > 960) close();
  });
})();
