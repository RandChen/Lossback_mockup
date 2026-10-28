/* Date + time pickers for the wizard's schedule fields.

   Date: a single-month Calendar - Nova grid in a popover.
   Time: the kit has no Time Picker component, so this is the Select pattern —
   a trigger plus a list of options. The spec puts minutes on a 5-minute grid
   in 24-hour time, so the list is generated from that. */
(function (global) {
  "use strict";

  var WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var MINUTE_STEP = 5;

  /* The mock runs on the same clock the top bar shows. */
  var TODAY = "2026/07/27";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(date) {
    return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate());
  }

  function parseDate(value) {
    var match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec((value || "").trim());
    if (!match) return null;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isNaN(date.getTime()) ? null : date;
  }

  function closeAll(except) {
    document.querySelectorAll(".datetime__panel").forEach(function (panel) {
      if (panel !== except) panel.hidden = true;
    });
  }

  function commit(input, value) {
    input.value = value;
    /* Let the page's own validation and draft persistence react. */
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur"));
  }

  /* ---------- Date ---------------------------------------------------------- */
  function buildCalendar(panel, input) {
    var view = null;

    /* Per the UX: open on the field's own value, or on the start of its
       allowed range when it has none. Recomputed on every open, since the
       upstream fields can move the range between one open and the next. */
    function home() {
      var selected = parseDate(input.value) || parseDate(input.dataset.minDate || "");
      var base = selected || new Date(2026, 6, 1);
      view = new Date(base.getFullYear(), base.getMonth(), 1);
    }
    home();

    function render() {
      panel.innerHTML = "";

      var calendar = document.createElement("div");
      calendar.className = "calendar";

      var header = document.createElement("div");
      header.className = "calendar__header";

      var prev = navButton("nav-left", "Previous month", function () {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        render();
      });

      var caption = document.createElement("p");
      caption.className = "calendar__caption";
      caption.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      var next = navButton("nav-right", "Next month", function () {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        render();
      });

      header.appendChild(prev);
      header.appendChild(caption);
      header.appendChild(next);
      calendar.appendChild(header);

      var months = document.createElement("div");
      months.className = "calendar__months";
      months.appendChild(buildGrid());
      calendar.appendChild(months);
      panel.appendChild(calendar);
    }

    function navButton(icon, label, onClick) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "icon-button icon-button--outline";
      button.setAttribute("aria-label", label);
      button.innerHTML = '<span class="icon icon--' + icon + '" aria-hidden="true"></span>';
      button.addEventListener("click", onClick);
      return button;
    }

    function buildGrid() {
      var grid = document.createElement("div");
      grid.className = "calendar__grid";

      var head = document.createElement("div");
      head.className = "calendar__row";
      WEEKDAYS.forEach(function (name) {
        var cell = document.createElement("div");
        cell.className = "calendar__weekday";
        cell.setAttribute("aria-hidden", "true");
        cell.textContent = name;
        head.appendChild(cell);
      });
      grid.appendChild(head);

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var cursor = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
      var last = new Date(first.getFullYear(), first.getMonth() + 1, 0);

      while (cursor <= last || cursor.getDay() !== 0) {
        var row = document.createElement("div");
        row.className = "calendar__row";

        for (var i = 0; i < 7; i++) {
          row.appendChild(buildDay(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())));
          cursor.setDate(cursor.getDate() + 1);
        }
        grid.appendChild(row);
      }
      return grid;
    }

    function buildDay(date) {
      var outside = date.getMonth() !== view.getMonth();
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day" + (outside ? " day--outside" : "");
      cell.textContent = String(date.getDate());

      if (outside) {
        cell.disabled = true;
        cell.setAttribute("aria-hidden", "true");
        return cell;
      }

      /* The schedule fields constrain each other, so a field can carry the
         earliest date it is allowed to take. Anything before it is dead. */
      var min = parseDate(input.dataset.minDate || "");
      if (min && date < min) {
        cell.disabled = true;
        cell.classList.add("day--disabled");
      }

      /* Both pickers share calendar.css, so they share the today outline too. */
      if (formatDate(date) === TODAY) cell.classList.add("day--today");

      var current = parseDate(input.value);
      if (current && formatDate(current) === formatDate(date)) {
        cell.classList.add("day--selected", "day--range-start", "day--range-end");
      }

      cell.setAttribute("aria-label", date.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      }));

      cell.addEventListener("click", function () {
        commit(input, formatDate(date));
        panel.hidden = true;
      });

      return cell;
    }

    render.home = home;
    return render;
  }

  /* ---------- Time ---------------------------------------------------------- */
  /* The design splits this into an Hour column and a Minute column with a colon
     between them, each scrolling on its own — not one combined HH:MM list. */
  function buildTimes(panel, input) {
    function parts() {
      var m = /^(\d{2}):(\d{2})$/.exec(input.value.trim());
      return m ? { hour: m[1], minute: m[2] } : { hour: "", minute: "" };
    }

    function floors() {
      var on = input.dataset.timeFloorDate || "";
      var own = input.dataset.pairedDate || "";
      var floor = input.dataset.timeFloor || "";
      if (!floor || !on || own !== on) return null;
      var m = /^(\d{2}):(\d{2})$/.exec(floor);
      return m ? { hour: m[1], minute: m[2] } : null;
    }

    return function render() {
      panel.innerHTML = "";
      var current = parts();
      var floor = floors();

      var grid = document.createElement("div");
      grid.className = "time-grid";

      function column(kind, label, values, selected, isDisabled) {
        var col = document.createElement("div");
        col.className = "time-col";

        var head = document.createElement("p");
        head.className = "time-col__head";
        head.textContent = label;
        col.appendChild(head);

        var list = document.createElement("div");
        list.className = "time-list";

        values.forEach(function (value) {
          var option = document.createElement("button");
          option.type = "button";
          option.className = "time-list__option" +
            (value === selected ? " time-list__option--selected" : "");
          option.textContent = value;
          if (isDisabled(value)) {
            option.disabled = true;
            option.classList.add("time-list__option--disabled");
          }
          option.addEventListener("click", function () {
            var next = parts();
            next[kind] = value;
            /* Picking one half before the other fills the missing half with the
               earliest value it is allowed to take. */
            if (!next.hour) next.hour = floor ? floor.hour : "00";
            if (!next.minute) next.minute = "00";
            commit(input, next.hour + ":" + next.minute);
            render();
          });
          list.appendChild(option);
        });

        col.appendChild(list);
        return col;
      }

      var hours = [];
      for (var h = 0; h < 24; h++) hours.push(pad(h));
      var minutes = [];
      for (var m = 0; m < 60; m += MINUTE_STEP) minutes.push(pad(m));

      grid.appendChild(column("hour", "Hour", hours, current.hour, function (value) {
        /* An hour is out only when every minute in it is at or before the floor. */
        return Boolean(floor) && value < floor.hour;
      }));

      /* The colon lives in its own column with a matching (empty) heading, so
         it centres against the lists rather than the whole panel — which puts
         it on the same line as the selected values. */
      var divider = document.createElement("div");
      divider.className = "time-col time-col--divider";
      var spacer = document.createElement("p");
      spacer.className = "time-col__head";
      spacer.setAttribute("aria-hidden", "true");
      /* A non-breaking space gives the spacer the same line box as the real
         headings; an empty <p> collapses and drags the colon half a line up. */
      spacer.textContent = "\u00a0";
      divider.appendChild(spacer);
      var colon = document.createElement("span");
      colon.className = "time-grid__colon";
      colon.textContent = ":";
      divider.appendChild(colon);
      grid.appendChild(divider);

      grid.appendChild(column("minute", "Minute", minutes, current.minute, function (value) {
        if (!floor) return false;
        var hour = current.hour || floor.hour;
        if (hour > floor.hour) return false;
        if (hour < floor.hour) return true;
        return value <= floor.minute;
      }));

      panel.appendChild(grid);

      panel.querySelectorAll(".time-list__option--selected").forEach(function (node) {
        node.scrollIntoView({ block: "center" });
      });
    };
  }

  /* ---------- Wiring --------------------------------------------------------- */
  function attach(input, kind) {
    var control = input.closest(".control");
    var field = document.createElement("div");
    field.className = "datetime__field" + (kind === "time" ? " datetime__field--time" : "");
    control.parentNode.insertBefore(field, control);
    field.appendChild(control);

    input.readOnly = true;

    var panel = document.createElement("div");
    panel.className = "datetime__panel" + (kind === "time" ? " datetime__panel--time" : "");
    panel.hidden = true;
    field.appendChild(panel);

    var render = kind === "time" ? buildTimes(panel, input) : buildCalendar(panel, input);

    control.addEventListener("click", function (event) {
      event.stopPropagation();
      if (input.disabled) return;
      var opening = panel.hidden;
      closeAll();
      panel.hidden = !opening;
      if (opening) {
        if (render.home) render.home();
        render();
      }
    });

    panel.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  function init(scope) {
    (scope || document).querySelectorAll(".datetime").forEach(function (group) {
      var date = group.querySelector('[data-role="date"]');
      var time = group.querySelector('[data-role="time"]');
      if (date) attach(date, "date");
      if (time) attach(time, "time");
    });

    document.addEventListener("click", function () {
      closeAll();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAll();
    });
  }

  global.DateTimePicker = { init: init };
})(window);
