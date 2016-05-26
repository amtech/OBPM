#!/usr/bin/env bash

for run in {1..249}
do
  mocha /Users/remo/Development/GitHub/remolueoend/OBPM/api/dist/test/e2e/create-data.js
done
