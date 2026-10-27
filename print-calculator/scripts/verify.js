const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

const outDir = process.env.VERIFY_OUT || path.join(__dirname, '..', 'verify-out');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shot(win, name) {
  await win.webContents.executeJavaScript(
    'new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(function () { resolve(true); }); }); })'
  );
  await wait(200);
  const image = await win.capturePage();
  const file = path.join(outDir, name);
  fs.writeFileSync(file, image.toPNG());
  return file;
}

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({
    width: 960,
    height: 1100,
    show: false,
    backgroundColor: '#667eea',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const failures = [];
  const report = [];

  try {
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    const title = await win.webContents.executeJavaScript('document.title');
    report.push('title=' + title);
    if (title !== 'Калькулятор печати') failures.push('title ' + title);

    const calc = await win.webContents.executeJavaScript(`
      (function () {
        var w = document.querySelector('.w-input');
        var h = document.querySelector('.h-input');
        function set(el, value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        set(w, '100');
        set(h, '100');
        return {
          row: document.querySelector('.row-result').textContent,
          price: document.getElementById('price').textContent
        };
      })()
    `);
    report.push('plain=' + JSON.stringify(calc));
    if (calc.row !== '350.00 ₽') failures.push('row ' + calc.row);
    if (calc.price !== '350.00 ₽') failures.push('price ' + calc.price);
    await shot(win, 'desktop-calc.png');

    const cut = await win.webContents.executeJavaScript(`
      (function () {
        var cb = document.querySelector('.service-cb');
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          row: document.querySelector('.row-result').textContent,
          price: document.getElementById('price').textContent
        };
      })()
    `);
    report.push('cut=' + JSON.stringify(cut));
    if (cut.row !== '950.00 ₽') failures.push('cut row ' + cut.row);
    if (cut.price !== '950.00 ₽') failures.push('cut price ' + cut.price);

    const admin = await win.webContents.executeJavaScript(`
      (function () {
        document.querySelector('[data-tab="admin"]').click();
        document.getElementById('admin-pass').value = 'admin';
        document.getElementById('login-btn').click();
        return {
          cards: document.querySelectorAll('#materials-list .admin-card').length,
          services: document.querySelectorAll('#services-admin-list .admin-card').length
        };
      })()
    `);
    report.push('admin=' + JSON.stringify(admin));
    if (admin.cards !== 6) failures.push('materials ' + admin.cards);
    if (admin.services !== 1) failures.push('services ' + admin.services);
    await shot(win, 'desktop-admin.png');
  } catch (err) {
    failures.push(String(err && err.stack || err));
  }

  const summary = { ok: failures.length === 0, failures: failures, report: report };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  app.exit(summary.ok ? 0 : 1);
});
