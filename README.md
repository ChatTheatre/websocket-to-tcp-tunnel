# WebSocket to TCP Tunnel
A basic relay between a listening WebSockets server and TCP server.  
Data between both sockets is simply echoed to the other.

## Requirements
* Node.js - The WebSocket server runs via Node.js
* npm - npm is used to install package dependencies.

## Installation
Clone the repository with `git clone https://github.com/skotostech/websocket-to-tcp-tunnel.git`.  
From the new repository's root directory run `npm install`.

## Configuration
Rename `config.json.example` to `config.json` and edit to suit your needs.  
Example (with all optional entries):
```json
{
  "pidFileDirectory": "./",
  "logDirectory": "./logs/",
  "maximumRetries": 100,
  "servers": [
    {
      "name": "My Server",
      "listen": 1234,
      "send": 1235,
      "host": "domain.tld"
    }
  ]
}

```

### Server Configurations [REQUIRED]
Servers can be configured by adding objects to the property.
* `name` is used only for identification in output.  
* `listen` is the port on which this server should listen for incoming WebSocket connections.
* `send` is the port on which the outgoing TCP socket should connect.
* `host` is the host to which the outgoing TCP socket should connect.

### PID Files [OPTIONAL]
The location of files containing PID information for each process can be defined with 
the `pidFileDirectory` property.  
*Defaults to `./`.*

### Logging [OPTIONAL]
The directory in which logs are written can be defined with the `logDirectory` property.  
*Defaults to `./logs/`.*

### Maximum Retries [OPTIONAL]
If provided the `maximumRetries` property defines how many times Forever will restart a child before giving up.
This is useful in preventing runaway processes. If this property does not exist no limit will be set.  
*Defaults to unlimited.*  

## Starting Relay 
To start the relay use `node main.js &` from the root directory of the cloned repository.
