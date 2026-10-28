/* The characters a search matched are called out inside the result: bold, in
   the primary colour. The UX marks them with the wireframe's own highlight
   colour (`3413:36941` for the Step 2 pickers, `3396:15928` for the Step 3
   recipient list); in the UI that emphasis is the primary blue.

   Returns a span so the caller can drop it straight into a row. */
window.SearchHighlight = function (value, query) {
  var span = document.createElement("span");
  var text = value == null ? "" : String(value);
  var needle = String(query || "").trim().toLowerCase();
  var at = needle ? text.toLowerCase().indexOf(needle) : -1;

  if (at === -1) {
    span.textContent = text;
    return span;
  }

  span.appendChild(document.createTextNode(text.slice(0, at)));
  var hit = document.createElement("mark");
  hit.className = "search-hit";
  hit.textContent = text.slice(at, at + needle.length);
  span.appendChild(hit);
  span.appendChild(document.createTextNode(text.slice(at + needle.length)));
  return span;
};
