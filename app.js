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

    reimburseToggleBtn: document.getElementById('reimburseToggleBtn'),
    reimburseOptions: document.getElementById('reimburseOptions'),
    splitPills: Array.from(document.querySelectorAll('.split-pill')),
    reimburseCustomWrap: document.getElementById('reimburseCustomWrap'),
    reimburseCustomInput: document.getElementById('reimburseCustomInput'),
    reimburseFromInput: document.getElementById('reimburseFromInput'),
    recentBorrowers: document.getElementById('recentBorrowers'),
    reimbursePreview: document.getElementById('reimbursePreview'),

    owedSection: document.getElementById('owedSection'),
    owedToggleBtn: document.getElementById('owedToggleBtn'),
    owedCountBadge: document.getElementById('owedCountBadge'),
    owedTotalAmount: document.getElementById('owedTotalAmount'),
    owedChevron: document.getElementById('owedChevron'),
    owedDrawer: document.getElementById('owedDrawer'),
    owedList: document.getElementById('owedList'),

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
    reimburseEnabled: false,
    reimburseSplit: 'full',
    owedDrawerOpen: false,
    themeMode: localStorage.getItem(STORAGE_KEYS.theme) || 'auto',
    quipIndex: 0,
    spinTimer: null,
    toastTimer: null,
  };

  function getNetSpendCents(exp) {
    const reimb = exp.reimbursement;
    if (!reimb || reimb.status !== 'paid') return exp.cents;
    return Math.max(0, exp.cents - reimb.owedCents);
  }

  function getPendingOwedCents(exp) {
    const reimb = exp.reimbursement;
    if (!reimb || reimb.status !== 'pending') return 0;
    return reimb.owedCents;
  }

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
      const netCents = getNetSpendCents(exp);
      if (exp.date === todayKey) {
        dayCents += netCents;
        dayItems += 1;
      }
      if (exp.date >= week.startKey && exp.date <= week.endKey) {
        weekCents += netCents;
        weekItems += 1;
      }
      if (exp.date.startsWith(monthPrefix)) {
        monthCents += netCents;
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
        bucket = { totalCents: 0, pendingCount: 0, items: [] };
        map.set(exp.date, bucket);
      }
      bucket.totalCents += getNetSpendCents(exp);
      if (getPendingOwedCents(exp) > 0) {
        bucket.pendingCount += 1;
      }
      bucket.items.push(exp);
    }
    return map;
  }

  function renderRecentDescriptions() {
    const seen = new Set();
    const recent = [];
    const seenBorrowers = new Set();
    const recentBorrowers = [];

    for (let i = state.expenses.length - 1; i >= 0; i -= 1) {
      const exp = state.expenses[i];
      if (recent.length < 15) {
        const desc = exp.description.trim();
        const key = desc.toLowerCase();
        if (desc && !seen.has(key)) {
          seen.add(key);
          recent.push(desc);
        }
      }
      if (recentBorrowers.length < 15 && exp.reimbursement && exp.reimbursement.from) {
        const from = exp.reimbursement.from.trim();
        const key = from.toLowerCase();
        if (from && !seenBorrowers.has(key)) {
          seenBorrowers.add(key);
          recentBorrowers.push(from);
        }
      }
      if (recent.length >= 15 && recentBorrowers.length >= 15) break;
    }

    els.recentDescriptions.innerHTML = '';
    for (const item of recent) {
      const option = document.createElement('option');
      option.value = item;
      els.recentDescriptions.appendChild(option);
    }

    els.recentBorrowers.innerHTML = '';
    for (const person of recentBorrowers) {
      const option = document.createElement('option');
      option.value = person;
      els.recentBorrowers.appendChild(option);
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
      const pendingCount = bucket ? bucket.pendingCount : 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.dataset.date = cellKey;
      btn.setAttribute('role', 'gridcell');
      btn.title = `${formatFullDate(cellDate)}: ${formatMoney(dayCents)}`;
      btn.setAttribute(
        'aria-label',
        `${formatFullDate(cellDate)}: ${formatMoney(dayCents)} (${itemCount} expenses${
          pendingCount > 0 ? `, ${pendingCount} pending reimbursement` : ''
        })`
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

      if (itemCount > 0 || pendingCount > 0) {
        const badgesWrap = document.createElement('span');
        badgesWrap.className = 'cal-day-badges';

        if (pendingCount > 0) {
          const pendingDot = document.createElement('span');
          pendingDot.className = 'cal-day-pending-dot';
          pendingDot.title = `${pendingCount} pending reimbursement${pendingCount > 1 ? 's' : ''}`;
          badgesWrap.appendChild(pendingDot);
        }

        if (itemCount > 0) {
          const countBadge = document.createElement('span');
          countBadge.className = 'cal-day-dot';
          countBadge.textContent = `${itemCount}×`;
          badgesWrap.appendChild(countBadge);
        }

        top.appendChild(badgesWrap);
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
        byMethod.set(item.method, (byMethod.get(item.method) || 0) + getNetSpendCents(item));
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
        const reimb = exp.reimbursement;
        const netCents = getNetSpendCents(exp);

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

        if (reimb) {
          const reimbBadge = document.createElement('span');
          const fromText = reimb.from ? ` · from ${reimb.from}` : '';
          if (reimb.status === 'paid') {
            reimbBadge.className = 'reimb-badge-paid';
            const paidLabel = reimb.paidDate ? ` · ${formatShortDate(parseLocalDateKey(reimb.paidDate))}` : '';
            reimbBadge.textContent = `reimbursed ${formatMoney(reimb.owedCents)}${fromText}${paidLabel}`;
          } else {
            reimbBadge.className = 'reimb-badge-pending';
            reimbBadge.textContent = `owed ${formatMoney(reimb.owedCents)}${fromText}`;
          }
          meta.appendChild(reimbBadge);
        }

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

        if (reimb && reimb.status === 'paid' && netCents !== exp.cents) {
          const amtStack = document.createElement('div');
          amtStack.className = 'expense-amount-stack';

          const netAmt = document.createElement('span');
          netAmt.className = 'expense-amount';
          netAmt.textContent = formatMoney(netCents);

          const grossAmt = document.createElement('span');
          grossAmt.className = 'expense-amount-gross';
          grossAmt.title = `Original amount paid: ${formatMoney(exp.cents)}`;
          grossAmt.textContent = formatMoney(exp.cents);

          amtStack.appendChild(netAmt);
          amtStack.appendChild(grossAmt);
          right.appendChild(amtStack);
        } else {
          const amt = document.createElement('span');
          amt.className = 'expense-amount';
          amt.textContent = formatMoney(netCents);
          right.appendChild(amt);
        }

        if (reimb && reimb.status === 'pending') {
          const settleBtn = document.createElement('button');
          settleBtn.type = 'button';
          settleBtn.className = 'btn-settle';
          settleBtn.textContent = 'mark paid';
          settleBtn.addEventListener('click', () => markReimbursementPaid(exp.id));
          right.appendChild(settleBtn);
        } else if (reimb && reimb.status === 'paid') {
          const reopenBtn = document.createElement('button');
          reopenBtn.type = 'button';
          reopenBtn.className = 'btn-reopen';
          reopenBtn.textContent = 'unmark';
          reopenBtn.title = 'Revert reimbursement back to pending';
          reopenBtn.addEventListener('click', () => reopenReimbursement(exp.id));
          right.appendChild(reopenBtn);
        }

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

        right.appendChild(editBtn);
        right.appendChild(delBtn);

        li.appendChild(main);
        li.appendChild(right);
      }

      els.expenseList.appendChild(li);
    }
  }

  function renderPendingReimbursements() {
    const pendingItems = state.expenses
      .filter((exp) => getPendingOwedCents(exp) > 0)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    if (pendingItems.length === 0) {
      els.owedSection.classList.add('hidden');
      state.owedDrawerOpen = false;
      els.owedDrawer.classList.add('hidden');
      els.owedToggleBtn.setAttribute('aria-expanded', 'false');
      els.owedChevron.textContent = 'view ▾';
      els.owedList.innerHTML = '';
      return;
    }

    let totalOwedCents = 0;
    for (const item of pendingItems) {
      totalOwedCents += item.reimbursement.owedCents;
    }

    els.owedSection.classList.remove('hidden');
    els.owedCountBadge.textContent = `${pendingItems.length} pending`;
    els.owedTotalAmount.textContent = formatMoney(totalOwedCents);
    els.owedDrawer.classList.toggle('hidden', !state.owedDrawerOpen);
    els.owedToggleBtn.setAttribute('aria-expanded', String(state.owedDrawerOpen));
    els.owedChevron.textContent = state.owedDrawerOpen ? 'hide ▴' : 'view ▾';

    els.owedList.innerHTML = '';
    for (const exp of pendingItems) {
      const li = document.createElement('li');
      li.className = 'owed-item';

      const main = document.createElement('div');
      main.className = 'owed-item-main';

      const title = document.createElement('div');
      title.className = 'owed-item-title';
      title.textContent = exp.description;

      const meta = document.createElement('div');
      meta.className = 'owed-item-meta';

      const dateBtn = document.createElement('button');
      dateBtn.type = 'button';
      dateBtn.className = 'owed-date-btn';
      dateBtn.textContent = formatShortDate(parseLocalDateKey(exp.date));
      dateBtn.title = `Jump to ${exp.date}`;
      dateBtn.addEventListener('click', () => {
        selectDate(exp.date, parseLocalDateKey(exp.date));
      });
      meta.appendChild(dateBtn);

      const methodBadge = document.createElement('span');
      methodBadge.className = 'method-badge';
      methodBadge.textContent = exp.method;
      meta.appendChild(methodBadge);

      if (exp.reimbursement.from) {
        const fromSpan = document.createElement('span');
        fromSpan.textContent = `from ${exp.reimbursement.from}`;
        meta.appendChild(fromSpan);
      }

      if (exp.reimbursement.owedCents < exp.cents) {
        const splitSpan = document.createElement('span');
        splitSpan.textContent = `split of ${formatMoney(exp.cents)}`;
        meta.appendChild(splitSpan);
      }

      main.appendChild(title);
      main.appendChild(meta);

      const right = document.createElement('div');
      right.className = 'owed-item-right';

      const amt = document.createElement('span');
      amt.className = 'owed-item-amount';
      amt.textContent = formatMoney(exp.reimbursement.owedCents);

      const settleBtn = document.createElement('button');
      settleBtn.type = 'button';
      settleBtn.className = 'btn-settle';
      settleBtn.textContent = 'mark paid';
      settleBtn.addEventListener('click', () => markReimbursementPaid(exp.id));

      right.appendChild(amt);
      right.appendChild(settleBtn);

      li.appendChild(main);
      li.appendChild(right);
      els.owedList.appendChild(li);
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

    // Optional reimbursement controls inside inline edit
    const reimbRow = document.createElement('div');
    reimbRow.className = 'expense-edit-reimb-row';

    const reimbCheckLabel = document.createElement('label');
    const reimbCheck = document.createElement('input');
    reimbCheck.type = 'checkbox';
    reimbCheck.checked = Boolean(exp.reimbursement);
    reimbCheckLabel.appendChild(reimbCheck);
    reimbCheckLabel.appendChild(document.createTextNode('reimbursable'));

    const owedInput = document.createElement('input');
    owedInput.type = 'number';
    owedInput.inputMode = 'decimal';
    owedInput.step = '0.01';
    owedInput.min = '0.01';
    owedInput.placeholder = 'owed ₱';
    owedInput.value = exp.reimbursement
      ? (exp.reimbursement.owedCents / 100).toFixed(2)
      : (exp.cents / 100).toFixed(2);

    const fromInput = document.createElement('input');
    fromInput.type = 'text';
    fromInput.maxLength = 40;
    fromInput.placeholder = 'from who? (optional)';
    fromInput.value = exp.reimbursement ? exp.reimbursement.from : '';

    const statusSel = document.createElement('select');
    for (const st of ['pending', 'paid']) {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      statusSel.appendChild(opt);
    }
    statusSel.value = exp.reimbursement ? exp.reimbursement.status : 'pending';

    const syncEditReimbVisibility = () => {
      const active = reimbCheck.checked;
      owedInput.disabled = !active;
      fromInput.disabled = !active;
      statusSel.disabled = !active;
      owedInput.classList.toggle('hidden', !active);
      fromInput.classList.toggle('hidden', !active);
      statusSel.classList.toggle('hidden', !active);
    };
    reimbCheck.addEventListener('change', syncEditReimbVisibility);
    syncEditReimbVisibility();

    reimbRow.appendChild(reimbCheckLabel);
    reimbRow.appendChild(owedInput);
    reimbRow.appendChild(fromInput);
    reimbRow.appendChild(statusSel);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cents = toCents(amtInput.value);
      const description = descInput.value.trim();
      if (!cents || !description) return;

      let nextReimb = null;
      if (reimbCheck.checked) {
        const parsedOwed = toCents(owedInput.value) || cents;
        const clampedOwed = Math.min(cents, parsedOwed);
        const status = statusSel.value === 'paid' ? 'paid' : 'pending';
        nextReimb = {
          owedCents: clampedOwed,
          from: fromInput.value.trim().slice(0, 40),
          status,
          paidDate:
            status === 'paid'
              ? (exp.reimbursement && exp.reimbursement.paidDate) || getTodayKey()
              : null,
        };
      }

      exp.cents = cents;
      exp.description = description;
      exp.method = methodSel.value;
      if (nextReimb) exp.reimbursement = nextReimb;
      else delete exp.reimbursement;

      state.editingId = null;
      persistExpenses();
      renderAll();
    });

    form.appendChild(amtInput);
    form.appendChild(descInput);
    form.appendChild(methodSel);
    form.appendChild(saveBtn);
    form.appendChild(cancelBtn);
    form.appendChild(reimbRow);
    return form;
  }

  function renderAll() {
    const byDate = groupExpensesByDate();
    renderSummaryTotals();
    renderPendingReimbursements();
    renderCalendar(byDate);
    renderSelectedDayLedger(byDate);
    renderRecentDescriptions();
  }

  // Reimbursement Entry & Settlement Helpers
  function computeOwedCentsFromForm(totalCents) {
    if (!state.reimburseEnabled || !totalCents) return null;
    if (state.reimburseSplit === 'full') return totalCents;
    if (state.reimburseSplit === 'half') return Math.max(1, Math.round(totalCents / 2));
    return toCents(els.reimburseCustomInput.value);
  }

  function renderReimburseControls() {
    const customActive = state.reimburseEnabled && state.reimburseSplit === 'custom';
    els.reimburseToggleBtn.setAttribute('aria-pressed', String(state.reimburseEnabled));
    els.reimburseOptions.classList.toggle('hidden', !state.reimburseEnabled);
    els.reimburseCustomWrap.classList.toggle('hidden', !customActive);
    els.reimburseCustomInput.disabled = !customActive;
    els.reimburseFromInput.disabled = !state.reimburseEnabled;
    for (const pill of els.splitPills) {
      pill.classList.toggle('is-active', pill.dataset.split === state.reimburseSplit);
    }
    renderReimbursePreview();
  }

  function renderReimbursePreview() {
    if (!state.reimburseEnabled) {
      els.reimbursePreview.textContent = '';
      return;
    }
    const totalCents = toCents(els.amountInput.value);
    if (!totalCents) {
      els.reimbursePreview.textContent = state.reimburseSplit === 'half' ? '50% owed back' : '100% owed back';
      return;
    }
    const owedCents = computeOwedCentsFromForm(totalCents);
    if (!owedCents) {
      els.reimbursePreview.textContent = 'enter owed ₱';
      return;
    }
    if (owedCents > totalCents) {
      els.reimbursePreview.textContent = `exceeds ${formatMoney(totalCents)}`;
      return;
    }
    els.reimbursePreview.textContent = `owed back: ${formatMoney(owedCents)}`;
  }

  function resetReimburseEntry() {
    state.reimburseEnabled = false;
    state.reimburseSplit = 'full';
    els.reimburseCustomInput.value = '';
    els.reimburseFromInput.value = '';
    renderReimburseControls();
  }

  function markReimbursementPaid(id) {
    const exp = state.expenses.find((item) => item.id === id);
    if (!exp || !exp.reimbursement || exp.reimbursement.status === 'paid') return;

    const prevStatus = exp.reimbursement.status;
    const prevPaidDate = exp.reimbursement.paidDate;

    exp.reimbursement.status = 'paid';
    exp.reimbursement.paidDate = getTodayKey();
    persistExpenses();
    triggerBlahajSpin(1400);
    renderAll();

    showToast(`Marked "${exp.description}" reimbursed (${formatMoney(exp.reimbursement.owedCents)})`, () => {
      exp.reimbursement.status = prevStatus;
      exp.reimbursement.paidDate = prevPaidDate;
      persistExpenses();
      renderAll();
    });
  }

  function reopenReimbursement(id) {
    const exp = state.expenses.find((item) => item.id === id);
    if (!exp || !exp.reimbursement || exp.reimbursement.status !== 'paid') return;

    const prevPaidDate = exp.reimbursement.paidDate;
    exp.reimbursement.status = 'pending';
    exp.reimbursement.paidDate = null;
    persistExpenses();
    renderAll();

    showToast(`Reopened "${exp.description}" as pending`, () => {
      exp.reimbursement.status = 'paid';
      exp.reimbursement.paidDate = prevPaidDate;
      persistExpenses();
      renderAll();
    });
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

    let reimbursement = null;
    if (state.reimburseEnabled) {
      const owedCents = computeOwedCentsFromForm(cents);
      if (!owedCents || owedCents > cents) {
        setFormError(
          owedCents && owedCents > cents
            ? 'Owed amount cannot exceed the total amount paid.'
            : 'Enter a valid owed amount greater than 0.'
        );
        if (state.reimburseSplit === 'custom') {
          els.reimburseCustomInput.focus();
        }
        return;
      }
      reimbursement = {
        owedCents,
        from: els.reimburseFromInput.value.trim().slice(0, 40),
        status: 'pending',
        paidDate: null,
      };
    }

    const expense = {
      id: createId(),
      cents,
      description,
      method,
      date: dateKey,
      createdAt: Date.now(),
    };
    if (reimbursement) {
      expense.reimbursement = reimbursement;
    }

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
    resetReimburseEntry();
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

    const cleanExpense = {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createId(),
      cents,
      description,
      method,
      date,
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    };

    if (raw.reimbursement && typeof raw.reimbursement === 'object') {
      const r = raw.reimbursement;
      let owedCents = null;
      if (Number.isInteger(r.owedCents) && r.owedCents > 0) {
        owedCents = Math.min(cents, r.owedCents);
      } else if (r.owedAmount !== undefined) {
        const parsedOwed = toCents(r.owedAmount);
        if (parsedOwed) owedCents = Math.min(cents, parsedOwed);
      }
      if (owedCents) {
        const status = r.status === 'paid' ? 'paid' : 'pending';
        const paidDate =
          status === 'paid' && typeof r.paidDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.paidDate)
            ? r.paidDate
            : status === 'paid'
              ? date
              : null;
        cleanExpense.reimbursement = {
          owedCents,
          from: typeof r.from === 'string' ? r.from.trim().slice(0, 40) : '',
          status,
          paidDate,
        };
      }
    }

    return cleanExpense;
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
      [
        'Date',
        'Description',
        'Payment Method',
        'Amount Paid (PHP)',
        'Net Spend (PHP)',
        'Reimbursement Status',
        'Owed (PHP)',
        'From',
        'Paid Date',
      ],
      ...sorted.map((exp) => {
        const r = exp.reimbursement;
        return [
          exp.date,
          exp.description,
          exp.method,
          (exp.cents / 100).toFixed(2),
          (getNetSpendCents(exp) / 100).toFixed(2),
          r ? r.status : '',
          r ? (r.owedCents / 100).toFixed(2) : '',
          r ? r.from : '',
          r && r.paidDate ? r.paidDate : '',
        ];
      }),
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

    els.reimburseToggleBtn.addEventListener('click', () => {
      state.reimburseEnabled = !state.reimburseEnabled;
      renderReimburseControls();
      if (state.reimburseEnabled && state.reimburseSplit === 'custom') {
        els.reimburseCustomInput.focus();
      }
    });

    for (const pill of els.splitPills) {
      pill.addEventListener('click', () => {
        state.reimburseSplit = pill.dataset.split || 'full';
        renderReimburseControls();
        if (state.reimburseSplit === 'custom') {
          els.reimburseCustomInput.focus();
        }
      });
    }

    els.amountInput.addEventListener('input', renderReimbursePreview);
    els.reimburseCustomInput.addEventListener('input', renderReimbursePreview);

    els.owedToggleBtn.addEventListener('click', () => {
      state.owedDrawerOpen = !state.owedDrawerOpen;
      renderPendingReimbursements();
    });

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
  renderReimburseControls();
  initEvents();
  renderAll();
})();
