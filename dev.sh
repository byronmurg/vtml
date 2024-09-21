#!/bin/bash
DIR=$(dirname $0)
DB_URL="postgresql://" nodemon -x bun -e ts,html,json,yaml,md run $DIR/src/cli.ts $@
