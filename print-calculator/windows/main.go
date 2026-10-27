// Программа Windows: одна страница калькулятора в уже установленном WebView2.
// Браузер не распаковывается и ничего не скачивается при запуске.
package main

import (
	"bytes"
	_ "embed"
	"os"
	"path/filepath"
	"strings"

	"github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
)

//go:embed web/index.html
var indexHTML []byte

//go:embed web/html2canvas.min.js
var html2canvasJS []byte

//go:embed web/jspdf.umd.min.js
var jspdfJS []byte

func main() {
	root, err := appDir()
	if err != nil {
		alert("Не удалось подготовить папку программы:\n" + err.Error())
		return
	}
	page := filepath.Join(root, "page")
	if err := writePage(page); err != nil {
		alert("Не удалось открыть страницу калькулятора:\n" + err.Error())
		return
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		AutoFocus: true,
		DataPath:  filepath.Join(root, "webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "Калькулятор печати",
			Width:  960,
			Height: 1100,
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		alert("На компьютере нет компонента Microsoft Edge WebView2.\n\nОн уже входит в Windows 11 и в обновлённую Windows 10. Эта программа его не скачивает и не распаковывает свой браузер.")
		return
	}
	defer w.Destroy()
	w.SetSize(420, 640, webview2.HintMin)
	w.Navigate(fileURL(filepath.Join(page, "index.html")))
	w.Run()
}

func appDir() (string, error) {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		var err error
		base, err = os.UserCacheDir()
		if err != nil {
			return "", err
		}
	}
	dir := filepath.Join(base, "PrintCalculator")
	return dir, os.MkdirAll(dir, 0o755)
}

func writePage(dir string) error {
	files := []struct {
		name string
		data []byte
	}{
		{"index.html", indexHTML},
		{filepath.Join("vendor", "html2canvas.min.js"), html2canvasJS},
		{filepath.Join("vendor", "jspdf.umd.min.js"), jspdfJS},
	}
	for _, file := range files {
		if err := writeIfChanged(filepath.Join(dir, file.name), file.data); err != nil {
			return err
		}
	}
	return nil
}

func writeIfChanged(path string, data []byte) error {
	if cur, err := os.ReadFile(path); err == nil && bytes.Equal(cur, data) {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func fileURL(path string) string {
	slash := filepath.ToSlash(path)
	if !strings.HasPrefix(slash, "/") {
		slash = "/" + slash
	}
	return (&urlPath{slash}).String()
}

type urlPath struct{ path string }

func (u urlPath) String() string {
	var b strings.Builder
	b.WriteString("file://")
	for _, r := range u.path {
		switch {
		case r == '/':
			b.WriteByte('/')
		case r == ':' || r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || strings.ContainsRune("-._~", r):
			b.WriteRune(r)
		default:
			b.WriteString(percent(r))
		}
	}
	return b.String()
}

func percent(r rune) string {
	buf := make([]byte, 0, 4)
	buf = append(buf, string(r)...)
	const hex = "0123456789ABCDEF"
	var out strings.Builder
	for _, c := range buf {
		out.WriteByte('%')
		out.WriteByte(hex[c>>4])
		out.WriteByte(hex[c&15])
	}
	return out.String()
}

func alert(text string) {
	title, err := windows.UTF16PtrFromString("Калькулятор печати")
	if err != nil {
		return
	}
	body, err := windows.UTF16PtrFromString(text)
	if err != nil {
		return
	}
	const mbOK = 0x00000000
	const mbIconInfo = 0x00000040
	_, _ = windows.MessageBox(0, body, title, mbOK|mbIconInfo)
}
