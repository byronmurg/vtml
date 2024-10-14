#!/bin/bash

tsc
npx @yao-pkg/pkg -t node22-linux -o vtml package.json
gzip -kf vtml
