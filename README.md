# WebSocket to TCP Tunnel
A basic relay between a listening WebSockets server and TCP server.  
Data between both sockets is simply echoed to the other.

## Requirements
* Node.js - The WebSocket server runs via Node.js
* npm - npm is used to install package dependencies.

## Installation
Clone the repository with `git clone https://github.com/ToothlessRebel/websocket-to-tcp-tunnel.git`.  
From the new repository's root directory run `npm install`.

## Starting Relay
`main.js` has three configuration variables in the first few lines. These include the 
port numbers both servers, and the URL for the TCP server to be communicated with.  
To start the relay use `node main.js &` from the root directory of the cloned repository.
