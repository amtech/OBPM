# OBPM
Opportunistic Business Process Modelling Environment based on ArangoDB

[![Build Status](https://travis-ci.org/remolueoend/OBPM.svg?branch=master)](https://travis-ci.org/remolueoend/OBPM)
[![Dependency Status](https://www.versioneye.com/user/projects/5728c63ca0ca35004cf76aad/badge.svg?style=flat)](https://www.versioneye.com/user/projects/5728c63ca0ca35004cf76aad)
[![Code Climate](https://codeclimate.com/github/remolueoend/OBPM/badges/gpa.svg)](https://codeclimate.com/github/remolueoend/OBPM)
[![Test Coverage](https://codeclimate.com/github/remolueoend/OBPM/badges/coverage.svg)](https://codeclimate.com/github/remolueoend/OBPM/coverage)
[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/27283e4c02317662281d)

## Development Tools
* Arango DB: `/usr/local/sbin/arangod`
* TS Compiler: `tsc --watch`
* Node Monitor: `nodemon --debug dist/lib/index.js`
* Inspector: `node-inspector`
* Build `[OBPM]: ./build.sh | [OBPM/api]: ./build.sh`
* Loadtest: loadtest http://localhost:8090/molena/action/executables -t 20 -c 10 -H "Authorization:Bearer 40f3f1e1641d05eae5695ddb3c7f1de9a840cc1b"

