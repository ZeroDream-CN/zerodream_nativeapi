const WebSocketServer = require('ws').Server;
const WebSocketClient = require('ws');
const { v4: uuidv4 }  = require('uuid');
const authMap         = new Map();
const funcMaps        = new Map();
const wss             = new WebSocketServer({ host: Config.LISTEN_HOST, port: Config.LISTEN_PORT });
const ZAES            = new ZeroAES(Config.KEY, Config.IV);
const eventMap        = new Map();
const netEventMap     = new Map();

wss.on('connection', function connection(ws, request) {
    ws.uuid = uuidv4();
    // console.log('Client Connected: %s', ws.uuid);
    ws.on('error', console.error);
    ws.on('close', function close() {
        // console.log('Client Disconnected: %s', ws.uuid);
        authMap.delete(ws.uuid);
    });
    ws.on('message', function message(data) {
        let response = 'Invalid request';
        try {
            let decrypted = ZAES.decrypt(data);
            let json = JSON.parse(decrypted);
            if (json && json.action) {
                switch (json.action) {
                    case 'auth':
                        let auth = json.data.auth;
                        if (auth !== undefined) {
                            authMap.set(ws.uuid, ws);
                            response = JSON.stringify({
                                action: 'auth',
                                eid: json.eid,
                                data: ws.uuid
                            });
                        }
                        break;
                    case 'executeNative':
                        let name = json.data.name;
                        let args = json.data.args;
                        let result = null;
                        let resultType = null;
                        if (name !== undefined && args !== undefined) {
                            let func = global[name];
                            if (func !== undefined) {
                                result = func.apply(null, args);
                                resultType = GetResultType(name, result);
                            }
                        }
                        response = JSON.stringify({
                            action: 'executeNative',
                            eid: json.eid,
                            data: {
                                type: resultType,
                                result: result
                            }
                        });
                        break;
                    case 'triggerEvent':
                        let eventName = json.data.name;
                        let eventArgs = json.data.args;
                        if (eventName !== undefined && eventArgs !== undefined) {
                            emit(eventName, ...eventArgs);
                        }
                        response = JSON.stringify({
                            action: 'triggerEvent',
                            eid: json.eid,
                            data: 'ok'
                        });
                        break;
                    case 'triggerClientEvent':
                        let clientEventName = json.data.name;
                        let clientEventArgs = json.data.args;
                        if (clientEventName !== undefined && clientEventArgs !== undefined && clientEventArgs.length > 0) {
                            emitNet(clientEventName, ...clientEventArgs);
                        }
                        response = JSON.stringify({
                            action: 'triggerClientEvent',
                            eid: json.eid,
                            data: 'ok'
                        });
                        break;
                    case 'registerEvent':
                        let event = json.data.name;
                        if (event !== undefined && !eventMap.has(event)) {
                            eventMap.set(event, true);
                            on(event, function(...args) {
                                let text = JSON.stringify({
                                    action: 'event',
                                    data: {
                                        name: event,
                                        args: args
                                    }
                                });
                                let encrypted = ZAES.encrypt(text);
                                authMap.forEach(function(client) {
                                    client.send(encrypted);
                                });
                            });
                        }
                        response = JSON.stringify({
                            action: 'registerEvent',
                            eid: json.eid,
                            data: 'ok'
                        });
                        break;
                    case 'registerServerEvent':
                        let serverEvent = json.data.name;
                        if (serverEvent !== undefined && !netEventMap.has(serverEvent)) {
                            netEventMap.set(serverEvent, true);
                            onNet(serverEvent, function(...args) {
                                args.unshift(source);
                                let text = JSON.stringify({
                                    action: 'serverEvent',
                                    data: {
                                        name: serverEvent,
                                        args: args,
                                    }
                                });
                                let encrypted = ZAES.encrypt(text);
                                authMap.forEach(function(client) {
                                    client.send(encrypted);
                                });
                            });
                        }
                        response = JSON.stringify({
                            action: 'registerServerEvent',
                            eid: json.eid,
                            data: 'ok'
                        });
                        break;
                    case 'registerCommand':
                        let command = json.data.name;
                        let restricted = json.data.restricted || false;
                        if (command !== undefined) {
                            RegisterCommand(command, async(source, args, raw) => {
                                let player = source;
                                let text = JSON.stringify({
                                    action: 'command',
                                    data: {
                                        name: command,
                                        source: player,
                                        args: args,
                                        raw: raw
                                    }
                                });
                                let encrypted = ZAES.encrypt(text);
                                authMap.forEach(function(client) {
                                    client.send(encrypted);
                                });
                            }, restricted);
                        }
                        response = JSON.stringify({
                            action: 'registerCommand',
                            eid: json.eid,
                            data: 'ok'
                        });
                        break;
                    case 'eval':
                        let code = json.data.code;
                        if (code !== undefined) {
                            try {
                                var evalResult = eval(code);
                                var copyResult = DeepCopy(evalResult);
                                var processedResult = ProcessObject(copyResult);
                                response = JSON.stringify({
                                    action: 'eval',
                                    eid: json.eid,
                                    data: processedResult
                                });
                            } catch (e) {
                                response = JSON.stringify({
                                    action: 'eval',
                                    eid: json.eid,
                                    data: e.message
                                });
                            }
                        } else {
                            response = JSON.stringify({
                                action: 'eval',
                                eid: json.eid,
                                data: 'Invalid code'
                            });
                        }
                        break;
                    case 'callFunction':
                        let funcId = json.data.id;
                        let funcArgs = json.data.args;
                        if (funcId !== undefined && funcArgs !== undefined) {
                            let func = funcMaps.get(funcId);
                            if (func !== undefined) {
                                let result = func.ref.apply(null, funcArgs);
                                let resultType = GetResultType(func.ref.name, result);
                                response = JSON.stringify({
                                    action: 'callFunction',
                                    eid: json.eid,
                                    data: {
                                        type: resultType,
                                        result: result
                                    }
                                });
                            } else {
                                response = JSON.stringify({
                                    action: 'callFunction',
                                    eid: json.eid,
                                    data: 'Invalid function'
                                });
                            }
                        } else {
                            response = JSON.stringify({
                                action: 'callFunction',
                                eid: json.eid,
                                data: 'Invalid function'
                            });
                        }
                        break;
                    default:
                        console.error('Invalid action: %s', json.action);
                        response = JSON.stringify({
                            action: 'error',
                            eid: json.eid,
                            data: 'Invalid action'
                        });
                        break;
                }
            } else {
                console.error('Invalid request: %s', decrypted);
            }
        } catch (e) {
            console.error(e);
        }
        let encrypted = ZAES.encrypt(response);
        ws.send(encrypted);
    });
});

on('onResourceStop', function(resource) {
    if (GetCurrentResourceName() === resource) {
        authMap.forEach(function(client) {
            let text = JSON.stringify({
                action: 'stop',
                data: 'ok'
            });
            let encrypted = ZAES.encrypt(text);
            client.send(encrypted);
        });
    }
});

function DeepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    let copy = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = DeepCopy(obj[key]);
        }
    }
    return copy;
}

function ProcessObject(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'function') {
            let uuid = uuidv4();
            funcMaps.set(uuid, {
                expire: Date.now() + 120000,
                ref: obj[key]
            });
            obj[key] = '__FUNCTION__:' + uuid;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            ProcessObject(obj[key]);
        }
    }
    return obj;
}

function GetResultType(native, result) {
    if (Config.VEC3FUNCS.includes(native)) {
        return 'vector3';
    }
    let type = typeof result;
    // check is array
    if (type === 'object' && Array.isArray(result)) {
        return 'array';
    }
    return type;
}
