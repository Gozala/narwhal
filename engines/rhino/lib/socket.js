var IO = require("IO").IO;

var JAddress = Packages.java.net.InetSocketAddress;
var JSocketChannel = Packages.java.nio.channels.SocketChannel;
var Buffer = java.nio.ByteBuffer.wrap;

var J_OP_ACCEPT = Packages.java.nio.channels.SelectionKey.OP_ACCEPT;
var J_OP_WRITE = Packages.java.nio.channels.SelectionKey.OP_WRITE;
var J_OP_CONNECT = Packages.java.nio.channels.SelectionKey.OP_CONNECT;


var CONNECTING = 0; //The connection has not yet been established
var OPEN = 1; //Socket connection is established and communication is possible
var CLOSED = 2; //The connection has been closed or could not be opened


var Socket = exports.Socket = function Socket() {};
Socket.prototype = new IO();
Socket.prototype.readInto = function(buffer, length, from) {
    var bytes = buffer._bytes; // java byte array
    var offset = buffer._offset;
    var buffer = Buffer(bytes);
    if (typeof from === "number")
        offset += from;
    if (length > bytes.length + offset)
        throw "FIXME: Buffer too small. Throw or truncate?";
    var total = 0,
        bytesRead = 0;
    while (total < length) {
        bytesRead = this.__channel__.read(Buffer(bytes, offset + total, length - total));
        if (bytesRead <= 0)
            break;
        total += bytesRead;
    }
    return total;
};
IO.prototype.writeInto = function(buffer, from, to) {
    this.__channel__.write(Buffer(buffer._bytes, buffer._offset + from, to - from));
    return this;
};
IO.prototype.copy = function (output, mode, options) {
    while (true) {
        var buffer = this.read(null);
        if (!buffer.length)
            break;
        output.write(buffer);
    }
    output.flush();
    return this;
};

IO.prototype.flush = function() {
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
    var channel = this.__channel__ = JSocketChannel.open();
    channel.configureBlocking(false);
    channel.connect(new JAddress(host, port));
    channel.finishConnect();
    // TODO: Avoid this ugly hack
    this.inputStream = this.outputStream = channel;
    return this;
};
Socket.prototype.onopen = function onopen() {
    ['triggered when connection is established and communication is possible\
    this method is supposed to be overrided by socket server users']
};
Socket.prototype.onmessage = function onmessage() {
    ['triggered when new data is arrived from the peer\
    this method is supposed to be overrided by socket user']
};
Socket.prototype.close = function close() {
    ['Opens the socket for communication']
    this.__channel__.close();
};
Socket.prototype.onclose = function onclose() {
    ['triggered when connection has been closed.\
    this method is supposed to be overrided by socket server users']
};


