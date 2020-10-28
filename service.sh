#!/bin/bash

cd /var/www/sportnet/fmke
PID=`pgrep -f "name=FMKE"`
if [ PID != "" ]; then
  kill $PID
fi

npm start -- -name=FMKE >> fmke.log 2>&1 &

