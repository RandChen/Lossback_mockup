/* Leave confirmation for the wizard steps.

   The shared component ("[Wireframe] 共用組件 - Leave Pop up") shows this pop-up
   when the user clicks the link back to the bonus list, so an unsaved draft is
   never dropped silently. Step 1 wires its own copy because it also raises the
   dialog from its Cancel button. */
(function () {
  "use strict";

  var dialog = document.querySelector('[data-role="leave-dialog"]');
  var trigger = document.querySelector('[data-role="back-link"]');
  if (!dialog || !trigger) return;

  var keep = dialog.querySelector('[data-role="keep-editing"]');
  var leave = dialog.querySelector('[data-role="leave"]');

  function close() {
    dialog.hidden = true;
    trigger.focus();
  }

  trigger.addEventListener("click", function (event) {
    event.preventDefault();
    dialog.hidden = false;
    keep.focus();
  });

  keep.addEventListener("click", close);

  leave.addEventListener("click", function () {
    window.location.href = trigger.getAttribute("href");
  });

  /* The page's own dialogs handle Escape first; this only fires when they are
     already closed, because they stop at their own open check. */
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !dialog.hidden) close();
  });
})();
