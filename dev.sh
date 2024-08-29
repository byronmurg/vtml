#!/bin/bash
DIR=$(dirname $0)
DEBUG=vtml* nodemon -e ts,html,json,yaml $DIR/src/cli.ts $@
