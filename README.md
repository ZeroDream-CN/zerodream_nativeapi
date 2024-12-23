# ZeroDream Native API
A WebSocket-based programming interface for FiveM.

## Features
* Execute Native functions
* Call local and client events
* Register local and network events
* Register commands
* Execute code
* Function callbacks
* AES-256-CFB Encryption

## Installation
1. Clone this repository into your server's resources directory.
```
git clone https://github.com/ZeroDream-CN/zerodream_nativeapi
```
2. Edit the `zerodream_nativeapi/config.js` file to set your AES key and IV (the key must be 32 characters, and the IV must be 16 characters).
```js
var Config = {
    LISTEN_HOST: '0.0.0.0',
    LISTEN_PORT: 38080,
    KEY: '0123456789abcdef0123456789abcdef', // <- Change this
    IV: 'abcdef9876543210',                  // <- Also this
```
3. Add the following to your `server.cfg` file.
```
ensure zerodream_nativeapi
```
4. Restart your server.

## API usage
Basic usage, not real code, you need to implement it yourself.
```js
let host = '127.0.0.1';
let port = 38080;
let key  = '0123456789abcdef0123456789abcdef';
let iv   = 'abcdef9876543210';
let wsc  = new WebSocketClient( host, port );
let aes  = new AES( 'aes-256-cfb', key, iv );
let uuid = uuid();
let jsonText = JSON.stringify({
    action: 'YOUR_ACTION',
    data: 'YOUR_DATA',
    eid: uuid
});
let encrypted = aes.encrypt( jsonText );
wsc.send( encrypted );
```

<details>
  <summary>Server API</summary>

### Auth
Authenticate the client
| action | data |
| ---- | ---- |
| auth | (Map) { auth: 'any text' } |

### Execute Native
Execute a server side native with arguments
| action | data |
| ---- | ---- |
| executeNative | (Map) { name: 'NativeName', args: [ arg1, arg2, ... ] } |

### Trigger Event
Trigger a server side event with arguments
| action | data |
| ---- | ---- |
| triggerEvent | (Map) { name: 'EventName', args: [ arg1, arg2, ... ] } |

### Trigger Client Event
Trigger a client side event with arguments
| action | data |
| ---- | ---- |
| triggerClientEvent | (Map) { name: 'ClientEventName', args: [ arg1, arg2, ... ] } |

### Register Event
Register a server internal event
| action | data |
| ---- | ---- |
| registerEvent | (Map) { name: 'EventName' } |

### Register Server Event
Register a network event
| action | data |
| ---- | ---- |
| registerServerEvent | (Map) { name: 'ServerEventName' } |

### Register Command
Register a server side command
| action | data |
| ---- | ---- |
| registerCommand | (Map) { name: 'CommandName', restricted: true/false } |

### Eval
Evaluate JavaScript code on the server
| action | data |
| ---- | ---- |
| eval | (Map) { code: 'JavaScriptCode' } |

### Call Function
Call a registered server side function with arguments
| action | data |
| ---- | ---- |
| callFunction | (Map) { id: 'FunctionId', args: [ arg1, arg2, ... ] } |

</details>

## License
This project is open-sourced under the MIT license.
