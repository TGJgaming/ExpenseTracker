(() => {
  'use strict';

  const STORAGE_KEYS = {
    expenses: 'quickspend_expenses_v1',
    customMethods: 'quickspend_custom_methods_v1',
    lastMethod: 'quickspend_last_method_v1',
    theme: 'quickspend_theme_v1',
  };

  const THEME_MODES = ['auto', 'light', 'dark'];

  const DEFAULT_METHODS = ['Cash', 'Gcash', 'BDO', 'BPI', 'Maribank'];
  const ADD_CUSTOM_VALUE = '__add_custom__';

  const BLAHAJ_QUIPS = [
    'blåhaj says: track every snack, swim smoothly.',
    'blåhaj approves of your budgeting.',
    'blåhaj reminder: hydration is free!',
    'shonk is watching your daily totals.',
  ];

  const CURRENCY = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const CURRENCY_COMPACT = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // DOM Elements
  const els = {
    blahajMascotBtn: document.getElementById('blahajMascotBtn'),
    blahajMascotImg: document.getElementById('blahajMascotImg'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    dayTotal: document.getElementById('dayTotal'),
    dayCount: document.getElementById('dayCount'),
    dayRangeLabel: document.getElementById('dayRangeLabel'),
    weekTotal: document.getElementById('weekTotal'),
    weekCount: document.getElementById('weekCount'),
    weekRangeLabel: document.getElementById('weekRangeLabel'),
    monthTotal: document.getElementById('monthTotal'),
    monthCount: document.getElementById('monthCount'),
    monthRangeLabel: document.getElementById('monthRangeLabel'),

    expenseForm: document.getElementById('expenseForm'),
    amountInput: document.getElementById('amountInput'),
    descInput: document.getElementById('descInput'),
    recentDescriptions: document.getElementById('recentDescriptions'),
    methodSelect: document.getElementById('methodSelect'),
    dateInput: document.getElementById('dateInput'),
    formError: document.getElementById('formError'),

    customMethodRow: document.getElementById('customMethodRow'),
    customMethodInput: document.getElementById('customMethodInput'),
    saveCustomMethodBtn: document.getElementById('saveCustomMethodBtn'),
    cancelCustomMethodBtn: document.getElementById('cancelCustomMethodBtn'),

    manageMethodsBtn: document.getElementById('manageMethodsBtn'),
    manageMethodsRow: document.getElementById('manageMethodsRow'),
    customMethodsChips: document.getElementById('customMethodsChips'),

    calendarMonthTitle: document.getElementById('calendarMonthTitle'),
    calendarMonthSum: document.getElementById('calendarMonthSum'),
    calendarGrid: document.getElementById('calendarGrid'),
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    todayBtn: document.getElementById('todayBtn'),

    selectedDayTitle: document.getElementById('selectedDayTitle'),
    selectedDaySubtitle: document.getElementById('selectedDaySubtitle'),
    selectedDayTotal: document.getElementById('selectedDayTotal'),
    methodBreakdown: document.getElementById('methodBreakdown'),
    expenseList: document.getElementById('expenseList'),
    emptyState: document.getElementById('emptyState'),

    backupBtn: document.getElementById('backupBtn'),
    importBtn: document.getElementById('importBtn'),
    importFileInput: document.getElementById('importFileInput'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),

    importBanner: document.getElementById('importBanner'),
    importBannerTitle: document.getElementById('importBannerTitle'),
    importBannerDetails: document.getElementById('importBannerDetails'),
    importMergeBtn: document.getElementById('importMergeBtn'),
    importReplaceBtn: document.getElementById('importReplaceBtn'),
    importCancelBtn: document.getElementById('importCancelBtn'),

    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastUndoBtn: document.getElementById('toastUndoBtn'),
  };

  // Date helpers (strictly local time to avoid UTC off-by-one shifts)
  function toLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getTodayKey() {
    return toLocalDateKey(new Date());
  }

  function getWeekBounds(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return {
      startKey: toLocalDateKey(start),
      endKey: toLocalDateKey(end),
      start,
      end,
    };
  }

  function formatShortDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatFullDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatMoney(cents) {
    return CURRENCY.format(cents / 100);
  }

  function formatCalendarMoney(cents) {
    if (cents === 0) return '—';
    const hasFraction = cents % 100 !== 0;
    return hasFraction ? CURRENCY.format(cents / 100) : CURRENCY_COMPACT.format(cents / 100);
  }

  function toCents(amountValue) {
    const parsed = Number.parseFloat(amountValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  }

  function escapeCsvCell(value) {
    const str = String(value ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Storage helpers
  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }

  function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // Application State
  const today = new Date();
  const state = {
    expenses: loadJson(STORAGE_KEYS.expenses, []),
    customMethods: loadJson(STORAGE_KEYS.customMethods, []),
    lastMethod: localStorage.getItem(STORAGE_KEYS.lastMethod) || DEFAULT_METHODS[0],
    selectedDateKey: toLocalDateKey(today),
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth(),
    previousMethod: DEFAULT_METHODS[0],
    editingId: null,
    pendingImport: null,
    themeMode: localStorage.getItem(STORAGE_KEYS.theme) || 'auto',
    quipIndex: 0,
    spinTimer: null,
    toastTimer: null,
  };

  function getResolvedTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(mode) {
    const validMode = THEME_MODES.includes(mode) ? mode : 'auto';
    state.themeMode = validMode;
    document.documentElement.setAttribute('data-theme', validMode);
    localStorage.setItem(STORAGE_KEYS.theme, validMode);
    if (els.themeToggleBtn) {
      const resolved = getResolvedTheme(validMode);
      els.themeToggleBtn.textContent = validMode === 'auto' ? `theme: auto (${resolved})` : `theme: ${validMode}`;
    }
  }

  function cycleTheme() {
    const idx = THEME_MODES.indexOf(state.themeMode);
    const next = THEME_MODES[(idx + 1) % THEME_MODES.length];
    applyTheme(next);
    showToast(`Theme switched to ${next}.`);
  }

  function triggerBlahajSpin(durationMs = 1500) {
    const img = els.blahajMascotImg;
    if (!img) return;
    const spinSrc = img.dataset.spin;
    const idleSrc = img.dataset.idle;
    if (!spinSrc || !idleSrc) return;

    if (state.spinTimer) {
      clearTimeout(state.spinTimer);
    }
    img.src = spinSrc;
    state.spinTimer = setTimeout(() => {
      img.src = idleSrc;
      state.spinTimer = null;
    }, durationMs);
  }

  function getAllMethods() {
    return [...DEFAULT_METHODS, ...state.customMethods];
  }

  function persistExpenses() {
    saveJson(STORAGE_KEYS.expenses, state.expenses);
  }

  function persistCustomMethods() {
    saveJson(STORAGE_KEYS.customMethods, state.customMethods);
  }

  function setFormError(message) {
    if (!message) {
      els.formError.textContent = '';
      els.formError.classList.add('hidden');
      return;
    }
    els.formError.textContent = message;
    els.formError.classList.remove('hidden');
  }

  // Toast with optional undo
  function showToast(message, onUndo = null) {
    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }
    els.toastMessage.textContent = message;
    if (onUndo) {
      els.toastUndoBtn.classList.remove('hidden');
      els.toastUndoBtn.onclick = () => {
        onUndo();
        hideToast();
      };
    } else {
      els.toastUndoBtn.classList.add('hidden');
      els.toastUndoBtn.onclick = null;
    }
    els.toast.classList.remove('hidden');
    state.toastTimer = setTimeout(hideToast, 4500);
  }

  function hideToast() {
    els.toast.classList.add('hidden');
    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
      state.toastTimer = null;
    }
  }

  // Payment Methods UI
  function renderMethodOptions(selectedValue) {
    const methods = getAllMethods();
    const targetValue = methods.includes(selectedValue)
      ? selectedValue
      : methods.includes(state.lastMethod)
        ? state.lastMethod
        : DEFAULT_METHODS[0];

    els.methodSelect.innerHTML = '';
    for (const method of methods) {
      const opt = document.createElement('option');
      opt.value = method;
      opt.textContent = method;
      els.methodSelect.appendChild(opt);
    }

    const dividerOpt = document.createElement('option');
    dividerOpt.disabled = true;
    dividerOpt.textContent = '──────────';
    els.methodSelect.appendChild(dividerOpt);

    const addOpt = document.createElement('option');
    addOpt.value = ADD_CUSTOM_VALUE;
    addOpt.textContent = '+ Add custom payment method...';
    els.methodSelect.appendChild(addOpt);

    els.methodSelect.value = targetValue;
    state.previousMethod = targetValue;

    renderCustomMethodChips();
  }

  function renderCustomMethodChips() {
    const hasCustom = state.customMethods.length > 0;
    els.manageMethodsBtn.classList.toggle('hidden', !hasCustom);
    if (!hasCustom) {
      els.manageMethodsRow.classList.add('hidden');
    }

    els.customMethodsChips.innerHTML = '';
    for (const method of state.customMethods) {
      const chip = document.createElement('span');
      chip.className = 'method-chip';
      chip.textContent = method;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.title = `Remove ${method}`;
      removeBtn.setAttribute('aria-label', `Remove ${method}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => removeCustomMethod(method));

      chip.appendChild(removeBtn);
      els.customMethodsChips.appendChild(chip);
    }
  }

  function openCustomMethodPrompt() {
    els.customMethodRow.classList.remove('hidden');
    els.customMethodInput.value = '';
    els.customMethodInput.focus();
  }

  function closeCustomMethodPrompt(revertSelection = true) {
    els.customMethodRow.classList.add('hidden');
    els.customMethodInput.value = '';
    if (revertSelection) {
      els.methodSelect.value = state.previousMethod;
    }
    setFormError('');
  }

  function saveCustomMethod() {
    const raw = els.customMethodInput.value.trim();
    if (!raw) {
      setFormError('Enter a name for the custom payment method.');
      els.customMethodInput.focus();
      return;
    }

    const existing = getAllMethods().find((m) => m.toLowerCase() === raw.toLowerCase());
    if (existing) {
      closeCustomMethodPrompt(false);
      renderMethodOptions(existing);
      state.lastMethod = existing;
      localStorage.setItem(STORAGE_KEYS.lastMethod, existing);
      showToast(`"${existing}" is already available and selected.`);
      return;
    }

    state.customMethods.push(raw);
    persistCustomMethods();
    state.lastMethod = raw;
    localStorage.setItem(STORAGE_KEYS.lastMethod, raw);
    closeCustomMethodPrompt(false);
    renderMethodOptions(raw);
    showToast(`Added payment method "${raw}".`);
  }

  function removeCustomMethod(methodName) {
    state.customMethods = state.customMethods.filter((m) => m !== methodName);
    persistCustomMethods();
    if (state.lastMethod === methodName) {
      state.lastMethod = DEFAULT_METHODS[0];
      localStorage.setItem(STORAGE_KEYS.lastMethod, state.lastMethod);
    }
    const nextSelect = els.methodSelect.value === methodName ? DEFAULT_METHODS[0] : els.methodSelect.value;
    renderMethodOptions(nextSelect);
  }

  // Totals: Day, Week, Month (always anchored to real current day/week/month)
  function renderSummaryTotals() {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const week = getWeekBounds(now);
    const monthPrefix = todayKey.slice(0, 7);

    let dayCents = 0;
    let dayItems = 0;
    let weekCents = 0;
    let weekItems = 0;
    let monthCents = 0;
    let monthItems = 0;

    for (const exp of state.expenses) {
      if (exp.date === todayKey) {
        dayCents += exp.cents;
        dayItems += 1;
      }
      if (exp.date >= week.startKey && exp.date <= week.endKey) {
        weekCents += exp.cents;
        weekItems += 1;
      }
      if (exp.date.startsWith(monthPrefix)) {
        monthCents += exp.cents;
        monthItems += 1;
      }
    }

    els.dayTotal.textContent = formatMoney(dayCents);
    els.dayCount.textContent = `${dayItems} ${dayItems === 1 ? 'expense' : 'expenses'}`;
    els.dayRangeLabel.textContent = formatShortDate(now);

    els.weekTotal.textContent = formatMoney(weekCents);
    els.weekCount.textContent = `${weekItems} ${weekItems === 1 ? 'expense' : 'expenses'}`;
    els.weekRangeLabel.textContent = `${formatShortDate(week.start)} – ${formatShortDate(week.end)}`;

    els.monthTotal.textContent = formatMoney(monthCents);
    els.monthCount.textContent = `${monthItems} ${monthItems === 1 ? 'expense' : 'expenses'}`;
    els.monthRangeLabel.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Group expenses by YYYY-MM-DD for fast calendar & ledger lookup
  function groupExpensesByDate() {
    const map = new Map();
    for (const exp of state.expenses) {
      let bucket = map.get(exp.date);
      if (!bucket) {
        bucket = { totalCents: 0, items: [] };
        map.set(exp.date, bucket);
      }
      bucket.totalCents += exp.cents;
      bucket.items.push(exp);
    }
    return map;
  }

  function renderRecentDescriptions() {
    const seen = new Set();
    const recent = [];
    for (let i = state.expenses.length - 1; i >= 0 && recent.length < 15; i -= 1) {
      const desc = state.expenses[i].description.trim();
      const key = desc.toLowerCase();
      if (desc && !seen.has(key)) {
        seen.add(key);
        recent.push(desc);
      }
    }
    els.recentDescriptions.innerHTML = '';
    for (const item of recent) {
      const option = document.createElement('option');
      option.value = item;
      els.recentDescriptions.appendChild(option);
    }
  }

  // Monthly Calendar
  function renderCalendar(byDate) {
    const firstOfMonth = new Date(state.viewYear, state.viewMonth, 1);
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
    const startWeekday = firstOfMonth.getDay(); // 0 = Sun
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    const viewMonthPrefix = `${state.viewYear}-${String(state.viewMonth + 1).padStart(2, '0')}`;
    let viewMonthCents = 0;
    let maxDayCents = 0;

    for (const [dateKey, bucket] of byDate.entries()) {
      if (dateKey.startsWith(viewMonthPrefix)) {
        viewMonthCents += bucket.totalCents;
        if (bucket.totalCents > maxDayCents) {
          maxDayCents = bucket.totalCents;
        }
      }
    }

    els.calendarMonthTitle.textContent = firstOfMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    els.calendarMonthSum.textContent = `month total: ${formatMoney(viewMonthCents)}`;

    const todayKey = getTodayKey();
    const fragment = document.createDocumentFragment();

    for (let cellIdx = 0; cellIdx < totalCells; cellIdx += 1) {
      const cellDate = new Date(state.viewYear, state.viewMonth, 1 - startWeekday + cellIdx);
      const cellKey = toLocalDateKey(cellDate);
      const isOutside = cellDate.getMonth() !== state.viewMonth;
      const bucket = byDate.get(cellKey);
      const dayCents = bucket ? bucket.totalCents : 0;
      const itemCount = bucket ? bucket.items.length : 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.dataset.date = cellKey;
      btn.setAttribute('role', 'gridcell');
      btn.title = `${formatFullDate(cellDate)}: ${formatMoney(dayCents)}`;
      btn.setAttribute(
        'aria-label',
        `${formatFullDate(cellDate)}: ${formatMoney(dayCents)} (${itemCount} expenses)`
      );

      if (isOutside) btn.classList.add('is-outside');
      if (cellKey === todayKey) btn.classList.add('is-today');
      if (cellKey === state.selectedDateKey) btn.classList.add('is-selected');

      if (dayCents > 0 && maxDayCents > 0) {
        const ratio = dayCents / maxDayCents;
        if (ratio >= 0.66) btn.classList.add('has-spend-high');
        else if (ratio >= 0.3) btn.classList.add('has-spend-mid');
        else btn.classList.add('has-spend-low');
      }

      const top = document.createElement('div');
      top.className = 'cal-day-top';

      const num = document.createElement('span');
      num.className = 'cal-day-num';
      num.textContent = String(cellDate.getDate());
      top.appendChild(num);

      if (itemCount > 0) {
        const countBadge = document.createElement('span');
        countBadge.className = 'cal-day-dot';
        countBadge.textContent = `${itemCount}×`;
        top.appendChild(countBadge);
      }

      const amt = document.createElement('div');
      amt.className = `cal-day-amount${dayCents === 0 ? ' is-zero' : ''}`;
      amt.textContent = formatCalendarMoney(dayCents);

      btn.appendChild(top);
      btn.appendChild(amt);

      btn.addEventListener('click', () => {
        selectDate(cellKey, isOutside ? cellDate : null);
      });

      fragment.appendChild(btn);
    }

    els.calendarGrid.innerHTML = '';
    els.calendarGrid.appendChild(fragment);
  }

  // Selected Day Ledger
  function renderSelectedDayLedger(byDate) {
    const selectedDate = parseLocalDateKey(state.selectedDateKey);
    const todayKey = getTodayKey();
    const isToday = state.selectedDateKey === todayKey;

    els.selectedDayTitle.textContent = isToday
      ? 'today'
      : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    els.selectedDaySubtitle.textContent = formatFullDate(selectedDate);

    const bucket = byDate.get(state.selectedDateKey);
    const items = bucket ? [...bucket.items].sort((a, b) => b.createdAt - a.createdAt) : [];
    const totalCents = bucket ? bucket.totalCents : 0;

    els.selectedDayTotal.textContent = formatMoney(totalCents);

    if (items.length > 0) {
      const byMethod = new Map();
      for (const item of items) {
        byMethod.set(item.method, (byMethod.get(item.method) || 0) + item.cents);
      }
      els.methodBreakdown.innerHTML = '';
      for (const [method, cents] of byMethod.entries()) {
        const pill = document.createElement('span');
        pill.className = 'breakdown-pill';
        pill.textContent = `${method}: ${formatMoney(cents)}`;
        els.methodBreakdown.appendChild(pill);
      }
      els.methodBreakdown.classList.remove('hidden');
    } else {
      els.methodBreakdown.classList.add('hidden');
      els.methodBreakdown.innerHTML = '';
    }

    els.expenseList.innerHTML = '';
    els.emptyState.classList.toggle('hidden', items.length > 0);

    for (const exp of items) {
      const li = document.createElement('li');
      li.className = 'expense-item';

      if (state.editingId === exp.id) {
        li.appendChild(buildInlineEditForm(exp));
      } else {
        const main = document.createElement('div');
        main.className = 'expense-main';

        const desc = document.createElement('div');
        desc.className = 'expense-desc';
        desc.textContent = exp.description;

        const meta = document.createElement('div');
        meta.className = 'expense-meta';

        const badge = document.createElement('span');
        badge.className = 'method-badge';
        badge.textContent = exp.method;
        meta.appendChild(badge);

        if (exp.createdAt) {
          const time = document.createElement('span');
          time.textContent = new Date(exp.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          meta.appendChild(time);
        }

        main.appendChild(desc);
        main.appendChild(meta);

        const right = document.createElement('div');
        right.className = 'expense-right';

        const amt = document.createElement('span');
        amt.className = 'expense-amount';
        amt.textContent = formatMoney(exp.cents);

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
          state.editingId = exp.id;
          renderAll();
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-delete';
        delBtn.title = 'Delete expense';
        delBtn.setAttribute('aria-label', `Delete ${exp.description}`);
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => deleteExpense(exp.id));

        right.appendChild(amt);
        right.appendChild(editBtn);
        right.appendChild(delBtn);

        li.appendChild(main);
        li.appendChild(right);
      }

      els.expenseList.appendChild(li);
    }
  }

  function buildInlineEditForm(exp) {
    const form = document.createElement('form');
    form.className = 'expense-edit-form';

    const amtInput = document.createElement('input');
    amtInput.type = 'number';
    amtInput.inputMode = 'decimal';
    amtInput.step = '0.01';
    amtInput.min = '0.01';
    amtInput.required = true;
    amtInput.value = (exp.cents / 100).toFixed(2);

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.maxLength = 120;
    descInput.required = true;
    descInput.value = exp.description;

    const methodSel = document.createElement('select');
    const methods = getAllMethods();
    if (!methods.includes(exp.method)) {
      methods.push(exp.method);
    }
    for (const m of methods) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      methodSel.appendChild(opt);
    }
    methodSel.value = exp.method;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn-secondary';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      state.editingId = null;
      renderAll();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cents = toCents(amtInput.value);
      const description = descInput.value.trim();
      if (!cents || !description) return;
      exp.cents = cents;
      exp.description = description;
      exp.method = methodSel.value;
      state.editingId = null;
      persistExpenses();
      renderAll();
    });

    form.appendChild(amtInput);
    form.appendChild(descInput);
    form.appendChild(methodSel);
    form.appendChild(saveBtn);
    form.appendChild(cancelBtn);
    return form;
  }

  function renderAll() {
    const byDate = groupExpensesByDate();
    renderSummaryTotals();
    renderCalendar(byDate);
    renderSelectedDayLedger(byDate);
    renderRecentDescriptions();
  }

  // Actions
  function selectDate(dateKey, switchMonthDate = null) {
    state.selectedDateKey = dateKey;
    state.editingId = null;
    els.dateInput.value = dateKey;
    if (switchMonthDate) {
      state.viewYear = switchMonthDate.getFullYear();
      state.viewMonth = switchMonthDate.getMonth();
    }
    renderAll();
  }

  function addExpense(e) {
    e.preventDefault();
    setFormError('');

    if (els.methodSelect.value === ADD_CUSTOM_VALUE) {
      setFormError('Save or cancel the custom payment method first.');
      els.customMethodInput.focus();
      return;
    }

    const cents = toCents(els.amountInput.value);
    if (!cents) {
      setFormError('Enter an amount greater than 0.');
      els.amountInput.focus();
      return;
    }

    const description = els.descInput.value.trim();
    if (!description) {
      setFormError('Enter what the money was spent on.');
      els.descInput.focus();
      return;
    }

    const dateKey = els.dateInput.value || getTodayKey();
    const method = els.methodSelect.value || DEFAULT_METHODS[0];

    const expense = {
      id: createId(),
      cents,
      description,
      method,
      date: dateKey,
      createdAt: Date.now(),
    };

    state.expenses.push(expense);
    state.lastMethod = method;
    localStorage.setItem(STORAGE_KEYS.lastMethod, method);
    persistExpenses();

    const parsed = parseLocalDateKey(dateKey);
    state.selectedDateKey = dateKey;
    state.viewYear = parsed.getFullYear();
    state.viewMonth = parsed.getMonth();

    els.amountInput.value = '';
    els.descInput.value = '';
    els.amountInput.focus();

    triggerBlahajSpin(1400);
    renderAll();
  }

  function deleteExpense(id) {
    const idx = state.expenses.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const [removed] = state.expenses.splice(idx, 1);
    persistExpenses();
    if (state.editingId === id) {
      state.editingId = null;
    }
    renderAll();

    showToast(`Deleted "${removed.description}"`, () => {
      state.expenses.splice(Math.min(idx, state.expenses.length), 0, removed);
      persistExpenses();
      renderAll();
    });
  }

  // Backup & Import (JSON) + Export CSV
  function backupJson() {
    const payload = {
      app: 'QuickSpend-Blahaj',
      version: 1,
      exportedAt: new Date().toISOString(),
      customMethods: state.customMethods,
      expenses: state.expenses,
    };
    const json = JSON.stringify(payload, null, 2);
    triggerDownload(`quickspend-blahaj-backup-${getTodayKey()}.json`, json, 'application/json;charset=utf-8;');
    showToast(`Backup saved (${state.expenses.length} expenses).`);
  }

  function sanitizeExpense(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
    const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 120) : '';
    const method = typeof raw.method === 'string' && raw.method.trim() ? raw.method.trim().slice(0, 32) : 'Cash';
    let cents = null;
    if (Number.isInteger(raw.cents) && raw.cents > 0) {
      cents = raw.cents;
    } else if (raw.amount !== undefined) {
      cents = toCents(raw.amount);
    }
    if (!date || !description || !cents) return null;

    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createId(),
      cents,
      description,
      method,
      date,
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    };
  }

  function parseBackupPayload(data) {
    let rawExpenses = [];
    let rawMethods = [];

    if (Array.isArray(data)) {
      rawExpenses = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.expenses)) {
      rawExpenses = data.expenses;
      if (Array.isArray(data.customMethods)) {
        rawMethods = data.customMethods;
      }
    } else {
      return null;
    }

    const expenses = [];
    for (const item of rawExpenses) {
      const clean = sanitizeExpense(item);
      if (clean) expenses.push(clean);
    }

    const seenMethods = new Set(DEFAULT_METHODS.map((m) => m.toLowerCase()));
    const customMethods = [];
    for (const m of rawMethods) {
      if (typeof m !== 'string') continue;
      const trimmed = m.trim().slice(0, 32);
      if (trimmed && !seenMethods.has(trimmed.toLowerCase())) {
        seenMethods.add(trimmed.toLowerCase());
        customMethods.push(trimmed);
      }
    }

    // Also include any non-default payment methods referenced by imported expenses
    for (const exp of expenses) {
      const lower = exp.method.toLowerCase();
      if (!seenMethods.has(lower)) {
        seenMethods.add(lower);
        customMethods.push(exp.method);
      }
    }

    return { expenses, customMethods };
  }

  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const payload = parseBackupPayload(parsed);
        if (!payload) {
          showToast('Invalid backup file format.');
          return;
        }
        state.pendingImport = {
          fileName: file.name,
          expenses: payload.expenses,
          customMethods: payload.customMethods,
        };
        els.importBannerTitle.textContent = `Ready to import "${file.name}"`;
        els.importBannerDetails.textContent = `${payload.expenses.length} ${
          payload.expenses.length === 1 ? 'expense' : 'expenses'
        } and ${payload.customMethods.length} custom payment ${
          payload.customMethods.length === 1 ? 'method' : 'methods'
        } found.`;
        els.importBanner.classList.remove('hidden');
      } catch {
        showToast('Could not read JSON backup file.');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read the selected file.');
    };
    reader.readAsText(file);
  }

  function closeImportBanner() {
    state.pendingImport = null;
    els.importBanner.classList.add('hidden');
  }

  function applyImport(mode) {
    if (!state.pendingImport) return;
    const { expenses: incomingExpenses, customMethods: incomingMethods } = state.pendingImport;

    if (mode === 'replace') {
      state.expenses = incomingExpenses;
      state.customMethods = incomingMethods;
      showToast(`Restored ${incomingExpenses.length} expenses from backup.`);
    } else {
      const existingIds = new Set(state.expenses.map((e) => e.id));
      let addedCount = 0;
      for (const exp of incomingExpenses) {
        if (!existingIds.has(exp.id)) {
          existingIds.add(exp.id);
          state.expenses.push(exp);
          addedCount += 1;
        }
      }

      const existingMethodsLower = new Set(getAllMethods().map((m) => m.toLowerCase()));
      for (const m of incomingMethods) {
        if (!existingMethodsLower.has(m.toLowerCase())) {
          existingMethodsLower.add(m.toLowerCase());
          state.customMethods.push(m);
        }
      }
      showToast(`Merged ${addedCount} new ${addedCount === 1 ? 'expense' : 'expenses'}.`);
    }

    persistExpenses();
    persistCustomMethods();
    closeImportBanner();
    renderMethodOptions(state.lastMethod);
    renderAll();
  }

  function exportCsv() {
    if (state.expenses.length === 0) {
      showToast('No expenses to export yet.');
      return;
    }
    const sorted = [...state.expenses].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    const rows = [
      ['Date', 'Description', 'Payment Method', 'Amount (PHP)'],
      ...sorted.map((exp) => [
        exp.date,
        exp.description,
        exp.method,
        (exp.cents / 100).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
    triggerDownload(`quickspend-expenses-${getTodayKey()}.csv`, csv, 'text/csv;charset=utf-8;');
  }

  // Event Wiring
  function initEvents() {
    els.blahajMascotBtn.addEventListener('click', () => {
      const msg = BLAHAJ_QUIPS[state.quipIndex % BLAHAJ_QUIPS.length];
      state.quipIndex += 1;
      triggerBlahajSpin(1800);
      showToast(msg);
    });

    els.themeToggleBtn.addEventListener('click', cycleTheme);

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onSchemeChange = () => {
        if (state.themeMode === 'auto') {
          applyTheme('auto');
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
      else if (mq.addListener) mq.addListener(onSchemeChange);
    }

    els.expenseForm.addEventListener('submit', addExpense);

    els.methodSelect.addEventListener('change', () => {
      const val = els.methodSelect.value;
      if (val === ADD_CUSTOM_VALUE) {
        openCustomMethodPrompt();
      } else {
        state.previousMethod = val;
        state.lastMethod = val;
        localStorage.setItem(STORAGE_KEYS.lastMethod, val);
        closeCustomMethodPrompt(false);
      }
    });

    els.saveCustomMethodBtn.addEventListener('click', saveCustomMethod);
    els.cancelCustomMethodBtn.addEventListener('click', () => closeCustomMethodPrompt(true));

    els.customMethodInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCustomMethod();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeCustomMethodPrompt(true);
      }
    });

    els.manageMethodsBtn.addEventListener('click', () => {
      els.manageMethodsRow.classList.toggle('hidden');
    });

    els.prevMonthBtn.addEventListener('click', () => {
      state.viewMonth -= 1;
      if (state.viewMonth < 0) {
        state.viewMonth = 11;
        state.viewYear -= 1;
      }
      renderAll();
    });

    els.nextMonthBtn.addEventListener('click', () => {
      state.viewMonth += 1;
      if (state.viewMonth > 11) {
        state.viewMonth = 0;
        state.viewYear += 1;
      }
      renderAll();
    });

    els.todayBtn.addEventListener('click', () => {
      const now = new Date();
      state.viewYear = now.getFullYear();
      state.viewMonth = now.getMonth();
      selectDate(toLocalDateKey(now));
    });

    els.dateInput.addEventListener('change', () => {
      if (els.dateInput.value) {
        const parsed = parseLocalDateKey(els.dateInput.value);
        selectDate(els.dateInput.value, parsed);
      }
    });

    els.backupBtn.addEventListener('click', backupJson);
    els.importBtn.addEventListener('click', () => els.importFileInput.click());
    els.importFileInput.addEventListener('change', handleImportFile);
    els.importMergeBtn.addEventListener('click', () => applyImport('merge'));
    els.importReplaceBtn.addEventListener('click', () => applyImport('replace'));
    els.importCancelBtn.addEventListener('click', closeImportBanner);
    els.exportCsvBtn.addEventListener('click', exportCsv);
  }

  // Initialize
  applyTheme(state.themeMode);
  els.dateInput.value = state.selectedDateKey;
  renderMethodOptions(state.lastMethod);
  initEvents();
  renderAll();
})();
