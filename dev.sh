#!/bin/bash
DIR=$(dirname $0)
DB_URL="postgresql://" DEBUG=vtml* nodemon -x bun -e ts,html,json,yaml run $DIR/src/cli.ts $@
