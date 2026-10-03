(function() {
  const vscode = acquireVsCodeApi();

  // DOM Elements
  const btnRefresh = document.getElementById('btnRefresh');
  const refreshIcon = document.getElementById('refreshIcon');

  const userAvatar = document.getElementById('userAvatar');
  const avatarFallback = document.getElementById('avatarFallback');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userTier = document.getElementById('userTier');
  const sectionQuotaTitle = document.getElementById('sectionQuotaTitle');

  const queueBadge = document.getElementById('queueBadge');
  const includedName = document.getElementById('includedName');
  const includedPct = document.getElementById('includedPct');
  const includedBar = document.getElementById('includedBar');
  const includedHint = document.getElementById('includedHint');
  const superGrokProducts = document.getElementById('superGrokProducts');
  const planTotalPool = document.getElementById('planTotalPool');
  const planTotalPct = document.getElementById('planTotalPct');
  const planTotalBar = document.getElementById('planTotalBar');
  const planTotalHint = document.getElementById('planTotalHint');
  const cursorModelPct = document.getElementById('cursorModelPct');
  const cursorModelBar = document.getElementById('cursorModelBar');
  const cursorModelPool = document.getElementById('cursorModelPool');
  const cursorModelUnavailable = document.getElementById('cursorModelUnavailable');
  const otherModelPct = document.getElementById('otherModelPct');
  const otherModelBar = document.getElementById('otherModelBar');
  const otherModelPool = document.getElementById('otherModelPool');
  const otherModelUnavailable = document.getElementById('otherModelUnavailable');
  const queueStatusBanner = document.getElementById('queueStatusBanner');
  const queueAlertTitle = document.getElementById('queueAlertTitle');
  const queueAlertDesc = document.getElementById('queueAlertDesc');
  const daysResetPill = document.getElementById('daysResetPill');
  const daysCount = document.getElementById('daysCount');
  const cycleProgress = document.getElementById('cycleProgress');
  const cycleStart = document.getElementById('cycleStart');
  const cycleEnd = document.getElementById('cycleEnd');

  const sandPercentBadge = document.getElementById('sandPercentBadge');
  const sandUsedVal = document.getElementById('sandUsedVal');
  const sandProgress = document.getElementById('sandProgress');
  const sandResetDate = document.getElementById('sandResetDate');
  const sandCard = document.getElementById('sandCard');
  const sandUnavailable = document.getElementById('sandUnavailable');
  const sectionCycleTitle = document.getElementById('sectionCycleTitle');
  const cycleGrid = document.getElementById('cycleGrid');
  const cycleKind = document.getElementById('cycleKind');

  const todayCostBadge = document.getElementById('todayCostBadge');
  const todayTokens = document.getElementById('todayTokens');
  const cacheHitRatio = document.getElementById('cacheHitRatio');
  const segInput = document.getElementById('segInput');
  const segCache = document.getElementById('segCache');
  const segOutput = document.getElementById('segOutput');
  const todayInput = document.getElementById('todayInput');
  const todayCache = document.getElementById('todayCache');
  const todayOutput = document.getElementById('todayOutput');
  const todayRequestsCount = document.getElementById('todayRequestsCount');

  const totalEventsCount = document.getElementById('totalEventsCount');
  const modelsList = document.getElementById('modelsList');

  const heatStatActive = document.getElementById('heatStatActive');
  const heatStatPeak = document.getElementById('heatStatPeak');
  const heatStatTotal = document.getElementById('heatStatTotal');
  const heatmapGrid = document.getElementById('heatmapGrid');
  const heatmapTooltip = document.getElementById('heatmapTooltip');
  const heatHoverDate = document.getElementById('heatHoverDate');

  const eventsTbody = document.getElementById('eventsTbody');

  const MODEL_COLORS = [
    '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#eab308', '#06b6d4'
  ];

  // Refresh button click
  btnRefresh.addEventListener('click', () => {
    if (refreshIcon) refreshIcon.classList.add('spinning');
    vscode.postMessage({ command: 'refresh' });
    setTimeout(() => {
      if (refreshIcon) refreshIcon.classList.remove('spinning');
    }, 4000);
  });

  // Listen for messages from extension
  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
      render(message.data);
      if (refreshIcon) refreshIcon.classList.remove('spinning');
    } else if (message.type === 'loading') {
      if (refreshIcon) refreshIcon.classList.add('spinning');
    } else if (message.type === 'error') {
      if (refreshIcon) refreshIcon.classList.remove('spinning');
    }
  });

  // Tell extension we are ready
  vscode.postMessage({ command: 'ready' });

  /**
   * Format token counts as K / M / B.
   */
  function formatTokens(num) {
    if (num == null || isNaN(num)) return '0';
    num = Number(num);
    if (num === 0) return '0';
    if (num >= 1e9) {
      const billions = num / 1e9;
      return parseFloat(billions.toFixed(billions >= 100 ? 1 : 2)) + 'B';
    }
    if (num >= 1e6) {
      const millions = num / 1e6;
      return parseFloat(millions.toFixed(millions >= 100 ? 1 : 2)) + 'M';
    }
    if (num >= 1e3) {
      const thousands = num / 1e3;
      return parseFloat(thousands.toFixed(thousands >= 100 ? 1 : 2)) + 'K';
    }
    return num.toLocaleString('en-US');
  }

  function formatNumber(num) {
    return (num || 0).toLocaleString('en-US');
  }

  function usedPercentLabel(value) {
    const n = Number(value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    return `${pct}% used`;
  }

  function barWidth(value) {
    const n = Number(value);
    const pct = Number.isFinite(n) ? n : 0;
    return `${Math.min(100, Math.max(0, pct))}%`;
  }

  function setPoolVisible(poolEl, unavailableEl, visible) {
    if (poolEl) poolEl.hidden = !visible;
    if (unavailableEl) unavailableEl.hidden = visible;
  }

  /**
   * Format membership tier with accurate display name and class
   */
  function formatMembership(tier) {
    if (!tier) return { text: 'FREE', cls: 'tier-free', title: 'Free' };
    const t = String(tier).toLowerCase().trim();
    switch (t) {
      case 'free':
        return { text: 'FREE', cls: 'tier-free', title: 'Free' };
      case 'hobby':
        return { text: 'HOBBY', cls: 'tier-free', title: 'Hobby' };
      case 'pro':
        return { text: 'PRO $20/MO', cls: 'tier-pro', title: 'Pro' };
      case 'pro_plus':
      case 'pro+':
        return { text: 'PRO+ $60/MO', cls: 'tier-pro-plus', title: 'Pro+' };
      case 'business':
        return { text: 'BUSINESS $40/MO', cls: 'tier-business', title: 'Business' };
      case 'enterprise':
        return { text: 'ENTERPRISE', cls: 'tier-enterprise', title: 'Enterprise' };
      default:
        const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
        return { text: t.toUpperCase(), cls: 'tier-pro', title: capitalized };
    }
  }

  function render(data) {
    if (!data) return;

    // 1. Account Profile
    if (data.profile) {
      userName.textContent = data.profile.name || 'Cursor user';
      userEmail.textContent = data.profile.email || '';

      const tierInfo = formatMembership(data.profile.membershipType);
      userTier.textContent = tierInfo.text;
      userTier.className = `account-tier ${tierInfo.cls}`;

      if (sectionQuotaTitle) {
        sectionQuotaTitle.textContent = `Included in ${tierInfo.title}`;
      }

      if (data.profile.avatarUrl) {
        userAvatar.src = data.profile.avatarUrl;
        userAvatar.style.display = 'block';
        avatarFallback.style.display = 'none';
      } else {
        userAvatar.style.display = 'none';
        avatarFallback.style.display = 'inline';
        avatarFallback.textContent = (data.profile.name || 'C').charAt(0).toUpperCase();
      }
    }

    // 2. SuperGrok weekly pool. Grok CLI spends this shared total, and the Grok Build slice.
    const sg = data.superGrok;
    if (sg && sg.ok) {
      if (sectionQuotaTitle) sectionQuotaTitle.textContent = 'SuperGrok';
      if (userTier) {
        userTier.textContent = sg.planText || 'SUPERGROK $30';
        userTier.className = 'account-tier tier-pro';
      }
      if (queueBadge) queueBadge.hidden = true;
      if (includedName) includedName.textContent = 'Weekly limit';
      if (includedPct) includedPct.textContent = usedPercentLabel(sg.percentUsed);
      if (includedBar) includedBar.style.width = barWidth(sg.percentUsed);
      if (includedHint) {
        const when = sg.resetDateStr ? ` (${sg.resetDateStr})` : '';
        const days = sg.daysUntilReset == null ? 'every week' : `in ${sg.daysUntilReset} days${when}`;
        includedHint.textContent = `Shared pool. Grok CLI counts in this total and in Grok Build. Resets ${days}.`;
      }
      if (superGrokProducts) {
        superGrokProducts.hidden = false;
        superGrokProducts.innerHTML = (sg.products || []).map((product) => `
          <div class="sg-row">
            <div class="sg-head">
              <span>${escapeHtml(product.name)}${product.isCli ? '<span class="sg-cli">Grok CLI</span>' : ''}</span>
              <span>${product.percent}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${product.isCli ? 'fill-blue' : 'fill-slate'}" style="width: ${barWidth(product.percent)};"></div>
            </div>
          </div>
        `).join('');
      }
      if (planTotalPool) planTotalPool.hidden = true;
      if (cursorModelPool) cursorModelPool.hidden = true;
      if (cursorModelUnavailable) cursorModelUnavailable.hidden = true;
      if (otherModelPool) otherModelPool.hidden = true;
      if (otherModelUnavailable) otherModelUnavailable.hidden = true;
      if (queueStatusBanner) queueStatusBanner.hidden = true;
      if (sectionCycleTitle) sectionCycleTitle.parentElement.hidden = false;
      if (cycleGrid) cycleGrid.hidden = false;
      if (sectionCycleTitle) sectionCycleTitle.textContent = 'Billing cycle';
      if (cycleKind) cycleKind.textContent = 'Weekly reset';
      const daysLeft = sg.daysUntilReset || 0;
      if (daysCount) daysCount.textContent = String(daysLeft);
      if (daysResetPill) daysResetPill.textContent = `${daysLeft} days`;
      if (cycleStart) cycleStart.textContent = sg.periodStartStr ? `Start: ${sg.periodStartStr}` : 'Start: --';
      if (cycleEnd) cycleEnd.textContent = sg.resetDateStr ? `Reset: ${sg.resetDateStr}` : 'Reset: --';
      if (cycleProgress) cycleProgress.style.width = `${sg.periodPercent || 0}%`;
    } else if (data.quota) {
      const q = data.quota;
      const totalPct = q.totalPercentUsed !== undefined ? q.totalPercentUsed : q.percentUsed;
      const autoPct = q.autoPercentUsed !== undefined ? q.autoPercentUsed : totalPct;
      const apiPct = q.apiPercentUsed !== undefined ? q.apiPercentUsed : totalPct;

      if (includedName) includedName.textContent = 'Included usage';
      if (includedPct) includedPct.textContent = usedPercentLabel(totalPct);
      if (includedBar) includedBar.style.width = barWidth(totalPct);
      if (includedHint) {
        includedHint.textContent = sg && sg.error
          ? sg.error
          : (q.includedTotalMessage || 'Included usage reported by Cursor');
      }
      if (planTotalPool) planTotalPool.hidden = true;
      if (superGrokProducts) superGrokProducts.hidden = true;

      const membership = String(data.profile?.membershipType || '').toLowerCase();
      const hasCursorModelsPool = q.hasCursorModelsPool !== undefined
        ? !!q.hasCursorModelsPool
        : !(membership === 'free' || membership === 'hobby');
      const hasOtherModelsPool = q.hasOtherModelsPool !== undefined
        ? !!q.hasOtherModelsPool
        : membership !== 'start';

      setPoolVisible(cursorModelPool, cursorModelUnavailable, hasCursorModelsPool);
      setPoolVisible(otherModelPool, otherModelUnavailable, hasOtherModelsPool);

      if (hasCursorModelsPool) {
        cursorModelPct.textContent = usedPercentLabel(autoPct);
        cursorModelBar.style.width = barWidth(autoPct);
      }

      if (hasOtherModelsPool) {
        otherModelPct.textContent = usedPercentLabel(apiPct);
        otherModelBar.style.width = barWidth(apiPct);
        const otherHint = otherModelPool ? otherModelPool.querySelector('.pool-hint') : null;
        if (otherHint && q.apiUsageMessage) otherHint.textContent = q.apiUsageMessage;
      }

      const isSlow = q.isQueueSlow ?? (totalPct >= 100 && !q.onDemandEnabled);

      if (isSlow) {
        queueBadge.textContent = 'Slow queue';
        queueBadge.className = 'status-pill pill-amber';
        queueStatusBanner.className = 'queue-alert-banner';
        queueStatusBanner.querySelector('.queue-alert-icon').textContent = '🐢';
        queueAlertTitle.textContent = 'Slow queue';
        queueAlertDesc.textContent = 'Included quota is used up and on-demand billing is off. You can keep working. Upgrade to Pro+ or turn on on-demand billing for faster responses.';
      } else {
        queueBadge.textContent = 'Fast';
        queueBadge.className = 'status-pill pill-green';
        queueStatusBanner.className = 'queue-alert-banner fast';
        queueStatusBanner.querySelector('.queue-alert-icon').textContent = '⚡';
        queueAlertTitle.textContent = 'Fast mode';
        queueAlertDesc.textContent = 'Requests are served at this plan\'s highest priority.';
      }



      // Billing Cycle
      const days = q.daysUntilReset || 0;
      daysCount.textContent = String(days);
      daysResetPill.textContent = `${days} days`;
      if (cycleStart) cycleStart.textContent = q.billingCycleStart ? `Start: ${q.billingCycleStart}` : 'Start: --';
      if (cycleEnd) cycleEnd.textContent = q.resetDateStr ? `Reset: ${q.resetDateStr}` : 'Reset: --';

      const daysPassed = Math.max(0, 30 - days);
      const cycleProgPct = Math.min(100, Math.max(0, Math.round((daysPassed / 30) * 100)));
      if (cycleProgress) cycleProgress.style.width = `${cycleProgPct}%`;
    }

    if (sandCard) sandCard.hidden = true;
    if (sandUnavailable) sandUnavailable.hidden = true;
    if (cycleGrid) cycleGrid.classList.add('single');

    // 4. Today Tokens & Metrics
    if (data.tokens && data.tokens.today) {
      const td = data.tokens.today;
      todayTokens.textContent = formatTokens(td.totalTokens);
      todayInput.textContent = formatTokens(td.inputTokens);
      todayCache.textContent = formatTokens(td.cacheTokens);
      todayOutput.textContent = formatTokens(td.outputTokens);
      todayRequestsCount.textContent = formatNumber(td.requestsCount || 0);

      const costDollars = (td.costCents / 100).toFixed(2);
      todayCostBadge.textContent = `$${costDollars} est.`;

      // Calculate cache hit ratio
      const denom = (td.inputTokens + td.cacheTokens);
      const hitPct = denom > 0 ? ((td.cacheTokens / denom) * 100).toFixed(1) : '0.0';
      if (cacheHitRatio) cacheHitRatio.textContent = `${hitPct}%`;

      // Segmented bar
      const sum = td.inputTokens + td.cacheTokens + td.outputTokens;
      if (sum > 0) {
        const inPct = Math.max(2, (td.inputTokens / sum) * 100);
        const cachePct = Math.max(2, (td.cacheTokens / sum) * 100);
        const outPct = Math.max(2, (td.outputTokens / sum) * 100);
        segInput.style.width = `${inPct}%`;
        segCache.style.width = `${cachePct}%`;
        segOutput.style.width = `${outPct}%`;
      }
    }

    // 5. Models Distribution
    if (data.models && Array.isArray(data.models)) {
      totalEventsCount.textContent = `${formatNumber(data.tokens?.totalCount || 0)} requests logged`;
      modelsList.innerHTML = '';

      data.models.forEach((m, idx) => {
        const color = MODEL_COLORS[idx % MODEL_COLORS.length];
        const row = document.createElement('div');
        row.className = 'model-row';
        row.innerHTML = `
          <div class="model-info-row">
            <div class="model-left">
              <span class="model-dot" style="background: ${color};"></span>
              <span class="model-title">${escapeHtml(m.name)}</span>
            </div>
            <div class="model-right">
              <span class="model-tok">${formatTokens(m.totalTokens)} tok</span>
              <span class="model-pct-text">${m.percent}%</span>
            </div>
          </div>
          <div class="model-bar-bg">
            <div class="model-bar-fill" style="width: ${m.percent}%; background: ${color};"></div>
          </div>
        `;
        modelsList.appendChild(row);
      });
    }

    // 6. GitHub Activity Heatmap
    if (data.dailyMap) {
      renderHeatmap(data.dailyMap);
    }

    // 7. Recent Requests Table
    if (data.recentEvents && Array.isArray(data.recentEvents)) {
      eventsTbody.innerHTML = '';
      data.recentEvents.slice(0, 25).forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="color: var(--text-muted);">${ev.timeStr}</td>
          <td style="font-weight: 600;">${escapeHtml(ev.model)}</td>
          <td>
            <span style="color: var(--input-color);">${formatTokens(ev.inputTokens)}</span> /
            <span style="color: var(--output-color);">${formatTokens(ev.outputTokens)}</span> /
            <span style="color: var(--cache-color);">${formatTokens(ev.cacheTokens)}</span>
          </td>
          <td style="color: #10b981; font-weight: 600;">${ev.costStr}</td>
        `;
        eventsTbody.appendChild(tr);
      });
    }
  }

  function renderHeatmap(dailyMap) {
    heatmapGrid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const past90 = new Date(today);
    past90.setDate(past90.getDate() - 90);

    // Find Sunday on or before past90
    const startSunday = new Date(past90);
    startSunday.setDate(startSunday.getDate() - startSunday.getDay());

    let maxTokens = 0;
    let activeDays = 0;
    let totalTokens = 0;

    const daysList = [];
    const curr = new Date(startSunday);
    while (curr <= today) {
      const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      const dayData = dailyMap[dateKey];
      const tok = dayData ? dayData.totalTokens : 0;
      if (tok > 0) {
        activeDays++;
        totalTokens += tok;
        if (tok > maxTokens) maxTokens = tok;
      }
      daysList.push({
        date: dateKey,
        tokens: tok,
        requests: dayData ? dayData.requestsCount : 0
      });
      curr.setDate(curr.getDate() + 1);
    }

    heatStatActive.textContent = `${activeDays} days`;
    heatStatPeak.textContent = `${formatTokens(maxTokens)} tok`;
    heatStatTotal.textContent = `${formatTokens(totalTokens)} tok`;

    daysList.forEach(item => {
      const cell = document.createElement('div');
      cell.className = 'heat-cell';

      let lvl = 0;
      if (item.tokens > 0 && maxTokens > 0) {
        const ratio = item.tokens / maxTokens;
        if (ratio > 0.6) lvl = 4;
        else if (ratio > 0.3) lvl = 3;
        else if (ratio > 0.1) lvl = 2;
        else lvl = 1;
        cell.classList.add(`lvl-${lvl}`);
      }

      cell.addEventListener('mouseenter', e => {
        heatHoverDate.textContent = `${item.date}: ${formatNumber(item.tokens)} tokens (${item.requests} requests)`;
        heatmapTooltip.innerHTML = `<strong>${item.date}</strong><br/>${formatNumber(item.tokens)} tokens<br/>${item.requests} requests`;
        heatmapTooltip.style.opacity = '1';
        const rect = cell.getBoundingClientRect();
        heatmapTooltip.style.left = `${rect.left}px`;
        heatmapTooltip.style.top = `${rect.top - 48}px`;
      });

      cell.addEventListener('mouseleave', () => {
        heatmapTooltip.style.opacity = '0';
        heatHoverDate.textContent = 'Hover a square for details';
      });

      heatmapGrid.appendChild(cell);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
