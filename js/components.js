/* Storybook — the main components, every property and every state.

   Two things are kept apart on purpose:

     PROPS   the property definitions copied verbatim from the Figma component
             sets, so the tables state what the design system actually declares.
     render  how this project draws a given combination — or `null` when the
             product has not needed that state yet, which the matrix marks
             rather than faking.

   When a Main Component changes in Figma: update PROPS from the component set,
   then the renderer, then re-check the pages listed in `usedOn`. */
(function () {
  "use strict";

  /* ---------- Property definitions, verbatim from Figma -------------------- */
  var PROPS = {
    "Button - Nova": {
      page: "Button & Icon Button •",
      props: {
        Variant: ["Primary", "Secondary", "Outline", "Ghost", "Destructive", "Link"],
        Size: ["Default", "Small", "Large", "Extra small"],
        State: ["Default", "Hover & Active", "Focus", "Disabled", "Invalid"],
        "Show left icon": "BOOLEAN", "Show right icon": "BOOLEAN", "Show spinner": "BOOLEAN"
      }
    },
    "Icon Button - Nova": {
      page: "Button & Icon Button •",
      props: {
        Variant: ["Primary", "Secondary", "Outline", "Ghost", "Destructive"],
        Size: ["Default", "Large", "Small", "Extra small"],
        State: ["Default", "Hover & Active", "Focus", "Disabled", "Invalid"],
        Icon: "INSTANCE_SWAP"
      }
    },
    "tag": {
      page: "[ UI ] Promotion Suite - UI design",
      props: { status: ["rejected", "in-review", "approved", "draft"] }
    },
    "Alert - Nova": {
      page: "Alert •",
      props: {
        Type: ["Neutral", "Error", "success", "warning"],
        "Show Title": "BOOLEAN", "Show Description": "BOOLEAN", "Show Button": "BOOLEAN",
        Title: "TEXT", "⮑  Description": "TEXT", "⮑ Icon": "INSTANCE_SWAP"
      }
    },
    "Input - Nova": {
      page: "[ UI ] Promotion Suite - UI design",
      props: { state: ["focus", "default"] }
    },
    "Textarea - Nova": {
      page: "Textarea •",
      props: {
        State: ["Empty", "Placeholder", "Value", "Focus", "Error", "Error Focus", "Disabled"],
        "Show resizable": "BOOLEAN"
      }
    },
    "Checkbox - Nova": {
      page: "Checkbox •",
      props: {
        "Checked?": ["False", "True", "Indeterminate"],
        State: ["Default", "Focus", "Error Focus", "Disabled"]
      }
    },
    "Radio - Nova": {
      page: "Radio •",
      props: { "Checked?": ["False", "True"], State: ["Default", "Focus", "Error Focus", "Disabled"] }
    },
    "Select & Combobox - Nova": {
      page: "Select & Combobox •",
      props: {
        Size: ["Default", "Large", "Small", "Extra small"],
        State: ["Placeholder", "Default", "Focus", "Error focus", "Disabled", "Error"],
        Lines: ["1 Line", "2 Lines", "2 Lines Alt"],
        "Show Decoration": "BOOLEAN", "Show Prepend": "BOOLEAN"
      }
    },
    "Vertical Field - Nova": {
      page: "Field •",
      props: {
        Type: ["Select", "Text Value", "Radio", "Textarea", "Checkbox", "Slider"],
        State: ["Default", "Error"],
        "Show description": "BOOLEAN", "Show Description top": "BOOLEAN", "Show error": "BOOLEAN"
      }
    },
    "Dropdown Menu Item - Nova": {
      page: "Dropdown Menu •",
      props: {
        Size: ["Regular", "Large", "Small"],
        Type: ["Default", "Destructive", "Accent"],
        State: ["Default", "Hover", "Focus", "Active", "Disabled"],
        "Show left decoration": "BOOLEAN", "Show right decoration": "BOOLEAN", "Show line 2": "BOOLEAN"
      }
    },
    "Tooltip - Nova": {
      page: "Tooltip •",
      props: {
        Side: ["Top", "Bottom", "Left", "Right"],
        Type: ["Default", "Formatted", "Shortcut"],
        "Tooltip text": "TEXT"
      }
    },
    "Card - Nova": {
      page: "Card •",
      props: {
        "Slot count": ["1", "2", "3"],
        "Show header": "BOOLEAN", "Show content": "BOOLEAN", "Show footer": "BOOLEAN"
      }
    },
    "Dialog - Nova": {
      page: "Dialog •",
      props: {
        Type: ["Desktop scrollable", "Desktop", "Mobile", "Mobile full Screen scrollable"],
        "Show Scrollbar Wrapper": "BOOLEAN", Slot: "SLOT"
      }
    },
    "Alert Dialog - Nova": {
      page: "Alert Dialog •",
      props: {
        Variant: ["Destructive", "Regular"],
        Size: ["Regular", "Small"],
        "Show decorative icon": "BOOLEAN"
      }
    },
    "toast-alert": {
      page: "[ UI ] Promotion Suite - UI design",
      props: { state: ["success", "notice"], "Show button": "BOOLEAN" }
    },
    "nav-menu-tab": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "hover", "focus"],
               "Show red": "BOOLEAN", "Show tab__count": "BOOLEAN" }
    },
    "list": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["list", "note", "link"], text: "SLOT" }
    },
    "blue-link": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "hover"] }
    },
    "dot-status": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "approved", "reject"] }
    },
    "dot-line-status": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "top", "bottom", "line", "noline"] }
    },
    "log-text-status": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "reject", "approved"] }
    },
    "Pagination Number Button - Nova": {
      page: "Pagination \u2022",
      props: { "Active": ["On", "Off"] }
    },
    "log-progress-list": {
      page: "[ UI ] Promotion Suite - UI design \u00b7 components",
      props: { "dot-status": ["default", "approved", "reject"] }
    },
    "log-progress-list-area": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["reason", "log-structure"] }
    },
    "step-badge": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "Property 1": ["default", "primary", "finish"] }
    },
    "table-cell": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { "table-cell": ["promotion", "date", "created-by", "tag-status", "nodata", "link", "button-group"],
               "Show link": "BOOLEAN", "Show text": "BOOLEAN" }
    },
    "system-status": {
      page: "[ UI ] Promotion Suite - UI design · components",
      props: { empty: ["Default"], nodata: ["Default"], "notifications-empty": ["Default"] }
    },
    "Marker Default - Nova": {
      page: "Marker - NEW •",
      props: {
        Variant: ["Button", "Vertical", "Horizontal", "Link", "Spinner"],
        State: ["Default", "Hover", "Focus"],
        "Show icon": "BOOLEAN", Icon: "INSTANCE_SWAP"
      }
    }
  };

  /* How a state is reached in the browser. Hover and focus are real here — the
     cell is the live element, so the viewer triggers them the way a user would
     instead of looking at a painted copy. */
  var LIVE = { "Hover & Active": "hover", "Hover": "hover", "Focus": "focus",
               "Error Focus": "focus", "Error focus": "focus", "Active": "hover" };

  /* ---------- Components --------------------------------------------------- */
  /* A log row is a tree of markup, not a class on one element, so the two
     Storybook entries build it through these rather than repeating it. */
  function logRow(dot, label, labelcls) {
    return '<ul class="log" style="width:466px;padding:0"><li class="log__row">' +
      '<span class="log__rail log__rail--noline"><span class="log__dot' + dot + '"></span></span>' +
      '<span class="log__status"><span class="log__label' + labelcls + '">' + label + '</span>' +
      '<span class="log__actor">Admin</span></span>' +
      '<span class="log__date">2026/07/10 14:30 (GMT-4)</span></li></ul>';
  }

  function logRail(mod, label) {
    return '<ul class="log" style="width:466px;padding:0"><li class="log__row">' +
      '<span class="log__rail ' + mod + '"><span class="log__dot"></span></span>' +
      '<span class="log__status"><span class="log__label">' + label + '</span>' +
      '<span class="log__actor">Admin</span></span>' +
      '<span class="log__date">2026/07/10 14:30 (GMT-4)</span></li></ul>';
  }

  var COMPONENTS = [
    {
      id: "button", title: "Button", figma: "Button - Nova", css: ".button",
      usedOn: ["every page"],
      note: "Six variants over four sizes, all five states. Focus is a 2px ring in --ring (--ring-error on Destructive); Invalid is a destructive border plus a --ring-error ring. Note: the component's Focus shadow carries spread 0 on every variant except Destructive, which has 2 — 2 is taken as the intended value and the rest read as an oversight worth fixing upstream.",
      matrix: { rows: "Variant", cols: "State" },
      map: { Primary: "button--primary", Secondary: "button--secondary", Outline: "button--outline",
             Ghost: "button--ghost", Destructive: "button--destructive", Link: "link" },
      render: function (variant, state) {
        var cls = this.map[variant];
        if (cls === "link") {
          if (state === "Disabled" || state === "Invalid") return null;
          return '<button type="button" class="link-button">View Reason</button>';
        }
        var extra = state === "Invalid" ? " button--invalid" : "";
        var attr = state === "Disabled" ? " disabled" : "";
        return '<button type="button" class="button ' + cls + extra + '"' + attr + '>Button</button>';
      },
      extra: [
        { label: "Size", items: [
          ["Default · 32", '<button type="button" class="button button--outline">Default</button>'],
          ["Small · 28", '<button type="button" class="button button--outline button--small">Small</button>'],
          ["Extra small · 22", '<button type="button" class="button button--outline button--xs">Extra small</button>'],
          ["Large · 36", '<button type="button" class="button button--outline button--lg">Large</button>']
        ]},
        { label: "Show left icon / right icon", items: [
          ["Left", '<button type="button" class="button button--primary"><span class="icon icon--plus"></span>Create Bonus</button>'],
          ["Right", '<button type="button" class="button button--outline">More<span class="icon icon--chevron-down"></span></button>'],
          ["Show spinner", '<button type="button" class="button button--primary"><span class="button__spinner"></span>Saving</button>']
        ]},
        { label: "Project addition", items: [
          ["--destructive-soft", '<button type="button" class="button button--destructive-soft">Delete</button>']
        ]}
      ]
    },

    {
      id: "icon-button", title: "Icon Button", figma: "Icon Button - Nova", css: ".icon-button",
      usedOn: ["Top bar", "Pagination", "Recipient list"],
      note: "All five variants and all five states. The size scale is --size-default 32, --lg 36, --sm 28, --xs 22. One project quirk: --outline carries its own 28 box with radius 10, which both pagers rely on and which matches none of the component's sizes.",
      matrix: { rows: "Variant", cols: "State" },
      map: { Primary: "icon-button--primary", Secondary: "icon-button--secondary",
             Outline: "icon-button--outline", Ghost: "", Destructive: "icon-button--destructive" },
      render: function (variant, state) {
        var cls = this.map[variant];
        var extra = state === "Invalid" ? " icon-button--invalid" : "";
        var attr = state === "Disabled" ? " disabled" : "";
        return '<button type="button" class="icon-button ' + cls + extra + '"' + attr +
               ' aria-label="Edit"><span class="icon icon--pencil"></span></button>';
      },
      extra: [
        { label: "Size", items: [
          ["Default · 32", '<button type="button" class="icon-button icon-button--size-default icon-button--primary" aria-label="Edit"><span class="icon icon--pencil"></span></button>'],
          ["Large · 36", '<button type="button" class="icon-button icon-button--lg icon-button--primary" aria-label="Edit"><span class="icon icon--pencil"></span></button>'],
          ["Small · 28", '<button type="button" class="icon-button icon-button--sm icon-button--primary" aria-label="Edit"><span class="icon icon--pencil"></span></button>'],
          ["Extra small · 22", '<button type="button" class="icon-button icon-button--xs icon-button--primary" aria-label="Edit"><span class="icon icon--pencil"></span></button>']
        ]}
      ]
    },

    {
      id: "link-button", title: "Link Button", figma: "Button - Nova / Variant=Link", css: ".link-button",
      usedOn: ["Bonus list", "Activity Log", "Create Bonus"],
      note: "Button - Nova's Link variant. The project gives it its own class because it is used inline in table cells and alerts.",
      groups: [{ label: "Variant", items: [
        ["Default", '<button type="button" class="link-button">View Reason</button>'],
        ["Destructive", '<button type="button" class="link-button link-button--destructive">Remove</button>']
      ]}]
    },

    {
      id: "tag", title: "Tag", figma: "tag", css: ".tag",
      usedOn: ["Bonus list", "Approval Inbox", "Distribution Records"],
      note: "The component's four statuses are named after the promotion states; the project names its classes after the tone instead, because the same tones carry Expired, Scheduled and Distributed — three statuses the component does not have yet.",
      groups: [
        { label: "status (component)", items: [
          ["draft → --normal", '<span class="tag tag--normal">Draft</span>'],
          ["in-review → --warning", '<span class="tag tag--warning">In Review</span>'],
          ["approved → --success", '<span class="tag tag--success">Approved</span>'],
          ["rejected → --destructive", '<span class="tag tag--destructive">Rejected</span>']
        ]},
        { label: "Project statuses the component is missing", items: [
          ["Expired", '<span class="tag tag--warning">Expired</span>'],
          ["Scheduled", '<span class="tag tag--normal">Scheduled</span>'],
          ["Distributed", '<span class="tag tag--success">Distributed</span>']
        ]}
      ]
    },

    {
      id: "alert", title: "Alert", figma: "Alert - Nova", css: ".alert",
      usedOn: ["Bonus Detail", "Distribution Records", "Create Bonus"],
      note: "Type sets the tone; the three booleans decide which rows the alert carries.",
      groups: [
        { label: "Type", items: [
          ["Neutral", '<div class="alert"><span class="icon icon--circle-alert"></span><div class="alert__content"><p class="alert__title">Title</p><p class="alert__text">Description</p></div></div>'],
          ["success", '<div class="alert alert--success"><span class="icon icon--circle-check"></span><div class="alert__content"><p class="alert__title">Approved</p></div></div>'],
          ["warning", '<div class="alert alert--warning"><span class="icon icon--triangle-alert"></span><div class="alert__content"><p class="alert__title">Expired</p><p class="alert__text">This promotion has expired and can no longer be approved.</p></div></div>'],
          ["Error", '<div class="alert alert--destructive"><span class="icon icon--circle-alert"></span><div class="alert__content"><p class="alert__title">Rejected</p><p class="alert__text">Does not align with the campaign strategy.</p></div></div>']
        ]},
        { label: "Show Title / Description / Button", items: [
          ["Title only", '<div class="alert alert--success"><span class="icon icon--circle-check"></span><div class="alert__content"><p class="alert__title">Approved</p></div></div>'],
          ["Title + Description", '<div class="alert"><span class="icon icon--circle-alert"></span><div class="alert__content"><p class="alert__title">Title</p><p class="alert__text">Description</p></div></div>'],
          ["+ Button", '<div class="alert alert--destructive"><span class="icon icon--circle-alert"></span><div class="alert__content"><p class="alert__title">60 bonus recalls failed</p></div><button type="button" class="button button--outline button--xs">Recall All</button></div>']
        ]}
      ]
    },

    {
      id: "input", title: "Input", figma: "Input - Nova", css: ".control",
      usedOn: ["Create Bonus", "Bonus list"],
      note: "The control wrapper holds the input so a suffix or icon can sit beside it. Focus is live — click into one.",
      groups: [
        { label: "state", items: [
          ["default", '<div class="control" style="width:240px"><input type="text" placeholder="e.g. World Cup Free Bet" /></div>'],
          ["focus · click in", '<div class="control" style="width:240px"><input type="text" value="World Cup Free Bet" /></div>']
        ]},
        { label: "Project additions", items: [
          ["--hug + suffix", '<div class="control control--hug"><input type="text" value="100" size="4" /><span class="control__suffix">%</span></div>'],
          ["--readonly", '<div class="control control--hug control--readonly"><input type="text" value="100" size="4" readonly /><span class="control__suffix">%</span></div>'],
          ["invalid (from the Field)", '<div class="field field--invalid" style="width:240px"><div class="control"><input type="text" value="1.2" /></div></div>']
        ]}
      ]
    },

    {
      id: "textarea", title: "Textarea", figma: "Textarea - Nova", css: ".textarea",
      usedOn: ["Reject dialog", "Create Bonus"],
      note: "All seven states. Empty, Placeholder and Value share the chrome and differ only in content. Disabled dims to 0.3 — the component's own figure, lower than the 0.5 the buttons and checkbox use, which is worth reconciling upstream.",
      matrix: { rows: "State", cols: null },
      render: function (state) {
        var w = ' rows="3" style="width:260px"';
        if (state === "Empty") return '<textarea class="textarea"' + w + '></textarea>';
        if (state === "Placeholder") return '<textarea class="textarea"' + w + ' placeholder="Enter a reason for rejecting this promotion"></textarea>';
        if (state === "Value") return '<textarea class="textarea"' + w + '>Does not align with the campaign strategy.</textarea>';
        if (state === "Focus") return '<textarea class="textarea"' + w + '>Click in to focus</textarea>';
        if (state === "Error") return '<textarea class="textarea textarea--error"' + w + '>Does not align.</textarea>';
        if (state === "Error Focus") return '<textarea class="textarea textarea--error"' + w + '>Click in to focus</textarea>';
        return '<textarea class="textarea"' + w + ' disabled>Disabled</textarea>';
      }
    },

    {
      id: "checkbox", title: "Checkbox", figma: "Checkbox - Nova", css: ".checkbox",
      usedOn: ["Distribution Records"],
      note: "Checked? across State, all twelve combinations. Focus and Error Focus are live — tab to a box to see the ring.",
      matrix: { rows: "Checked?", cols: "State" },
      render: function (checked, state) {
        var err = state === "Error Focus" ? " checkbox--error" : "";
        var attrs = "";
        if (checked === "True") attrs += " checked";
        if (state === "Disabled") attrs += " disabled";
        var ind = checked === "Indeterminate" ? ' data-indeterminate="true"' : "";
        return '<input type="checkbox" class="checkbox' + err + '"' + attrs + ind + ' aria-label="' + checked + '" />';
      }
    },

    {
      id: "select", title: "Select", figma: "Select & Combobox - Nova", css: ".select",
      usedOn: ["Bonus list", "Distribution Records"],
      note: "All six states and all four sizes. Focus and Error focus are live — tab to a trigger. The native form (.select-native) is a real <select>, for a short fixed list where the OS picker beats a drawn panel (Row per page); the browser's own arrow is switched off so the chevron keeps the kit's 16 at a 6 inset.",
      matrix: { rows: "State", cols: null },
      render: function (state) {
        var cls = "select";
        if (state === "Error" || state === "Error focus") cls += " select--error";
        var attr = state === "Disabled" ? " disabled" : "";
        var open = '<button type="button" class="' + cls + '" style="width:220px"' + attr + '>';
        var caret = '<span class="icon icon--chevron-down"></span></button>';
        if (state === "Placeholder") return open + '<span class="select__tags"><span class="select__placeholder">Select</span></span>' + caret;
        var label = state === "Focus" || state === "Error focus" ? "Tab to focus" : "Recalled";
        return open + '<span class="select__tags">' + label + '</span>' + caret;
      },
      extra: [
        { label: "Size", items: [
          ["Default · 32", '<button type="button" class="select" style="width:180px"><span class="select__tags">Default</span><span class="icon icon--chevron-down"></span></button>'],
          ["Large · 36", '<button type="button" class="select select--lg" style="width:180px"><span class="select__tags">Large</span><span class="icon icon--chevron-down"></span></button>'],
          ["Small · 28", '<button type="button" class="select select--sm" style="width:180px"><span class="select__tags">Small</span><span class="icon icon--chevron-down"></span></button>'],
          ["Extra small · 22", '<button type="button" class="select select--xs" style="width:180px"><span class="select__tags">Extra small</span><span class="icon icon--chevron-down"></span></button>']
        ]},
        { label: "Lines · tags and overflow", items: [
          ["Tags + overflow", '<button type="button" class="select" style="width:260px"><span class="select__tags"><span class="tag tag--normal select__tag">Draft<span class="select__tag-remove" role="button" aria-label="Remove"><span class="icon icon--x"></span></span></span><span class="tag tag--normal select__tag">Approved<span class="select__tag-remove" role="button" aria-label="Remove"><span class="icon icon--x"></span></span></span><span class="select__overflow">+2</span></span><span class="icon icon--chevron-down"></span></button>']
        ]},
        { label: "Native form · .select-native", items: [
          ["Row per page · 80", '<span class="select-native"><select class="select" style="width:80px"><option>50</option><option>100</option><option>200</option></select><span class="icon icon--chevron-down select-native__chevron"></span></span>']
        ]}
      ]
    },

    {
      id: "field", title: "Field", figma: "Vertical Field - Nova", css: ".field",
      usedOn: ["Create Bonus", "Distribution Records"],
      note: "Two helper slots that behave differently: the description sits above the control and survives an error; the message sits below and shares the space with it. Since 2026-10-12 the error adds a line rather than replacing the message.",
      groups: [
        { label: "State", items: [
          ["Default", '<div class="field" style="width:280px"><label class="field__label">Min Odds<span class="field__required">*</span></label><div class="control"><input type="text" value="1.5" /></div><p class="field__message">Minimum: 1.5</p></div>'],
          ["Error", '<div class="field field--invalid" style="width:280px"><label class="field__label">Min Odds<span class="field__required">*</span></label><div class="control"><input type="text" value="1.2" /></div><p class="field__message">Minimum: 1.5</p><p class="field__error">Min Odds cannot be lower than 1.5.</p></div>']
        ]},
        { label: "Show Description top", items: [
          ["With description", '<div class="field" style="width:280px"><label class="field__label">Bonus Promotion Name<span class="field__required">*</span></label><p class="field__description">For internal identification only.</p><div class="control"><input type="text" placeholder="e.g. World Cup Free Bet" /></div></div>']
        ]},
        { label: "Type", items: [
          ["Text Value", '<div class="field" style="width:240px"><label class="field__label">English</label><div class="control"><input type="text" /></div></div>'],
          ["Textarea", '<div class="field" style="width:240px"><label class="field__label">Note</label><textarea class="textarea" rows="2"></textarea></div>'],
          ["Select", '<div class="field" style="width:240px"><label class="field__label">Currency</label><button type="button" class="select"><span class="select__tags"><span class="select__placeholder">Select</span></span><span class="icon icon--chevron-down"></span></button></div>'],
          ["Radio", '<div class="field" style="width:240px"><label class="field__label">Sports</label><label class="radio-field"><input type="radio" class="radio" name="story-sports" checked /><span class="radio-field__body"><span class="radio-field__title">All Sports</span></span></label><label class="radio-field"><input type="radio" class="radio" name="story-sports" /><span class="radio-field__body"><span class="radio-field__title">Specific Sports</span></span></label></div>'],
          ["Checkbox", '<div class="field" style="width:240px"><label class="field__label">Voucher Status</label><label class="checkbox-field"><input type="checkbox" class="checkbox" checked /><span>Unused</span></label><label class="checkbox-field"><input type="checkbox" class="checkbox" /><span>Used</span></label></div>'],
          ["Slider", null]
        ]}
      ]
    },

    {
      id: "dropdown-item", title: "Dropdown menu item", figma: "Dropdown Menu Item - Nova", css: ".menu__item",
      usedOn: ["Bonus list · row actions", "Bonus list · filters", "Distribution Records"],
      note: "One component with three forms in this product: .menu__item for the row-actions menu, and .filter-select__option twice over — a <label> carrying a checkbox for a multi-select filter, a <button> carrying a check mark for a single-select one. All three keep the same 24 row, so a <button> has to be stripped of the browser's own chrome. Hover and Focus are live. Destructive keeps its red label and takes the soft tint behind it so the text stays readable.",
      matrix: { rows: "Type", cols: "State" },
      map: { Default: "", Destructive: "menu__item--destructive", Accent: "menu__item--accent" },
      render: function (type, state) {
        var cls = "menu__item " + this.map[type];
        if (state === "Active") cls += " menu__item--active";
        var attr = state === "Disabled" ? " disabled" : "";
        var icon = type === "Destructive" ? "trash" : "copy";
        return '<button type="button" class="' + cls + '" style="width:150px"' + attr +
               '><span class="menu__decoration"><span class="icon icon--' + icon + '"></span></span>' +
               (type === "Destructive" ? "Delete" : "Duplicate") + '</button>';
      },
      extra: [
        { label: "Filter form · .filter-select__option", items: [
          ["Default", '<label class="filter-select__option" style="width:160px"><input type="checkbox" />In Review</label>'],
          ["Checked", '<label class="filter-select__option" style="width:160px"><input type="checkbox" checked />In Review</label>'],
          ["Disabled", '<label class="filter-select__option filter-select__option--disabled" style="width:160px"><input type="checkbox" disabled />In Review</label>']
        ]},
        { label: "Single-select form · .filter-select__option[role=option]", items: [
          ["Default", '<button type="button" class="filter-select__option" role="option" aria-selected="false" style="width:160px"><span class="icon icon--check filter-select__check"></span>IDR</button>'],
          ["Selected", '<button type="button" class="filter-select__option" role="option" aria-selected="true" style="width:160px"><span class="icon icon--check filter-select__check"></span>USD</button>']
        ]}
      ]
    },

    {
      id: "tooltip", title: "Tooltip", figma: "Tooltip - Nova", css: ".tooltip",
      usedOn: ["Distribution Records"],
      note: "All four sides and all three types. The brick is --theme-neutrals-500, not black — the project had it wrong until 2026-10-12. --start is a project addition for triggers that sit at a container edge.",
      groups: [
        { label: "Side", items: [
          ["Top", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Top</button><span class="tooltip">Tooltip text</span></span>'],
          ["Bottom · --below", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Bottom</button><span class="tooltip tooltip--below">Tooltip text</span></span>'],
          ["Left", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Left</button><span class="tooltip tooltip--left">Tooltip text</span></span>'],
          ["Right", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Right</button><span class="tooltip tooltip--right">Tooltip text</span></span>']
        ]},
        { label: "Type", items: [
          ["Default", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Default</button><span class="tooltip">Tooltip text</span></span>'],
          ["Formatted", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Formatted</button><span class="tooltip tooltip--formatted"><span>Tooltip text</span><span class="tooltip__line2">Line 2</span></span></span>'],
          ["Shortcut", '<span class="has-tooltip story-tip"><button type="button" class="button button--outline">Shortcut</button><span class="tooltip tooltip--shortcut"><span>Tooltip text</span><span class="kbd">K</span></span></span>']
        ]},
        { label: "Project addition", items: [
          ["--start · left-aligned", '<span class="has-tooltip story-tip"><input type="checkbox" class="checkbox" disabled /><span class="tooltip tooltip--start">Used vouchers cannot be recalled</span></span>']
        ]}
      ]
    },

    {
      id: "card", title: "Card", figma: "Card - Nova", css: ".card",
      usedOn: ["Bonus Detail", "Create Bonus", "Distribution Records"],
      note: "Header, content and footer are each optional. The product uses header + content; no card in the product has a footer.",
      groups: [{ label: "Show header / content / footer", items: [
        ["Content only", '<section class="card" style="width:300px"><p style="margin:0;color:var(--muted-foreground)">Content</p></section>'],
        ["Header + content", '<section class="card" style="width:300px"><div class="card__head"><h2 class="card__title">General</h2></div><p style="margin:0;color:var(--muted-foreground)">Content</p></section>'],
        ["+ footer", '<section class="card" style="width:300px"><div class="card__head"><h2 class="card__title">General</h2></div><p style="margin:0;color:var(--muted-foreground)">Content</p><div class="card__footer"><button type="button" class="button button--outline">Cancel</button><button type="button" class="button button--primary">Save</button></div></section>']
      ]}]
    },

    {
      id: "dialog", title: "Dialog", figma: "Dialog - Nova / Alert Dialog - Nova", css: ".dialog",
      usedOn: ["Bonus list", "Bonus Detail", "Create Bonus", "Distribution Records"],
      note: "Dialog - Nova's Type is about the viewport; this product is desktop only. Alert Dialog has its own Variant and Size, and the product draws three decorative icons over it.",
      groups: [
        { label: "Alert Dialog - Nova · Variant", items: [
          ["Destructive", '<div class="dialog dialog--alert" style="width:300px"><div class="dialog__body alert-dialog__body"><span class="alert-dialog__mark alert-dialog__mark--destructive"><span class="icon icon--trash-2"></span></span><h2 class="alert-dialog__title">Delete Bonus Promotion?</h2><p class="alert-dialog__text">This cannot be restored.</p></div><div class="dialog__footer alert-dialog__footer"><button type="button" class="button button--outline">Cancel</button><button type="button" class="button button--destructive-soft">Delete</button></div></div>'],
          ["Regular · success mark", '<div class="dialog dialog--alert" style="width:300px"><div class="dialog__body alert-dialog__body"><span class="alert-dialog__mark alert-dialog__mark--success"><span class="icon icon--file-check"></span></span><h2 class="alert-dialog__title">Approve Promotion?</h2><p class="alert-dialog__text">It will be scheduled for distribution.</p></div><div class="dialog__footer alert-dialog__footer"><button type="button" class="button button--outline">Cancel</button><button type="button" class="button button--primary">Approve</button></div></div>'],
          ["Regular · warning mark", '<div class="dialog dialog--alert" style="width:300px"><div class="dialog__body alert-dialog__body"><span class="alert-dialog__mark alert-dialog__mark--warning"><span class="icon icon--triangle-alert"></span></span><h2 class="alert-dialog__title">Leave this page?</h2><p class="alert-dialog__text">Your unsaved changes will be lost.</p></div><div class="dialog__footer alert-dialog__footer"><button type="button" class="button button--outline">Keep Editing</button><button type="button" class="button button--primary">Leave</button></div></div>']
        ]},
        { label: "Dialog - Nova · Type=Desktop", items: [
          ["Header + body + footer", '<div class="dialog" style="width:420px"><div class="dialog__header"><h2 class="dialog__title">Reject Promotion</h2><button type="button" class="dialog__close" aria-label="Close"><span class="icon icon--x"></span></button></div><div class="dialog__body"><div class="field"><label class="field__label">Reason<span class="field__required">*</span></label><textarea class="textarea" rows="2"></textarea></div></div><div class="dialog__footer dialog__footer--end"><button type="button" class="button button--outline">Cancel</button><button type="button" class="button button--destructive" disabled>Reject</button></div></div>']
        ]}
      ]
    },

    {
      id: "toast", title: "Toast", figma: "toast-alert", css: ".toast-alert",
      usedOn: ["Bonus list", "Bonus Detail", "Distribution Records", "Create Bonus"],
      note: "400 wide. Show button decides whether the toast carries an action.",
      groups: [{ label: "state × Show button", items: [
        ["success", '<div class="toast-alert toast-alert--success"><div class="toast-alert__main"><span class="icon toast-alert__icon icon--check-circle"></span><div class="toast-alert__content"><p class="toast-alert__title">Draft saved.</p></div></div><div class="toast-alert__dismiss"><button type="button" class="toast-alert__close" aria-label="Dismiss"><span class="icon icon--x"></span></button></div></div>'],
        ["notice", '<div class="toast-alert toast-alert--notice"><div class="toast-alert__main"><span class="icon toast-alert__icon icon--attention-circle"></span><div class="toast-alert__content"><p class="toast-alert__title">363 succeeded, 60 failed</p></div></div><div class="toast-alert__dismiss"><button type="button" class="toast-alert__close" aria-label="Dismiss"><span class="icon icon--x"></span></button></div></div>'],
        ["success + button", '<div class="toast-alert toast-alert--success"><div class="toast-alert__main"><span class="icon toast-alert__icon icon--check-circle"></span><div class="toast-alert__content"><p class="toast-alert__title">Duplicated as Draft</p><p>World Cup Free Bet - Copy</p></div></div><button type="button" class="button button--outline">Edit</button><div class="toast-alert__dismiss"><button type="button" class="toast-alert__close" aria-label="Dismiss"><span class="icon icon--x"></span></button></div></div>']
      ]}]
    },

    {
      id: "marker", title: "Marker", figma: "Marker Default - Nova", css: ".back-link",
      usedOn: ["Bonus Detail", "Create Bonus", "Distribution Records"],
      note: "All five variants and all three states. The product's back link is the Horizontal variant with a chevron-left; .back-link is kept as its own name because every detail page uses it. Hover and Focus are live.",
      matrix: { rows: "Variant", cols: "State" },
      render: function (variant) {
        var icon = '<span class="icon icon--file-symlink"></span>';
        if (variant === "Horizontal") return '<span class="marker">' + icon + '<span class="marker__label">Marker text</span></span>';
        if (variant === "Button") return '<button type="button" class="marker marker--button" style="width:160px">' + icon + '<span class="marker__label">Marker text</span><span class="icon icon--chevron-right"></span></button>';
        if (variant === "Link") return '<a class="marker marker--link" href="#">' + icon + '<span class="marker__label">Marker text</span></a>';
        if (variant === "Vertical") return '<span class="marker marker--vertical">' + icon + '<span class="marker__label">Marker text</span></span>';
        return '<span class="marker marker--spinner"><span class="marker__spinner"></span><span class="marker__label">Thinking...</span></span>';
      },
      extra: [
        { label: "Project usage", items: [
          ["Back link · Horizontal", '<a class="back-link" href="#"><span class="icon icon--chevron-left"></span>Free Bet</a>']
        ]}
      ]
    },

    {
      id: "nav-menu-tab", title: "Nav menu tab", figma: "nav-menu-tab", css: ".tab",
      usedOn: ["Approval Inbox", "Bonus Detail", "Distribution Records", "Notification panel"],
      note: "The underline tab. The kit only ships Tab (segmented) - Nova, but the project has this one of its own — which is what the 2026-10-02 decision to keep underline tabs was really pointing at. The component calls the selected state focus; the project calls it --active.",
      matrix: { rows: "Property 1", cols: null },
      render: function (state) {
        var cls = state === "focus" ? "tab tab--active" : "tab";
        var hint = state === "hover" ? " style=\"color:var(--foreground)\"" : "";
        return '<div class="tabs" style="width:150px"><button type="button" class="' + cls + '"' + hint + '>Pending Review</button></div>';
      },
      extra: [
        { label: "Show tab__count / Show red", items: [
          ["With count", '<div class="tabs" style="width:170px"><button type="button" class="tab tab--active"><span class="tab__label">Pending Review</span><span class="tab__count">3</span></button></div>'],
          ["With red dot", '<div class="tabs" style="width:120px"><button type="button" class="tab"><span class="tab__label">Approved<span class="tab__dot"></span></span></button></div>'],
          ["Neither", '<div class="tabs" style="width:110px"><button type="button" class="tab"><span class="tab__label">Rejected</span></button></div>']
        ]}
      ]
    },

    {
      id: "list", title: "List row", figma: "list", css: ".list",
      usedOn: ["Bonus Detail", "Create Bonus · Step 4"],
      note: "A label/value row inside a review card. The label is always muted; the variant is about what the value holds.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        var open = '<div class="list" style="width:380px"><p class="list__label">Bonus Promotion Note</p><div class="list__value">';
        if (kind === "note") return open + '<p class="note">To boost new customer acquisition in line with the Premier League promotion.</p></div></div>';
        if (kind === "link") return open + '<p><a class="blue-link" href="#">xxxx_recipients_list.csv</a></p></div></div>';
        return open + '<p>EPL Free Bet Bonus</p></div></div>';
      }
    },

    {
      id: "blue-link", title: "Blue link", figma: "blue-link", css: ".blue-link",
      usedOn: ["Bonus Detail", "Create Bonus · Step 4"],
      note: "An underlined link inside a value. Hover is live — the colour moves from --bluelink to --bluelink-secondary.",
      matrix: { rows: "Property 1", cols: null },
      render: function () {
        return '<a class="blue-link" href="#">xxxx_recipients_list.csv</a>';
      }
    },

    {
      id: "dot-status", title: "Log dot", figma: "dot-status", css: ".log__dot",
      usedOn: ["Activity Log", "Distribution Records"],
      note: "The marker on an Activity Log row.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        var mod = kind === "approved" ? " log__dot--success" : kind === "reject" ? " log__dot--destructive" : "";
        return '<span class="log__rail" style="height:40px"><span class="log__dot' + mod + '"></span></span>';
      }
    },

    {
      id: "dot-line-status", title: "Log rail", figma: "dot-line-status", css: ".log__rail",
      usedOn: ["Activity Log", "Distribution Records"],
      note: "The rail behind the dot. One continuous line with a 2px gap punched out around the dot; the variants decide which segments are drawn — the first row has none above it, the last none below, and a lone row none at all.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        var mod = kind === "default" ? "" : " log__rail--" + kind;
        var dot = kind === "line" ? "" : '<span class="log__dot"></span>';
        return '<span class="log__rail' + mod + '" style="height:60px">' + dot + '</span>';
      }
    },

    {
      id: "log-text-status", title: "Log label", figma: "log-text-status", css: ".log__label",
      usedOn: ["Activity Log", "Distribution Records"],
      note: "The action name on a log row, tinted by outcome.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        var mod = kind === "approved" ? " log__label--success" : kind === "reject" ? " log__label--destructive" : "";
        var label = kind === "approved" ? "Approved" : kind === "reject" ? "Rejected" : "Submitted";
        return '<span class="log__status"><span class="log__label' + mod + '">' + label + '</span><span class="log__actor">Admin</span></span>';
      }
    },

    {
      id: "pagination", title: "Pagination", figma: "Pagination - Nova", css: ".pagination",
      usedOn: ["Bonus list", "Distribution Records"],
      note: "Previous / Next are Ghost text buttons, not icon buttons. Only the current page carries a border and the white-30 fill; the rest are borderless. The elision is an Icon Button - Nova with the ellipsis glyph.",
      props: "Pagination Number Button - Nova",
      matrix: { rows: "Active", cols: null },
      render: function (kind) {
        var cls = kind === "On" ? "pagination__page pagination__page--current" : "pagination__page";
        return '<button type="button" class="' + cls + '">1</button>';
      },
      extra: [
        { label: "Pagination - Nova", items: [
          ["\u5b8c\u6574\u5206\u9801\u5668", '<nav class="pagination"><button type="button" class="button button--ghost">Previous</button><div class="pagination__pages"><button type="button" class="pagination__page pagination__page--current">1</button><button type="button" class="pagination__page">2</button><button type="button" class="pagination__page">3</button><span class="pagination__gap"><span class="icon icon--ellipsis"></span></span><button type="button" class="pagination__page">10</button></div><button type="button" class="button button--ghost">Next</button></nav>'],
          ["Pagination Ellipsis", '<span class="pagination__gap"><span class="icon icon--ellipsis"></span></span>']
        ]}
      ]
    },

    {
      id: "pager", title: "Pager row", figma: "\u5206\u9801\u5217", css: ".pager",
      usedOn: ["Bonus list", "Distribution Records", "Usage Report"],
      note: "The whole row under a table, not just the nav: the count, Row per page, and the pagination. The count and Row per page sit together on the left and only the pagination is pushed to the far right \u2014 the auto margin lives on `.pager > .pagination`, not on `.records__per-page` (putting it there pushes Row per page into the middle). Bonus list has no Row per page, so that row is just count + pagination. The select is the native `<select>` type, so it needs `.select-native` and the overlaid chevron.",
      extra: [
        { label: "\u5b8c\u6574\u7684 pager", items: [
          ["count + Row per page + pagination", '<div class="pager"><p class="pager__count">1\u201350 / 500</p><div class="records__per-page"><label class="field__label" for="sb-per-page">Row per page</label><span class="select-native"><select id="sb-per-page" class="select records__per-page-select"><option value="50">50</option><option value="100">100</option><option value="200">200</option></select><span class="icon icon--chevron-down select-native__chevron" aria-hidden="true"></span></span></div><nav class="pagination"><button type="button" class="button button--ghost">Previous</button><div class="pagination__pages"><button type="button" class="pagination__page pagination__page--current">1</button><button type="button" class="pagination__page">2</button><span class="pagination__gap"><span class="icon icon--ellipsis"></span></span><button type="button" class="pagination__page">10</button></div><button type="button" class="button button--ghost">Next</button></nav></div>']
        ]},
        { label: "Row per page", items: [
          ["\u55ae\u7368\u4f7f\u7528", '<div class="records__per-page"><label class="field__label" for="sb-per-page-2">Row per page</label><span class="select-native"><select id="sb-per-page-2" class="select records__per-page-select"><option value="50">50</option></select><span class="icon icon--chevron-down select-native__chevron" aria-hidden="true"></span></span></div>']
        ]}
      ]
    },

    {
      id: "log-progress-list", title: "Log entry header", figma: "log-progress-list", css: ".log__row",
      usedOn: ["Bonus Detail \u00b7 Activity Log", "Distribution Records \u00b7 Activity Log"],
      note: "One line of the timeline: the rail with its dot, the action and who did it, and the time. 2026-10-15 the main component (4189:65605) shrank the row from 60 to 40, so the rail segments are 13 either side of the 2px break rather than 23. Three columns in a 1 : 5 : 3 ratio; the entry body (log-progress-list-area) sits under it and spans the two right-hand columns.",
      matrix: { rows: "dot-status", cols: null },
      render: function (state) {
        var dot = state === "approved" ? " log__dot--success" : state === "reject" ? " log__dot--destructive" : "";
        var cls = state === "approved" ? " log__label--success" : state === "reject" ? " log__label--destructive" : "";
        var label = state === "approved" ? "Approved" : state === "reject" ? "Rejected" : "Submitted";
        return logRow(dot, label, cls);
      },
      extra: [
        { label: "dot-line-status \u00b7 \u8ecc\u9053\u7684\u56db\u7a2e\u8b8a\u9ad4", items: [
          ["top \uff08\u7b2c\u4e00\u5217\uff09", logRail("log__rail--top", "Submitted")],
          ["mid", logRail("", "Resubmitted")],
          ["bottom \uff08\u6700\u5f8c\u4e00\u5217\uff09", logRail("log__rail--bottom", "Approved")],
          ["line \uff08\u7121\u9ede\uff0c\u7d66 area \u7528\uff09", '<ul class="log" style="width:466px;padding:0"><li class="log__row log__row--wide"><span class="log__rail log__rail--line"></span><div class="log-structure"><p class="log-structure__count">70 records</p></div></li></ul>']
        ]}
      ]
    },

    {
      id: "log-progress-list-area", title: "Log entry body", figma: "log-progress-list-area", css: ".log-structure",
      usedOn: ["Distribution Records"],
      note: "The row under a log entry's header. reason is the rejection callout on Bonus Detail; log-structure is the Retry / Recall record added 2026-10-13. A single-record operation drops the {Count} records line, and a status that did not change shows one tag with no arrow. 2026-10-15: the main component gives the body 8 / 12 / 16 / 12 \u2014 more room below than above so the next entry's header does not crowd it \u2014 and the field row puts 8 after the label but only 3 between tag / arrow / tag.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        if (kind === "reason") {
          return '<div class="log-structure" style="width:420px"><div class="alert alert--destructive"><span class="icon icon--circle-alert"></span><div class="alert__content"><p class="alert__title">Reject Reason</p><p class="alert__text">The promotion does not align with the current campaign strategy.</p></div></div></div>';
        }
        return '<div class="log-structure" style="width:420px">' +
          '<p class="log-structure__count">70 records</p>' +
          '<p class="log-structure__field"><span class="log-structure__field-name">Distribution Result:</span>' +
          '<span class="tag tag--destructive">Failed</span>' +
          '<span class="icon icon--move-right log-structure__arrow"></span>' +
          '<span class="tag tag--success">Success</span></p>' +
          '<p class="log-structure__ids">VCH10001020, VCH10001021, VCH10001022 <button type="button" class="link-button log-structure__more">Show more</button></p>' +
          '</div>';
      },
      extra: [
        { label: "\u5176\u4ed6\u72c0\u614b\u7d44\u5408", items: [
          ["Single record （不顯示 {Count}）", '<div class="log-structure" style="width:420px"><p class="log-structure__field"><span class="log-structure__field-name">Distribution Result:</span><span class="tag tag--success">Success</span><span class="icon icon--move-right log-structure__arrow"></span><span class="tag tag--success">Recalled</span></p><p class="log-structure__ids">VCH10001020</p></div>'],
          ["狀態未變（單一 tag）", '<div class="log-structure" style="width:420px"><p class="log-structure__count">11 records</p><p class="log-structure__field"><span class="log-structure__field-name">Distribution Result:</span><span class="tag tag--destructive">Failed</span></p><p class="log-structure__ids">FB20260715021, FB20260715022, FB20260715023 <button type="button" class="link-button log-structure__more">Show more</button></p></div>'],
          ["Recall Failed", '<div class="log-structure" style="width:420px"><p class="log-structure__count">11 records</p><p class="log-structure__field"><span class="log-structure__field-name">Distribution Result:</span><span class="tag tag--success">Success</span><span class="icon icon--move-right log-structure__arrow"></span><span class="tag tag--destructive">Recall Failed</span></p><p class="log-structure__ids">VCH10001020, VCH10001021, VCH10001022 <button type="button" class="link-button log-structure__more">Show more</button></p></div>'],
          ["Voucher Status 欄位", '<div class="log-structure" style="width:420px"><p class="log-structure__field"><span class="log-structure__field-name">Voucher Status:</span><span class="tag tag--destructive">Recall Failed</span></p><p class="log-structure__ids">VCH10001020</p></div>']
        ]}
      ]
    },

    {
      id: "step-badge", title: "Step badge", figma: "step-badge", css: ".step__badge",
      usedOn: ["Create Bonus · Steps 1–4"],
      note: "The numbered circle in the wizard indicator. finish swaps the number for a 28 circle-check.",
      matrix: { rows: "Property 1", cols: null },
      render: function (kind) {
        if (kind === "finish") return '<ol class="steps" style="width:120px"><li class="step step--done"><span class="step__badge"><span class="icon icon--circle-check"></span></span></li></ol>';
        if (kind === "primary") return '<ol class="steps" style="width:120px"><li class="step step--current"><span class="step__badge">2</span></li></ol>';
        return '<ol class="steps" style="width:120px"><li class="step"><span class="step__badge">3</span></li></ol>';
      }
    },

    {
      id: "table-cell", title: "Table cell", figma: "table-cell", css: ".table__cell",
      usedOn: ["Bonus list", "Approval Inbox", "Distribution Records"],
      note: "One cell, seven shapes. The product composes them from the same .table__cell plus whatever the column holds.",
      matrix: { rows: "table-cell", cols: null },
      render: function (kind) {
        var open = '<div class="table__cell" style="width:200px;border:1px dashed var(--border)">';
        if (kind === "promotion") return open + '<a class="cell-link" href="#">World Cup Free Bet</a><span class="cell-link cell-link--mini">FB20260715021</span></div>';
        if (kind === "date") return open + '2026/08/28 10:00</div>';
        if (kind === "created-by") return open + 'admin</div>';
        if (kind === "tag-status") return open + '<span class="tag tag--success">Approved</span></div>';
        if (kind === "nodata") return open + '—</div>';
        if (kind === "link") return open + '<button type="button" class="link-button">View Reason</button></div>';
        return open + '<button type="button" class="button button--outline">Edit</button></div>';
      }
    },

    {
      id: "system-status", title: "System status", figma: "system-status", css: ".table-empty",
      usedOn: ["Bonus list", "Approval Inbox", "Distribution Records", "Notification panel"],
      note: "Three illustrations for three kinds of nothing: empty is a page with no records at all, nodata is a filter that matched none, notifications-empty is the panel's own.",
      groups: [{ label: "Illustration", items: [
        ["empty", '<div class="table-empty"><img class="table-empty__art" src="icons/empty.svg" width="180" height="180" alt="" /><div class="table-empty__content"><p class="table-empty__title">No pending reviews</p><p class="table-empty__hint">New submissions will appear here.</p></div></div>'],
        ["nodata", '<div class="table-empty table-empty--sm"><img class="table-empty__art" src="icons/nodata.svg" width="90" height="90" alt="" /><div class="table-empty__content"><p class="table-empty__title">No results found</p><p class="table-empty__hint">Try a different search.</p></div></div>'],
        ["notifications-empty", '<div class="table-empty table-empty--sm"><img class="table-empty__art" src="icons/empty-notifications.svg" width="90" height="90" alt="" /><div class="table-empty__content"><p class="table-empty__title">No notifications yet</p><p class="table-empty__hint">You\u2019re all caught up.</p></div></div>']
      ]}]
    },

    {
      id: "radio", title: "Radio", figma: "Radio - Nova", css: ".radio",
      usedOn: ["Create Bonus · Step 2"],
      note: "Built to mirror the checkbox: a 16 circle with the same --input outline, filling with --primary and a 6 dot when checked. The component dims Disabled to 0.3 on the checked variant and 0.5 on the unchecked one; 0.5 is used for both here.",
      matrix: { rows: "Checked?", cols: "State" },
      render: function (checked, state) {
        var err = state === "Error Focus" ? " radio--error" : "";
        var attrs = "";
        if (checked === "True") attrs += " checked";
        if (state === "Disabled") attrs += " disabled";
        return '<input type="radio" class="radio' + err + '"' + attrs + ' aria-label="' + checked + '" />';
      }
    }
  ];

  /* ---------- Rendering ---------------------------------------------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function specimen(label, html, hint) {
    var cell = el("div", "specimen");
    var preview = el("div", "specimen__preview");
    if (html === null) {
      preview.classList.add("specimen__preview--gap");
      preview.appendChild(el("span", "specimen__gap", "not built"));
    } else if (html && html.tpl) {
      var tpl = document.getElementById(html.tpl);
      if (tpl) preview.appendChild(tpl.content.cloneNode(true));
    } else {
      preview.innerHTML = html;
      preview.querySelectorAll('[data-indeterminate="true"]').forEach(function (b) { b.indeterminate = true; });
    }
    cell.appendChild(preview);
    var cap = el("p", "specimen__label", label);
    if (hint) cap.appendChild(el("span", "specimen__hint", " · " + hint));
    cell.appendChild(cap);
    return cell;
  }

  function propTable(def) {
    var wrap = el("div", "prop-table");
    Object.keys(def.props).forEach(function (key) {
      var row = el("div", "prop-row");
      row.appendChild(el("code", "prop-row__name", key));
      var values = def.props[key];
      var box = el("div", "prop-row__values");
      if (Array.isArray(values)) {
        values.forEach(function (v) { box.appendChild(el("span", "prop-value", v)); });
      } else {
        box.appendChild(el("span", "prop-value prop-value--type", values));
      }
      row.appendChild(box);
      wrap.appendChild(row);
    });
    return wrap;
  }

  var body = document.querySelector('[data-role="body"]');
  var nav = document.querySelector('[data-role="nav"]');

  COMPONENTS.forEach(function (c) {
    var def = PROPS[c.figma.split(" / ")[0]] || null;

    var link = el("a", "story-nav__link", c.title);
    link.href = "#" + c.id;
    nav.appendChild(link);

    var section = el("section", "story");
    section.id = c.id;

    var head = el("div", "story__head");
    head.appendChild(el("h2", "story__title", c.title));
    var meta = el("div", "story__meta");
    meta.appendChild(el("code", "story__code", c.css));
    meta.appendChild(el("span", "story__figma", c.figma));
    head.appendChild(meta);
    section.appendChild(head);

    if (c.note) section.appendChild(el("p", "story__note", c.note));
    if (c.usedOn) {
      var used = el("p", "story__used");
      used.appendChild(el("span", "story__used-label", "Used on"));
      used.appendChild(document.createTextNode(c.usedOn.join(" · ")));
      section.appendChild(used);
    }

    if (def) {
      section.appendChild(el("p", "story__group", "Properties · " + def.page));
      section.appendChild(propTable(def));
    }

    /* the matrix, when the component has two axes worth crossing */
    if (c.matrix && def && typeof c.render === "function") {
      var rowsKey = c.matrix.rows, colsKey = c.matrix.cols;
      var rows = def.props[rowsKey] || [];
      var cols = colsKey ? (def.props[colsKey] || []) : [null];
      section.appendChild(el("p", "story__group", colsKey ? rowsKey + " × " + colsKey : rowsKey));

      var table = el("div", "matrix");
      table.style.setProperty("--matrix-cols", String(cols.length + 1));

      table.appendChild(el("div", "matrix__corner", ""));
      cols.forEach(function (col) {
        table.appendChild(el("div", "matrix__col-head", col === null ? "" : col));
      });

      rows.forEach(function (row) {
        table.appendChild(el("div", "matrix__row-head", row));
        cols.forEach(function (col) {
          var html = colsKey ? c.render(row, col) : c.render(row);
          var cell = el("div", "matrix__cell");
          if (html === null) {
            cell.classList.add("matrix__cell--gap");
            cell.appendChild(el("span", "specimen__gap", "not built"));
          } else {
            var box = el("div", "matrix__specimen");
            box.innerHTML = html;
            box.querySelectorAll('[data-indeterminate="true"]').forEach(function (b) { b.indeterminate = true; });
            cell.appendChild(box);
            if (col && LIVE[col]) cell.appendChild(el("span", "matrix__live", LIVE[col] === "hover" ? "hover me" : "tab to it"));
          }
          table.appendChild(cell);
        });
      });
      section.appendChild(table);
    }

    (c.groups || []).concat(c.extra || []).forEach(function (g) {
      section.appendChild(el("p", "story__group", g.label));
      var grid = el("div", "story__grid");
      g.items.forEach(function (pair) { grid.appendChild(specimen(pair[0], pair[1])); });
      section.appendChild(grid);
    });

    body.appendChild(section);
  });

  /* ---------- Icons --------------------------------------------------------- */
  var ICONS = ["arrow-right", "attention-circle", "bell", "brand", "brand-component", "calendar",
    "check", "check-circle", "chevron-down", "chevron-left", "chevron-right", "circle-alert",
    "circle-check", "circle-x", "clock", "copy", "download", "ellipsis", "eye", "file-check",
    "file-symlink",
    "gift", "help", "inbox", "minus", "move-right", "nav-left", "nav-right", "panel-left",
    "pencil", "plus",
    "reset", "search", "target", "trash", "trash-2", "triangle-alert", "upload", "user",
    "user-plus", "x"];

  var iconLink = el("a", "story-nav__link", "Icons");
  iconLink.href = "#icons";
  nav.appendChild(iconLink);

  var iconSection = el("section", "story");
  iconSection.id = "icons";
  var ih = el("div", "story__head");
  ih.appendChild(el("h2", "story__title", "Icons"));
  var im = el("div", "story__meta");
  im.appendChild(el("code", "story__code", ".icon--{name}"));
  im.appendChild(el("span", "story__figma", "Icons page · 1953:33567"));
  ih.appendChild(im);
  iconSection.appendChild(ih);
  iconSection.appendChild(el("p", "story__note",
    "Exported from the UI file's Icons page and tinted with CSS mask, so they take the current colour. " +
    ICONS.length + " glyphs."));
  var iconGrid = el("div", "story__icons");
  ICONS.forEach(function (name) {
    var cell = el("div", "icon-cell");
    cell.appendChild(el("span", "icon icon--" + name));
    cell.appendChild(el("p", "icon-cell__name", name));
    iconGrid.appendChild(cell);
  });
  iconSection.appendChild(iconGrid);
  body.appendChild(iconSection);

  /* ---------- In-page nav --------------------------------------------------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll(".story-nav__link"));
  var sections = links.map(function (l) { return document.getElementById(l.hash.slice(1)); });
  var scroller = document.querySelector(".app__content");
  function sync() {
    var top = scroller.scrollTop + 120;
    var current = 0;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= top) current = i; });
    links.forEach(function (l, i) { l.classList.toggle("story-nav__link--active", i === current); });
  }
  scroller.addEventListener("scroll", sync);
  sync();
})();
