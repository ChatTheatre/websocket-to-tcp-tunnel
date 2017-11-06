# WebSocket to TCP Tunnel
A basic relay between a listening WebSockets server and TCP server.  
Data between both sockets is simply echoed to the other.

## Requirements
* Node.js - The WebSocket server runs via Node.js
* npm - npm is used to install package dependencies.

## Installation
Clone the repository with `git clone https://github.com/ToothlessRebel/websocket-to-tcp-tunnel.git`.  
From the new repository's root directory run `npm install`.

## Configuration
Rename `servers.json.example` to `servers.json` and edit to suit your needs. This should contain an array of objects each with the keys 
`name`, `listen`, `send`, and `host`.  
* `name` is used only for identification in output.  
* `listen` is the port on which this server should listen for incoming WebSocket connections.
* `send` is the port on which the outgoing TCP socket should connect.
* `host` is the host to which the outgoing TCP socket should connect.  
Example:
```json
[
  {
    "name": "My Server",
    "listen": 1234,
    "send": 1235,
    "host": "domain.tld"
  }
]
```

## Starting Relay 
To start the relay use `node main.js &` from the root directory of the cloned repository.
