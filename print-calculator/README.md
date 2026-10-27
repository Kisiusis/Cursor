# Калькулятор печати

Страница `index.html` — та же вёрстка, стили и расчёт. Библиотеки PDF лежат в `vendor/` и не скачиваются при открытии.

Готовые файлы лежат в этой же папке:

- [PrintCalculator.exe](PrintCalculator.exe) — Windows, один файл. Запускается сразу, без распаковки браузера и без загрузки файлов из интернета. Окно называется «Калькулятор печати».
- [PrintCalculator-Windows.zip](PrintCalculator-Windows.zip) — тот же exe в архиве.
- [PrintCalculator-Android.zip](PrintCalculator-Android.zip) — Android. Распакуйте и откройте `PrintCalculator.apk`, затем разрешите установку.

Иконка — принтер с калькулятором. Настройки материалов сохраняются на этом компьютере.

Если Windows один раз покажет «Защита Windows», нажмите «Подробнее», затем «Выполнить в любом случае». Файл собран без платной подписи. Программа не скачивает дополнительные файлы.

На Windows 11 и обновлённой Windows 10 окно рисует системный компонент Microsoft Edge WebView2, который уже установлен в системе. Если его нет, программа покажет сообщение и остановится, ничего не скачивая.

## Сборка Windows exe

Нужен Go 1.22+.

```bash
cd print-calculator/windows
go mod tidy
./build.sh
```

Готовый файл: `print-calculator/PrintCalculator.exe`.

## Сборка Android apk

Нужны JDK 17+ и Android SDK (platform 35, build-tools 35).

```bash
cd print-calculator/android
echo "sdk.dir=$ANDROID_HOME" > local.properties
gradle wrapper
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../PrintCalculator.apk
```

Проверка формул в том же HTML:

```bash
cd print-calculator
npm install
npm run verify
```
