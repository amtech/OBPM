#!/usr/bin/env bash
cd $(dirname $0)

#include base functions:
. build-base.sh

printStep "installing global dependencies."
npm install -g typescript
npm install -g mocha
npm install -g tsd

printStep "building API."
./api/build.sh
