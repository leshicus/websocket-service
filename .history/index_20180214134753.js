/**
 * Веб-сервер для контроля уникальности вошедших в программу кассиров. Т.е. чтоб под одним логином вошли только один раз.
 * Нужно это, чтобы корректно осуществлялась работа с ККТ аппаратами. Бывает такое, что к одному ККТ подключаются
 * кассы, в которых вошли под одинаковым логином, и система начинает работать не правильно.
 * При регистрации в кассе происходит подключение к этому веб-серверу и если такой логин уже занят,
 * то есть возможность его принудительно разлогинить. Для этого на кассу посылается сообщение doUnLogin, и касса сама
 * показывает сообщение и разлогинивается.
 */

var express = require("express")
var request = require("request")
var app = express()
var path = require("path")
var server = require("http").createServer(app)
var io = require("socket.io")(server)
var config = require("./config/config")
var port = process.env.WSN_PORT || config.ws.port
var host = process.env.WSN_HOSTNAME || config.ws.host
var arrLogin = []

server.listen(port, function() {
  console.log("Server listening at port %d", port)
})
io.on("connection", onConnect)

function onConnect(socket) {
  console.info("onConnect ", socket.id)

  socket.on("login", doLogin.bind(null, socket))
  socket.on("unlogin", doUnLogin.bind(null, socket))
  socket.on("disconnect", onDisconnect.bind(null, socket))
}

function onDisconnect(socket) {
  console.log("onDisconnect", socket.id)

  var existsLogin = arrLogin.find(findById.bind(null, socket.id))

  if (existsLogin) {
    for (var i = arrLogin.length - 1; i >= 0; i--) {
      if (arrLogin[i].id === socket.id) {
        clearInterval(arrLogin[i].interval)
        arrLogin.splice(i, 1)
        break
      }
    }
  }
}

function findByLogin(login, item) {
  if (item.login === login) return item
  else return null
}

function findById(id, item) {
  if (item.id === id) return item
  else return null
}

// * вызывать ф-ию callback count раз через каждые interval мс
function fireNTimes(callback, count, interval) {
  var i = 0

  var intervalId = setInterval(function() {
    callback()

    if (++i === count) {
      clearInterval(intervalId)
    }
  }, interval)
}

function doLogin(socket, data) {
  console.log("doLogin ", data.login, socket.id)

  var login = data.login,
    existsLogin = arrLogin.find(findByLogin.bind(null, login)),
    timezone = data.timezone

  if (existsLogin) {
    // * скажем, что логин уже занят. Спросим на кассе, нужно ли его разлогинить, а самим залогиниться?
    fireNTimes(
      function() {
        try {
          socket.emit("login", {
            login: login,
            result: false,
            message: "Login failed. Login " + login + " already exists."
          })
        } catch (e) {}
      },
      3,
      5000
    )
  } else {
    var interval = null

    /**
     * Здесь заложена возможность опрашивать базу на предмет, есть ли какие-то сообщения,
     * которые мы бы хотели показать кассиру.
     * Пока отключено, т.к. нет механизма создания этих сообщений.
     **/

    // var interval = setInterval(getPushNotice.bind(null, socket, login, timezone), 5000);

    arrLogin.push({
      id: socket.id,
      login: login,
      interval: interval
    })

    socket.emit("login", {
      login: login,
      result: true,
      message: "Login succeed."
    })
  }
}

function doUnLogin(socket, data) {
  console.log("doUnLogin ", data.login, socket.id)

  var login = data.login
  var existsLogin = arrLogin.find(findByLogin.bind(null, login))

  if (existsLogin) {
    for (var i = arrLogin.length - 1; i >= 0; i--) {
      if (arrLogin[i].login === login) {
        socket.to(arrLogin[i].id).emit("unlogin", {
          login: login,
          result: true,
          message: "You are log out."
        })
        clearInterval(arrLogin[i].interval)
        arrLogin.splice(i, 1)
      }
    }

    socket.emit("unlogin", {
      login: login,
      result: true,
      message: "Login " + login + " successfully log out."
    })
  } else {
    socket.emit("unlogin", {
      login: login,
      result: false,
      message: "Login " + login + " not found."
    })
  }
}

function getPushNotice(socket, login, timezone) {
  var url =
    "http://newpos.dev.badbin.ru/admin/tools/getPushNotices.php?user_login=" +
    login
  if (timezone) url += "&timezone=" + timezone

  request.get(
    {
      url: url,
      timeout: 20 * 1000
    },
    function(error, response, body) {
      // console.info('body',body);
      if (!error && response.statusCode == 200) {
        var data

        try {
          data = JSON.parse(body)
          console.info(data)
          for (var i = 0; i < data.length; i++) {
            var existsLogin = arrLogin.find(findByLogin.bind(null, login))
            if (existsLogin) {
              var fromDatetimeLocal = existsLogin.fromDatetimeLocal,
                toDatetimeLocal = existsLogin.toDatetimeLocal

              socket.emit("text", {
                login: login,
                result: true,
                message: data[i].text
              })
            }
          }
        } catch (e) {
          // return fail && fail.call(_this, e);
        }

        // return callback && callback.call(_this, data);
      } else if (error) {
        // return fail && fail.call(_this, error);
      }
      // return fail && fail.call(_this, new Error("Server Error. Status Code: " + response.statusCode));
    }
  )
}
