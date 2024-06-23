#!/bin/bash
DIR=$(dirname $0)
DEBUG=starling* nodemon -e ts,html,json $DIR/src/starling.ts $@
