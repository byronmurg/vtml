#!/bin/bash
DIR=$(dirname $0)
DB_URL=${DB_URL:-"postgresql://"} nodemon -e ts,html,json,yaml,md $DIR/src/cli.ts $@
