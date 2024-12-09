#!/bin/bash

rm -rf dist/
tsc
cp README.md dist/
npm publish --access public
