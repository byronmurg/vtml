#!/bin/bash

rm -rf dist/
tsc
npm publish --access public
