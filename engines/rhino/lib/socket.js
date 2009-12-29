var IO = require("IO").IO;
var EVENT_QUEUE = require("event-queue");

var JSelectorProvider = Packages.java.nio.channels.spi.SelectorProvider.provider();
var JAddress = Packages.java.net.InetSocketAddress;
var JBuffer = java.nio.ByteBuffer.wrap;

var J_OP_ACCEPT = Packages.java.nio.channels.SelectionKey.OP_ACCEPT;
var J_OP_WRITE = Packages.java.nio.channels.SelectionKey.OP_WRITE;
var J_OP_READ = Packages.java.nio.channels.SelectionKey.OP_READ;
var J_OP_CONNECT = Packages.java.nio.channels.SelectionKey.OP_CONNECT;


var CONNECTING = 0; //The connection has not yet been established
var OPEN = 1; //Socket connection is established and communication is possible
var CLOSED = 2; //The connection has been closed or could not be opened


var Socket = exports.Socket = function Socket() {};
Socket.prototype = new IO();
Socket.prototype.readInto = function(buffer, length, from) {
    var bytes = buffer._bytes; // java byte array
    var offset = buffer._offset;
    if (typeof from === "number")
        offset += from;
    if (length > bytes.length + offset)
        throw "FIXME: Buffer too small. Throw or truncate?";
    var total = 0,
        bytesRead = 0;
    while (total < length) {
        bytesRead = this.__channel__.read(JBuffer(bytes, offset + total, length - total));
        if (bytesRead <= 0)
            break;
        total += bytesRead;
    }
    return total;
};
Socket.prototype.writeInto = function(buffer, from, to) {
    this.__channel__.write(JBuffer(buffer._bytes, buffer._offset + from, to - from));
    return this;
};
Socket.prototype.flush = function() {
    return this;
};
Socket.prototype.readyState = CONNECTING;
Socket.prototype.constructor = Socket;
/*
Socket.prototype.__defineGetter__("host", function() {
    return this.__transport__ ? this.__transport__.host : undefined;
});
Socket.prototype.__defineGetter__("port", function() {
    return this.__transport__ ? this.__transport__.port : undefined;
});
*/
Socket.prototype.open = function open(host, port) {
    ['Opens the socket for communication\
    @param host:String      The host to connect to\
    @param port:Number      The port on which to connect']
    var channel = this.__channel__ = JSelectorProvider.openSocketChannel();
    channel.configureBlocking(false);
    var selector = this.__selector__ = JSelectorProvider.openSelector();
    this.__observer__ = channel.register(selector, J_OP_WRITE|J_OP_READ|J_OP_CONNECT);
    this.__sync__ = new StateSync(this);
    channel.connect(new JAddress(host, port));
    channel.finishConnect();
    this.__sync__.sync();
    return this;
};
Socket.prototype.onopen = function onopen() {
    ['triggered when connection is established and communication is possible\
    this method is supposed to be overrided by socket server users']
};
Socket.prototype.onmessage = function onmessage() {
    ['triggered when new data is arrived from the peer\
    this method is supposed to be overrided by socket user']
    print("onmessage");
};
Socket.prototype.close = function close() {
    ['Opens the socket for communication']
    this.__channel__.close();
};
Socket.prototype.onclose = function onclose() {
    ['triggered when connection has been closed.\
    this method is supposed to be overrided by socket server users']
    print("onclose");
};

function StateSync(socket) {
    this.socket = socket;
}
StateSync.prototype = {
    constructor: StateSync,
    sync: function sync() {
        var socket = this.socket;
        var observer = socket.__observer__;
        var selector = socket.__selector__;
        EVENT_QUEUE.enqueue(function stateCheck() {
            while(observer.selector().select()) {
                var event, events = selector.selectedKeys().toArray().slice();
                while (event = events.shift()) {
                    if (event.isValid()) {
                        print("socket:valid")
                    }
                    if (event.isReadable()) {
                        print("socket:readable");
                        print("socket:read> " + socket.read().decodeToString()); // need to buffer
                    }
                    if (event.isWritable()) {
                        print("socket:writable")
                    }
                    if (event.isAcceptable()) {
                        print("socket:acceptable")
                    }
                    if (event.isConnectable()) {
                        print("socket:connectable")
                    }
                }
            }
            EVENT_QUEUE.enqueue(stateCheck);
        });
        EVENT_QUEUE.enterEventLoop();
    }
};