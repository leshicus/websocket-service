// Setup basic express server
var express = require('express');
var app     = express();
var path    = require('path');
var server  = require('http').createServer(app);
var io      = require('socket.io')(server);
var config = require('./config/config');
var port   = process.env.WSS_PORT || config.ws.port;
var arrLogin = [];

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});
io.on('connection', onConnect);

function onConnect(socket) {
    console.info('onConnect ', socket.id);

    socket.on('login', doLogin.bind(null, socket));
    socket.on('unlogin', doUnLogin.bind(null, socket));
    socket.on('disconnect', onDisconnect.bind(null, socket));
}

function onDisconnect(socket) {
    console.log('onDisconnect', socket.id);

    var existsLogin = arrLogin.find(findById.bind(null, socket.id));

    if (existsLogin) {
        for (var i = arrLogin.length - 1; i >= 0; i--) {
            if (arrLogin[i].id === socket.id) {
                arrLogin.splice(i, 1);
                break;
            }
        }
    }
}

function findByLogin(login, item) {
    return item.login === login;
}

function findById(id, item) {
    return item.id === id;
}

function doLogin(socket, data) {
    console.log('doLogin ', data.login, socket.id);

    var login       = data.login;
    var existsLogin = arrLogin.find(findByLogin.bind(null, login));

    if (existsLogin) {
        socket.emit('login', {
            login  : login,
            result : false,
            message: 'Login failed. Login ' + login + ' already exists.'
        });
    } else {
        arrLogin.push({
            id   : socket.id,
            login: login
        });

        socket.emit('login', {
            login  : login,
            result : true,
            message: 'Login succeed.'
        });
    }
}

function doUnLogin(socket, data) {
    console.log('doUnLogin ', data.login, socket.id);

    var login       = data.login;
    var existsLogin = arrLogin.find(findByLogin.bind(null, login));

    if (existsLogin) {
        for (var i = arrLogin.length - 1; i >= 0; i--) {
            if (arrLogin[i].login === login) {
                socket.to(arrLogin[i].id).emit('unlogin', {
                    login  : login,
                    result : true,
                    message: 'You are unlogged.'
                });
                arrLogin.splice(i, 1);
            }
        }

        socket.emit('unlogin', {
            login  : login,
            result : true,
            message: 'Login ' + login + ' successfully unlogined.'
        });
    } else {
        socket.emit('unlogin', {
            login  : login,
            result : false,
            message: 'Login ' + login + ' not found.'
        });
    }
}