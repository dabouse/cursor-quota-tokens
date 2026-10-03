const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const PRODUCT_LABELS = {
  GrokBuild: 'Grok Build',
  GrokImagine: 'Imagine',
  GrokVoice: 'Voice',
  GrokChat: 'Chat',
  GrokAppBuilder: 'App Builder',
  GrokApi: 'API'
};

const PRODUCT_ORDER = ['GrokBuild', 'GrokImagine', 'GrokVoice', 'GrokChat', 'GrokAppBuilder', 'GrokApi'];

function authFile() {
  return path.join(os.homedir(), '.grok', 'auth.json');
}

function loadToken() {
  const raw = JSON.parse(fs.readFileSync(authFile(), 'utf8'));
  const entry = Object.values(raw)[0];
  if (!entry || !entry.key) {
    throw new Error('Grok CLI is not logged in. Open a terminal and run grok once.');
  }
  return entry.key;
}

function getJson(urlPath, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'cli-chat-proxy.grok.com',
      path: urlPath,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-XAI-Token-Auth': 'xai-grok-cli'
      },
      timeout: 12000
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`SuperGrok usage request failed (HTTP ${res.statusCode}). Run grok once to refresh the login.`);
          error.status = res.statusCode;
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('SuperGrok usage request timed out'));
    });
    req.end();
  });
}

function mapPlan(tier) {
  const value = String(tier || '').toLowerCase();
  if (value === 'grokpro' || value === 'supergrok' || value === 'grok_pro') {
    return { id: tier, text: 'SUPERGROK $30', title: 'SuperGrok' };
  }
  if (!tier) return null;
  return { id: tier, text: String(tier).toUpperCase(), title: String(tier) };
}

function calendarDaysUntil(date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function roundPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * Weekly SuperGrok pool used by Grok CLI.
 * creditUsagePercent is the shared total. Grok Build is the CLI slice of that same pool.
 */
async function getSuperGrokUsage() {
  const token = loadToken();
  const [billing, userResult] = await Promise.all([
    getJson('/v1/billing?format=credits', token),
    getJson('/v1/user?include=subscription', token).catch(() => null)
  ]);
  const plan = mapPlan(userResult?.subscriptionTier);
  const cfg = billing.config || billing;
  const period = cfg.currentPeriod || {};
  const periodStart = period.start || cfg.billingPeriodStart || null;
  const resetAt = period.end || cfg.billingPeriodEnd || null;
  const startDate = periodStart ? new Date(periodStart) : null;
  const resetDate = resetAt ? new Date(resetAt) : null;
  const daysUntilReset = resetDate ? calendarDaysUntil(resetDate) : null;
  const periodMs = startDate && resetDate ? resetDate.getTime() - startDate.getTime() : 0;
  const elapsedMs = startDate ? Date.now() - startDate.getTime() : 0;
  const periodPercent = periodMs > 0
    ? Math.min(100, Math.max(0, Math.round((elapsedMs / periodMs) * 100)))
    : 0;

  const products = (Array.isArray(cfg.productUsage) ? cfg.productUsage : [])
    .map((item) => ({
      id: item.product || 'unknown',
      name: PRODUCT_LABELS[item.product] || item.product || 'Unknown',
      percent: roundPercent(item.usagePercent),
      isCli: item.product === 'GrokBuild'
    }))
    .sort((a, b) => {
      const ai = PRODUCT_ORDER.indexOf(a.id);
      const bi = PRODUCT_ORDER.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const build = products.find((item) => item.isCli);

  return {
    ok: true,
    percentUsed: roundPercent(cfg.creditUsagePercent),
    products,
    buildPercent: build ? build.percent : null,
    periodStart,
    periodStartStr: startDate
      ? startDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : '',
    resetAt,
    resetDateStr: resetDate
      ? resetDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : '',
    daysUntilReset,
    periodPercent,
    planId: plan?.id || '',
    planText: plan?.text || 'SUPERGROK',
    planTitle: plan?.title || 'SuperGrok'
  };
}

module.exports = { getSuperGrokUsage };
