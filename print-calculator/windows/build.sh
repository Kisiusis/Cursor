#!/bin/sh
set -eu
cd "$(dirname "$0")"
rm -rf web
mkdir -p web
cp ../index.html web/index.html
cp ../vendor/html2canvas.min.js web/html2canvas.min.js
cp ../vendor/jspdf.umd.min.js web/jspdf.umd.min.js
go-winres make --in winres.json --arch amd64 --out rsrc
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui" -o ../PrintCalculator.exe .
rm -rf web
