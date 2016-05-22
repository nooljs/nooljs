
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var io = require('socket.io').listen(app.listen(8080));
var nooljs = require('nooljs');
nooljs.init(app, io);


// call the initial page
app.get('/', function (req, res) {
    fs.readFile('layout/index.html', function (err, data) {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': data.length });
        res.write(data);
        res.end();
    });
});


