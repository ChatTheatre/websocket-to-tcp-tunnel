#!/bin/sh

set -e
set -x

HOME=/usr/local/websocket-to-tcp-tunnel
PID=`cat $HOME/tunnel.pid`

if [ -f "$HOME/tunnel.pid" ] && [ -e /proc/$PID ]; then
    kill -9 `cat $HOME/tunnel.pid`
fi

ps aux | grep "Relay.js" | grep -v grep | cut -c 9-14 | xargs kill -9

cat <<EndOfMessage
Please note that cron will automatically restart the tunnels constantly, so just killing them will NOT permanently stop them.
EndOfMessage
