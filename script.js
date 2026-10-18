const puppeteer = require('puppeteer-core');

const TARGET_URL = 'https://replit.com/@shrqbabu/Gemini-Hub';
const REPLIT_COOKIE = 'eyJhbGciOiJSUzI1NiIsImtpZCI6Iktna0hjZyJ9.eyJpc3MiOiJodHRwczovL3Nlc3Npb24uZmlyZWJhc2UuZ29vZ2xlLmNvbS9yZXBsaXQtd2ViIiwibmFtZSI6InNocnEgYmFidSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJNm0xcmtWQ0lfUFJidFdqMm14eVExV3FCQzAyWGltbFN3TEszMHVKcVRDbGtscHdcdTAwM2RzOTYtYyIsInJvbGVzIjpbXSwicmVwbGl0X3VzZXJfaWQiOjYyNDAzODM4LCJhdWQiOiJyZXBsaXQtd2ViIiwiYXV0aF90aW1lIjoxNzkwNDA3NTU1LCJ1c2VyX2lkIjoiTWZEWEpOaU80cU1Db3pXN29FeE5GbUdpWXV3MSIsInN1YiI6Ik1mRFhKTmlPNHFNQ296VzdvRXhORm1HaVl1dzEiLCJpYXQiOjE3OTA0MTg3ODYsImV4cCI6MTc5MTYyODM4NiwiZW1haWwiOiJzaHJxYmFidTVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTM4MDQxNjQ0NzUzMzc5ODYxMTgiXSwiZW1haWwiOlsic2hycWJhYnU1QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.R4k23nccjgrJAWKR4Uco7q2OrTM_gVVA-hrMJl0N9z_7ZMaVdZuc1KAEG7PDMSeA4LFI8WErUG3whML6cC3SUgD8pryZYP0I79ED7v_OCD3mt9khZl0Gh24bLLIc9oNI1_14s54O9nq2VC4MxtIA7bU7uqlKGKlJ0aw_1eeJpa15Aj_0HdImL15urxrBM3GsZjSYPypP5lRMJPmQz0EJJd_FX8od-3uNyJ_nY8ji40brivUmevi3e0hjBYdDRpUexHLYPCMOp-riYTCVz3Mjh0dCcw22TV8t2QZazJJUu_CWfERd004egBcJRxhg8Q5ic-n2utXxBr2LDxWmDpIIeQ';
// Browser path detection (Windows Edge / Linux Chrome)
let CHROMIUM_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (process.platform === 'linux') {
  CHROMIUM_PATH = fs.existsSync('/opt/google/chrome/chrome') 
    ? '/opt/google/chrome/chrome' 
    : '/usr/bin/google-chrome';
}


async function start() {
  console.log('====================================================');
  console.log('    PC REPLIT AUTO-RUNNER (run_button_used mode)   ');
  console.log('====================================================');
  console.log('Target URL :', TARGET_URL);
  console.log('Browser    :', CHROMIUM_PATH);
  console.log('Status     : Starting browser...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    defaultViewport: null,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,820'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  if (REPLIT_COOKIE) {
    console.log('Applying authentication cookie...');
    await page.setCookie({
      name: 'connect.sid',
      value: REPLIT_COOKIE,
      url: 'https://replit.com'
    });
  }

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

  console.log('Loading Replit workspace...');
  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Workspace loaded successfully!');
  } catch (err) {
    console.log('Load notice:', err.message);
  }

  console.log('Smart Watcher active: Checking for [action="run_button_used"] every 5s...\n');

  // Watcher: Har 5 second me check karega
  setInterval(async () => {
    try {
      const clicked = await page.evaluate(() => {
        // 1. Direct querySelector se run_button_used dhoondhein
        const target = document.querySelector('[action="run_button_used"]') ||
                       document.querySelector('[data-action="run_button_used"]') ||
                       document.querySelector('[data-analytics*="run_button_used"]');
        if (target) {
          target.click();
          return { success: true, method: 'attribute' };
        }

        // 2. Child elements me attribute dhoondhein
        const container = document.querySelector('button:has([action="run_button_used"])');
        if (container) {
          container.click();
          return { success: true, method: 'has-child' };
        }

        // 3. Fallback: Button with "Run .replit run command" text
        const allElements = Array.from(document.querySelectorAll('button, div[role="button"], a, span'));
        for (const el of allElements) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.includes('Run .replit run command') || el.getAttribute('action') === 'run_button_used') {
            const btn = el.closest('button') || el;
            btn.click();
            return { success: true, method: 'text-match' };
          }
        }

        return { success: false };
      });

      if (clicked && clicked.success) {
        console.log(`[${new Date().toLocaleTimeString()}] 🚀 SUCCESS: Clicked Run Button via ${clicked.method}!`);
      }
    } catch (_) {}
  }, 5000);

  browser.on('disconnected', () => {
    console.log('Browser window closed. Exiting.');
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Fatal Error:', err);
});
