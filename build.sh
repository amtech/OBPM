#!/usr/bin/env bash

echo "---Installing global dependencies:"
npm install -g typescript
npm install -g mocha
npm install -g tsd

cd api
echo "---API: in"
pwd
echo "---Installing local dependencies:"
npm install
tsd install

echo "---compiling:"
tsc

echo "---running tests:"
mocha
