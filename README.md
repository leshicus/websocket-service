## websocket-service (Websocket service server)

### Установка
- `npm i`

### Запуск
- `npm start`

### Обновление сервера
- `cd /var/www/websocket-service`
- `git pull origin`
- `service websocket-service stop`
- `service websocket-service start`

### Назначение
- Получает подключения от касс и в случае, если такой логин уже зарегистрирован, то отправляет сообщение о необходимости разлогиниться. Таким образом обеспечивается уникальность подключения касс к серверу.

### Адреса
- prod: `195.122.28.80 -p15852`
