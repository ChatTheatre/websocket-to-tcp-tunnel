#!/bin/sh

HOME=/usr/local/websocket-to-tcp-tunnel
PID=`cat $HOME/tunnel.pid`

if [ ! $PID ] || [ ! -e /proc/$PID ]; then

  $HOME/start-tunnel.sh

fi
