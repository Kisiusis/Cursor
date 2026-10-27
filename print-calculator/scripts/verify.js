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
  await wait(250);
  const image = await win.capturePage();
  const file = path.join(outDir, name);
  fs.writeFileSync(file, image.toPNG());
  return file;
}

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({
    width: 820,
    height: 1040,
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
    if (title !== 'Калькулятор печати') failures.push('title mismatch: ' + title);

    const styles = await win.webContents.executeJavaScript(
      'document.querySelectorAll("style").length + ":" + document.styleSheets[0].cssRules.length'
    );
    report.push('styles=' + styles);

    await shot(win, '01-initial.png');

    const calc = await win.webContents.executeJavaScript(`
      (function () {
        var w = document.querySelectorAll('.w-input');
        var h = document.querySelectorAll('.h-input');
        function set(el, value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        set(w[0], '100');
        set(h[0], '100');
        set(w[1], '50');
        set(h[1], '50');
        return {
          price: document.getElementById('price').textContent,
          row0: document.querySelectorAll('.row-result')[0].textContent,
          row1: document.querySelectorAll('.row-result')[1].textContent,
          visible: document.getElementById('result').style.display
        };
      })()
    `);
    report.push('no-cut=' + JSON.stringify(calc));
    if (calc.row0 !== '350.00 ₽') failures.push('row0 expected 350.00 ₽, got ' + calc.row0);
    if (calc.row1 !== '87.50 ₽') failures.push('row1 expected 87.50 ₽, got ' + calc.row1);
    if (calc.price !== '437.50 ₽') failures.push('sum expected 437.50 ₽, got ' + calc.price);

    await win.webContents.executeJavaScript(
      "document.getElementById('result').scrollIntoView({ block: 'center' })"
    );
    await shot(win, '02-calculated.png');

    const cut = await win.webContents.executeJavaScript(`
      (function () {
        var cb = document.getElementById('cut-enabled');
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          price: document.getElementById('price').textContent,
          row0: document.querySelectorAll('.row-result')[0].textContent,
          row1: document.querySelectorAll('.row-result')[1].textContent,
          hint: document.getElementById('cut-hint').textContent
        };
      })()
    `);
    report.push('cut=' + JSON.stringify(cut));
    if (cut.row0 !== '950.00 ₽') failures.push('cut row0 expected 950.00 ₽, got ' + cut.row0);
    if (cut.row1 !== '387.50 ₽') failures.push('cut row1 expected 387.50 ₽, got ' + cut.row1);
    if (cut.price !== '1337.50 ₽') failures.push('cut sum expected 1337.50 ₽, got ' + cut.price);

    await win.webContents.executeJavaScript(
      "document.getElementById('result').scrollIntoView({ block: 'center' })"
    );
    await shot(win, '03-with-cut.png');

    const admin = await win.webContents.executeJavaScript(`
      (function () {
        document.querySelector('[data-tab="admin"]').click();
        document.getElementById('admin-pass').value = 'admin';
        document.getElementById('login-btn').click();
        return {
          loginHidden: document.getElementById('admin-login').style.display,
          content: document.getElementById('admin-content').style.display,
          cards: document.querySelectorAll('.admin-card').length,
          cutPrice: document.getElementById('cut-price-input').value
        };
      })()
    `);
    report.push('admin=' + JSON.stringify(admin));
    if (admin.loginHidden !== 'none') failures.push('admin login still visible');
    if (admin.content !== 'block') failures.push('admin content hidden');
    if (admin.cards !== 6) failures.push('expected 6 materials, got ' + admin.cards);
    if (admin.cutPrice !== '150') failures.push('cut price expected 150, got ' + admin.cutPrice);

    await win.webContents.executeJavaScript(
      "document.getElementById('materials-list').scrollIntoView({ block: 'start' })"
    );
    await shot(win, '04-admin.png');
  } catch (err) {
    failures.push(String(err && err.stack || err));
  }

  const summary = { ok: failures.length === 0, failures: failures, report: report };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  app.exit(summary.ok ? 0 : 1);
});
