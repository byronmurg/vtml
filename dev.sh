#!/bin/bash
DIR=$(dirname $0)
DEBUG=starling* nodemon -e ts,html,json,yaml $DIR/src/starling.ts $@
