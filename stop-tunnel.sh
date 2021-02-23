#!/bin/sh

set -e
set -x

HOME=/usr/local/websocket-to-tcp-tunnel

if [ -f "$HOME/tunnel.pid" ]; then
    PID=`cat $HOME/tunnel.pid`
    if [ -e /proc/$PID ]; then
        kill -9 $PID
    fi
fi

pkill -f "Relay.js" -9 || echo Ok...
pkill -f "main.js" -9 || echo Ok...

cat <<EndOfMessage
Please note that cron may automatically restart the tunnels constantly, so just killing them may NOT permanently stop them.
EndOfMessage
