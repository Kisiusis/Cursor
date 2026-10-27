# Калькулятор печати

Файл `index.html` не меняется: те же стили, разметка и расчёт.

Готовые файлы лежат в этой же папке:

- [PrintCalculator.exe](PrintCalculator.exe) — Windows, двойной щелчок.
- [PrintCalculator.apk](PrintCalculator.apk) — Android. Откройте файл на телефоне и разрешите установку.

Страница внутри обоих файлов — тот же `index.html`, без другой вёрстки. Окно называется «Калькулятор печати». Иконка — принтер с калькулятором.

## Сборка Android apk

Нужны JDK 17+ и Android SDK (platform 35, build-tools 35).

```bash
cd print-calculator/android
echo "sdk.dir=$ANDROID_HOME" > local.properties
gradle wrapper
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../PrintCalculator.apk
```

## Windows

Десктопное окно для того же HTML. На Windows приложение собирается в один portable exe.

Окно называется «Калькулятор печати». Файл запуска: `Калькулятор-печати.exe` (внутри процесса исполняемый файл `PrintCalculator.exe`). Настройки материалов и цена резки пишутся в localStorage и сохраняются между запусками.

## Сборка Windows exe

Нужны Node.js 22 и интернет (скачивается Electron для Windows).

```bash
cd print-calculator
npm install
npm run build:win
```

Готовый файл: `print-calculator/dist/Калькулятор-печати.exe`.

Это portable-сборка: двойной щелчок распаковывает приложение в профиль пользователя и открывает калькулятор. Отдельная установка не нужна.

Проверка интерфейса и формул без сборки exe:

```bash
npm run verify
```
