const vscode = require('vscode');

class StatusBarManager {
  constructor(context) {
    this.context = context;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
    this.item.command = 'cursorQuota.openDashboard';
    this.context.subscriptions.push(this.item);
  }

  /**
   * Format token counts as K / M / B.
   */
  formatTokens(num) {
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

  /**
   * Update status bar with latest aggregated data
   */
  update(data) {
    if (!data || !data.quota) {
      this.item.text = '$(dashboard) Cursor: --';
      this.item.tooltip = 'Click to open the Cursor quota dashboard';
      this.item.show();
      return;
    }

    const config = vscode.workspace.getConfiguration('cursorQuota');
    const format = config.get('statusBarFormat', 'requests_and_tokens');
    const lowThreshold = config.get('lowQuotaThreshold', 15);

    const { used, limit, remaining, percentUsed, daysUntilReset, hasNumericLimit, isQueueSlow } = data.quota;
    const todayTokens = data.tokens?.today?.totalTokens || 0;
    const todayTokensStr = this.formatTokens(todayTokens);
    const usedPct = Number.isFinite(Number(percentUsed)) ? Math.round(Number(percentUsed)) : 0;
    const remainingPct = Math.max(0, 100 - usedPct);
    const exhausted = !!(isQueueSlow || (hasNumericLimit && remaining <= 0 && usedPct >= 100));

    let label = '';
    switch (format) {
      case 'requests_only':
        label = exhausted
          ? '🐢 Slow queue'
          : (hasNumericLimit ? `⚡ ${remaining}/${limit}` : `⚡ ${usedPct}% used`);
        break;
      case 'percent_only':
        label = exhausted ? '🐢 Slow' : `⚡ ${remainingPct}% left`;
        break;
      case 'tokens_only':
        label = `⚡ ${todayTokensStr} tok`;
        break;
      case 'requests_and_tokens':
      default:
        label = exhausted
          ? `🐢 Slow queue | ${todayTokensStr} tok`
          : (hasNumericLimit
            ? `⚡ ${remaining}/${limit} | ${todayTokensStr} tok`
            : `⚡ ${usedPct}% used | ${todayTokensStr} tok`);
        break;
    }

    this.item.text = label;

    // Severity color (gentle warning instead of alarming crash-red)
    if (exhausted || remainingPct <= lowThreshold) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.backgroundColor = undefined;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const membership = (data.profile?.membershipType || 'free').toUpperCase();
    md.appendMarkdown(`### **Cursor quota and tokens**\n\n`);
    md.appendMarkdown(`**Account**: ${data.profile?.name || 'Cursor user'} (${membership})\n\n`);
    md.appendMarkdown(`---\n\n`);

    if (exhausted) {
      md.appendMarkdown(`**Mode**: **Slow queue** (included quota used up)\n\n`);
    } else {
      md.appendMarkdown(`**Mode**: **Fast** (included usage ${usedPct}% used)\n\n`);
    }

    md.appendMarkdown(`**Included usage**: **${usedPct}% used**\n\n`);
    if (data.quota.hasCursorModelsPool) {
      md.appendMarkdown(`**Cursor Models**: **${data.quota.autoPercentUsed ?? 0}% used**\n\n`);
    } else {
      md.appendMarkdown(`**Cursor Models**: not included in this plan\n\n`);
    }
    if (data.quota.hasOtherModelsPool !== false) {
      md.appendMarkdown(`**Other Models**: **${data.quota.apiPercentUsed ?? 0}% used**\n\n`);
    }
    if (hasNumericLimit) {
      md.appendMarkdown(`**Plan usage**: **${used.toLocaleString('en-US')}** / **${limit.toLocaleString('en-US')}**\n\n`);
    }
    if (data.quota.billingCycleEnd) {
      md.appendMarkdown(`**Reset**: **${daysUntilReset} days** (${data.quota.billingCycleEnd})\n\n`);
    }
    if (data.sandUsage && data.sandUsage.included) {
      md.appendMarkdown(`**Grok Bot weekly quota**: ${data.sandUsage.usagePercent}% used (weekly reset, not the editor Grok model)\n\n`);
    }
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`**Tokens today**: **${todayTokens.toLocaleString('en-US')}**\n\n`);
    if (data.tokens?.today?.costCents > 0) {
      md.appendMarkdown(`**Estimated value today**: **$${(data.tokens.today.costCents / 100).toFixed(2)}**\n\n`);
    }
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`[Open the usage dashboard](command:cursorQuota.openDashboard)`);

    this.item.tooltip = md;
    this.item.show();
  }

  showLoading() {
    this.item.text = '$(sync~spin) Checking Cursor quota...';
    this.item.show();
  }

  showError(msg) {
    this.item.text = '$(warning) Cursor: auth failed';
    this.item.tooltip = `Error: ${msg}\nClick to retry, or set a token manually.`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.item.show();
  }
}

module.exports = { StatusBarManager };
