#!/usr/bin/env bash
cd $(dirname $0)

#include base functions:
. ../build-base.sh


printStep "installing node dependencies..."
if ! npm install; then
    printerr "npm install failed."
else
    printinfo "node modules installed successfully."
fi

printStep "installing typings dependencies..."
if ! tsd install; then
    printerr "tsd install failed."
else
    printinfo "typings installed successfully."
fi

printStep "compiling Typescript."
if ! tsc; then
    printerr "compilation failed."
else
    printinfo "typescript compilation finished."
fi

printStep "running unit tests."
if ! mocha dist/test/**/*.js; then
    printerr "Mocha tests failed."
else
    printinfo "All tests passed."
fi

printinfo "API build succeed."
