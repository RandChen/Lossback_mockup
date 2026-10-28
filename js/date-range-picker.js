(function () {
  "use strict";

  var WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var MONTHS_SHOWN = 2;

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  function key(date) {
    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  }

  function isSameDay(a, b) {
    return Boolean(a && b && key(a) === key(b));
  }

  function formatCaption(date) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function formatTrigger(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /* Weeks covering the month, padded with the neighbouring months' days so
     every row holds seven cells. `minWeeks` keeps both displayed months the
     same height, which is how the design draws them. */
  function weeksOf(month, minWeeks) {
    var first = startOfMonth(month);
    var cursor = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    var last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    var weeks = [];

    while (cursor <= last || weeks.length < (minWeeks || 0)) {
      var week = [];
      for (var i = 0; i < 7; i++) {
        week.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }

  function DateRangePicker(root) {
    this.root = root;
    this.trigger = root.querySelector('[data-role="trigger"]');
    this.popover = root.querySelector('[data-role="popover"]');
    this.monthsHost = root.querySelector('[data-role="months"]');
    this.captions = root.querySelectorAll("[data-caption]");
    this.fromLabel = root.querySelector('[data-role="from-label"]');
    this.toLabel = root.querySelector('[data-role="to-label"]');

    /* The mock runs on the same clock the top bar shows. */
    this.today = new Date(2026, 6, 27);
    this.viewMonth = startOfMonth(this.today);
    this.range = { from: null, to: null };

    this.bind();
    this.render();
    root.rangePicker = this;
  }

  DateRangePicker.prototype.bind = function () {
    var self = this;

    this.trigger.addEventListener("click", function () {
      self.setOpen(self.popover.hidden);
    });

    this.root.querySelector('[data-nav="prev"]').addEventListener("click", function () {
      self.viewMonth = addMonths(self.viewMonth, -1);
      self.render();
    });

    this.root.querySelector('[data-nav="next"]').addEventListener("click", function () {
      self.viewMonth = addMonths(self.viewMonth, 1);
      self.render();
    });

    this.monthsHost.addEventListener("click", function (event) {
      var button = event.target.closest(".day");
      if (!button || button.disabled) return;
      self.select(new Date(Number(button.dataset.time)));
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") self.setOpen(false);
    });

    /* Capture phase: selecting a day re-renders the grid, so by the time a
       bubbled click reaches document the clicked node is already detached and
       would read as an outside click. */
    document.addEventListener(
      "click",
      function (event) {
        if (!self.root.contains(event.target)) self.setOpen(false);
      },
      true
    );

    window.addEventListener("resize", function () {
      if (!self.popover.hidden) self.position();
    });
  };

  DateRangePicker.prototype.setOpen = function (open) {
    this.popover.hidden = !open;
    this.trigger.setAttribute("aria-expanded", String(open));
    if (open) this.position();
  };

  /* Keep the popover inside the viewport: it opens flush with the field's left
     edge, and only shifts left far enough to stay on screen. */
  DateRangePicker.prototype.position = function () {
    var margin = 16;
    this.popover.style.left = "0px";

    var anchor = this.root.getBoundingClientRect();
    var popover = this.popover.getBoundingClientRect();
    var overflow = anchor.left + popover.width + margin - document.documentElement.clientWidth;

    if (overflow > 0) {
      this.popover.style.left = "-" + Math.min(overflow, anchor.left - margin) + "px";
    }
  };

  DateRangePicker.prototype.select = function (date) {
    var range = this.range;

    if (!range.from || (range.from && range.to)) {
      this.range = { from: date, to: null };
    } else if (date < range.from) {
      this.range = { from: date, to: range.from };
    } else {
      this.range = { from: range.from, to: date };
    }

    this.render();
    /* The list page filters on the selected range, so announce every change. */
    this.root.dispatchEvent(new CustomEvent("rangechange", {
      detail: { from: this.range.from, to: this.range.to }
    }));
  };

  DateRangePicker.prototype.clear = function () {
    this.range = { from: null, to: null };
    this.render();
    this.root.dispatchEvent(new CustomEvent("rangechange", {
      detail: { from: null, to: null }
    }));
  };

  DateRangePicker.prototype.dayState = function (date, month) {
    var range = this.range;
    var outside = date.getMonth() !== month.getMonth();
    var state = { outside: outside, classes: ["day"] };

    if (outside) {
      state.classes.push("day--outside");
      return state;
    }

    if (isSameDay(date, this.today)) state.classes.push("day--today");

    var isStart = isSameDay(date, range.from);
    var isEnd = isSameDay(date, range.to);
    var inBetween =
      range.from && range.to && date > range.from && date < range.to;

    if (isStart || isEnd || inBetween) state.classes.push("day--selected");
    if (range.to) state.classes.push("day--has-range");
    if (isStart) state.classes.push("day--range-start");
    if (isEnd) state.classes.push("day--range-end");
    if (inBetween) state.classes.push("day--range-middle");

    return state;
  };

  DateRangePicker.prototype.renderMonth = function (month, minWeeks) {
    var grid = document.createElement("div");
    grid.className = "calendar__grid";

    var header = document.createElement("div");
    header.className = "calendar__row";
    WEEKDAYS.forEach(function (name) {
      var cell = document.createElement("div");
      cell.className = "calendar__weekday";
      cell.setAttribute("aria-hidden", "true");
      cell.textContent = name;
      header.appendChild(cell);
    });
    grid.appendChild(header);

    var self = this;
    weeksOf(month, minWeeks).forEach(function (week) {
      var row = document.createElement("div");
      row.className = "calendar__row";

      week.forEach(function (date) {
        var state = self.dayState(date, month);
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = state.classes.join(" ");
        cell.textContent = String(date.getDate());
        cell.dataset.time = String(date.getTime());
        if (state.outside) {
          cell.disabled = true;
          cell.setAttribute("aria-hidden", "true");
        } else {
          cell.setAttribute(
            "aria-label",
            date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          );
          if (state.classes.indexOf("day--selected") !== -1) {
            cell.setAttribute("aria-pressed", "true");
          }
        }
        row.appendChild(cell);
      });

      grid.appendChild(row);
    });

    return grid;
  };

  DateRangePicker.prototype.render = function () {
    this.monthsHost.innerHTML = "";

    var months = [];
    var weekCount = 0;
    for (var i = 0; i < MONTHS_SHOWN; i++) {
      var month = addMonths(this.viewMonth, i);
      months.push(month);
      weekCount = Math.max(weekCount, weeksOf(month).length);
    }

    for (var j = 0; j < months.length; j++) {
      this.monthsHost.appendChild(this.renderMonth(months[j], weekCount));
      if (this.captions[j]) this.captions[j].textContent = formatCaption(months[j]);
    }

    this.fromLabel.textContent = this.range.from
      ? formatTrigger(this.range.from)
      : "Start date";
    this.fromLabel.dataset.filled = String(Boolean(this.range.from));

    this.toLabel.textContent = this.range.to
      ? formatTrigger(this.range.to)
      : "End date";
    this.toLabel.dataset.filled = String(Boolean(this.range.to));
  };

  document.querySelectorAll("[data-date-range-picker]").forEach(function (root) {
    new DateRangePicker(root);
  });
})();
