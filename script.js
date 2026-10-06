const puppeteer = require('puppeteer-core');
const fs = require('fs');

// ================= 1. REPLIT CONFIG =================
const TARGET_URL = 'https://replit.com/@shrqbabu/Gemini-Hub';

const REPLIT_COOKIE = 'eyJhbGciOiJSUzI1NiIsImtpZCI6Iktna0hjZyJ9.eyJpc3MiOiJodHRwczovL3Nlc3Npb24uZmlyZWJhc2UuZ29vZ2xlLmNvbS9yZXBsaXQtd2ViIiwibmFtZSI6InNocnEgYmFidSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJNm0xcmtWQ0lfUFJidFdqMm14eVExV3FCQzAyWGltbFN3TEszMHVKcVRDbGtscHdcdTAwM2RzOTYtYyIsInJvbGVzIjpbXSwicmVwbGl0X3VzZXJfaWQiOjYyNDAzODM4LCJhdWQiOiJyZXBsaXQtd2ViIiwiYXV0aF90aW1lIjoxNzkwNDA3NTU1LCJ1c2VyX2lkIjoiTWZEWEpOaU80cU1Db3pXN29FeE5GbUdpWXV3MSIsInN1YiI6Ik1mRFhKTmlPNHFNQ296VzdvRXhORm1HaVl1dzEiLCJpYXQiOjE3OTA0MTg3ODYsImV4cCI6MTc5MTYyODM4NiwiZW1haWwiOiJzaHJxYmFidTVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTM4MDQxNjQ0NzUzMzc5ODYxMTgiXSwiZW1haWwiOlsic2hycWJhYnU1QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.R4k23nccjgrJAWKR4Uco7q2OrTM_gVVA-hrMJl0N9z_7ZMaVdZuc1KAEG7PDMSeA4LFI8WErUG3whML6cC3SUgD8pryZYP0I79ED7v_OCD3mt9khZl0Gh24bLLIc9oNI1_14s54O9nq2VC4MxtIA7bU7uqlKGKlJ0aw_1eeJpa15Aj_0HdImL15urxrBM3GsZjSYPypP5lRMJPmQz0EJJd_FX8od-3uNyJ_nY8ji40brivUmevi3e0hjBYdDRpUexHLYPCMOp-riYTCVz3Mjh0dCcw22TV8t2QZazJJUu_CWfERd004egBcJRxhg8Q5ic-n2utXxBr2LDxWmDpIIeQ';

// Browser path detection (Windows Edge / Linux Chrome)
let CHROMIUM_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (process.platform === 'linux') {
  CHROMIUM_PATH = fs.existsSync('/opt/google/chrome/chrome') 
    ? '/opt/google/chrome/chrome' 
    : '/usr/bin/google-chrome';
}

// ================= 2. SUPABASE CONFIG =================
const SUPABASE_URL = process.env.SUPABASE_URL || "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "YOUR_SUPABASE_SERVICE_ROLE_KEY";

const CHANNELS = [
  {
    id: "starsp4",
    name: "Star Sports 4",
    pageUrl: "https://playsza.xyz/player.php?id=starsp4",
    referer: "https://playsza.xyz/"
  },
  {
    id: "willowhd",
    name: "Willow HD",
    pageUrl: "https://playsza.ru/player.php?id=willowhd",
    referer: "https://playsza.ru/"
  }
];

const STREAM_REFRESH_MINUTES = 45;

// ================= SUPABASE SYNC HELPER =================
async function syncToSupabase(streamData) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/live_streams`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(streamData)
    });

    if (res.ok) {
      console.log(`✅ [Supabase] Synced token for ${streamData.name}`);
    } else {
      console.error(`❌ [Supabase] Error:`, await res.text());
    }
  } catch (e) {
    console.error(`❌ [Supabase] Network Error:`, e.message);
  }
}

// ================= STREAM EXTRACTOR IN TEMPORARY TAB =================
async function extractStreamTokens(browser) {
  console.log(`\n>>> [Stream Worker] Starting M3U8 token refresh in background tab...`);
  let streamPage = null;

  try {
    streamPage = await browser.newPage();
    await streamPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

    // Block images & fonts to make it lightning fast
    await streamPage.setRequestInterception(true);
    streamPage.on('request', req => {
      const type = req.resourceType();
      if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    for (const ch of CHANNELS) {
      console.log(`>>> [Stream Worker] Checking channel: ${ch.name}`);
      let capturedUrl = null;

      const listener = (req) => {
        const u = req.url();
        if (u.includes('.m3u8')) {
          capturedUrl = u;
        }
      };

      streamPage.on('request', listener);

      try {
        await streamPage.goto(ch.pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        // Auto-click play button
        await streamPage.evaluate(() => {
          const btn = document.querySelector('video, #player, .play-wrapper, .vjs-big-play-button, button');
          if (btn) btn.click();
        }).catch(() => {});

        let waited = 0;
        while (!capturedUrl && waited < 12) {
          await new Promise(r => setTimeout(r, 1000));
          waited++;
        }

        streamPage.off('request', listener);

        if (capturedUrl) {
          console.log(`>>> [Stream Worker] Got M3U8 URL for ${ch.name}`);
          await syncToSupabase({
            id: ch.id,
            name: ch.name,
            m3u8_url: capturedUrl,
            referer: ch.referer,
            updated_at: new Date().toISOString()
          });
        } else {
          console.log(`⚠️ [Stream Worker] Could not find M3U8 for ${ch.name}`);
        }
      } catch (err) {
        streamPage.off('request', listener);
        console.error(`❌ [Stream Worker] Error on ${ch.name}:`, err.message);
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error(`❌ [Stream Worker] Global error:`, err.message);
  } finally {
    if (streamPage) {
      await streamPage.close().catch(() => {});
      console.log(`>>> [Stream Worker] Temporary tab closed. Only Replit tab is running.\n`);
    }
  }
}

// ================= MAIN RUNNER (REPLIT + STREAM) =================
async function start() {
  console.log('====================================================');
  console.log('   ALL-IN-ONE RUNNER (REPLIT 24/7 + STREAM TOKENS)  ');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 720 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--renderer-process-limit=2',
      '--disable-site-isolation-trials',
      '--disable-blink-features=AutomationControlled',
      '--blink-settings=imagesEnabled=false',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync'
    ]
  });

  // --- REPLIT TAB SETUP ---
  const replitPage = await browser.newPage();

  await replitPage.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  if (REPLIT_COOKIE) {
    const cookies = [
      { name: 'connect.sid', value: REPLIT_COOKIE, domain: '.replit.com', path: '/' },
      { name: 'replit:authtoken', value: REPLIT_COOKIE, domain: '.replit.com', path: '/' }
    ];
    for (const c of cookies) {
      await replitPage.setCookie(c).catch(() => {});
    }
  }

  await replitPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

  console.log('>>> [Replit] Navigating to Replit Workspace...');
  await replitPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log(e.message));

  // Cloudflare solver
  async function solveCloudflare() {
    try {
      const title = await replitPage.title().catch(() => '');
      if (title.includes('Just a moment')) {
        console.log('⚠️ Cloudflare Challenge detected! Finding checkbox...');
        for (const frame of replitPage.frames()) {
          const checkbox = await frame.$('input[type="checkbox"], .ctp-checkbox-label, #challenge-stage, .mark').catch(() => null);
          if (checkbox) {
            console.log('👉 Turnstile checkbox found! Clicking...');
            await checkbox.click().catch(() => {});
            await new Promise(r => setTimeout(r, 4000));
            break;
          }
        }
      }
    } catch (_) {}
  }

  await solveCloudflare();

  // Watcher: Monitor Replit Run button every 8s
  setInterval(async () => {
    try {
      await solveCloudflare();

      const clicked = await replitPage.evaluate(() => {
        const target = document.querySelector('[action="run_button_used"]') ||
                       document.querySelector('[data-action="run_button_used"]') ||
                       document.querySelector('button[aria-label*="Run"]');
        if (target) {
          target.click();
          return { success: true, text: 'Action Target' };
        }

        const elements = Array.from(document.querySelectorAll('button, div[role="button"], a, span'));
        for (const el of elements) {
          const t = (el.innerText || el.textContent || '').trim();
          if (t.includes('Run .replit run command') || t === 'Run' || t === '▶ Run') {
            const btn = el.closest('button') || el;
            btn.click();
            return { success: true, text: t };
          }
        }
        return { success: false };
      });

      if (clicked && clicked.success) {
        console.log(`[${new Date().toLocaleTimeString()}] 🚀 Replit Run Button Clicked!`);
      }
    } catch (_) {}
  }, 8000);

  // --- STREAM WORKER SCHEDULER ---
  // Start token extraction right away
  setTimeout(() => extractStreamTokens(browser), 15000);

  // Run token extraction every 45 minutes
  setInterval(() => {
    extractStreamTokens(browser);
  }, STREAM_REFRESH_MINUTES * 60 * 1000);

  browser.on('disconnected', () => {
    process.exit(0);
  });
}

start().catch(err => console.error(err));
