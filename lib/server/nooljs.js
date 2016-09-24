// nooljs.js 0.0.1
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports = function () {
    
    var expressApp;
    var socketio ;

    var fs = require('fs');
    var path = require('path');
    var express = require('express');
    var bodyParser = require('body-parser');
    var requireDirectory = require('require-directory');
    var serverF = requireDirectory(module);
    var Q = require('q');
    var noolServer;
    var layoutParser;


    //post server functions
    serverFunctions = function (req, res) {
        var methodName = req.body.method;
        var typeName = req.body.type;
        var template = req.body.template;
        var data = req.body.data;
        var _userKey_ = req.body._userKey_;
        var $scope = {};

        function callback($scope) {

            for(var i in data)
            {
                var d = JSON.stringify(data[i].value);

                // check this in result scope.
                // we don't want to sent input values back to client
                if ($scope && $scope.data && $scope.data[data[i].name] && JSON.stringify($scope.data[data[i].name]) == d) {
                    delete $scope.data[data[i].name];
                }

            }
         //   console.log("server function after scope:" + JSON.stringify($scope));
            res.write(JSON.stringify($scope));
            res.end()
        };

        noolServer.serverFunctions(methodName, typeName, template, data, $scope, serverF, callback, _userKey_);
    }



    getLayout = function(req, res) {
        var layoutName = req.body.name;
        var _userKey_ = req.body._userKey_;
        var lres = res;

        noolServer.getLayout(layoutName, _userKey_)
            .then(function (layout) {
             //   console.log("Layout   sent to client:" + layoutName);
                lres.write(JSON.stringify(layout));
                lres.end();
            })
            .catch(function (err) {
                var data = {};
                data.error = { code: "LayoutError", message: err };
              //  console.log("%s Layout error  %s  sent to client:", layoutName, err);
                lres.write(JSON.stringify(data));
                lres.end();
             //   console.log("%s Layout error  data %s  sent to client", layoutName, data);
            });
    }

    ioNlServerData = function (req, fn) {
        var methodName = req.method;
        var typeName = req.type;
        var template = req.template;
        var data = req.data;
        var _userKey_ = req._userKey_;
        var $scope = {};

        function callback($scope) {
            fn(JSON.stringify($scope));
        };

        noolServer.serverFunctions(methodName, typeName, template, data, $scope, serverF, callback, _userKey_);
    }


    ioNlLayout = function (req, fn) {
        var layoutName = req.name;
        var _userKey_ = req._userKey_;

        noolServer.getLayout(layoutName, _userKey_)
            .then(function (layout) {
                fn(JSON.stringify(layout));
            })
            .catch(function (err) {
                var data = {};
                data.error = { code: "LayoutError", message: err };
                fn(JSON.stringify(data));
            });
    }


    ioConnection =  function (client) {
        var $scope = {};
        $scope.message3 = " server connected";
        socketio.emit("reply", JSON.stringify($scope));
        console.log('socket connected!');


        client.on('nlServerData', function (req, fn) {
            ioNlServerData(req, fn);
        }); 

        client.on('nlLayout',  function (req, fn) {
            ioNlLayout(req, fn);
        }); 

    }

	/**********************************
	* Request from socket-io
	**********************************/
    ioRequest = function  (client) {
        var $scope = {};
        $scope.message3 = " reply from server";
        socketio.emit("reply", JSON.stringify($scope));
    }
    
	/***********************************
	* Executing server method though the express-js
	*
	*************************************/
    execServerMethod = function(req, res) {
        var methodName = req.body.method;
        var args = req.body.args;
        var _userKey_ = req.body._userKey_;
        function callback(result) {
            res.write(JSON.stringify(result));
            res.end()
        };

        noolServer.execServerMethod(methodName, args, callback, _userKey_);
    }
 
	/********************************************
	* Initialization  point for both express-js and socket-io requests.
	*
	********************************************/
    init = function (app, io, fileMonitorTimeout) {

        fileMonitorTimeout = fileMonitorTimeout || 15000; // default 15 sec
        expressApp = app;
        socketio = io;

        var vm = require('vm');
         layoutParser = serverF.layoutParser();
         noolServer = serverF.noolServer();
         noolServer.init(Q, fs, serverF, layoutParser, fileMonitorTimeout);

        // call post server function
        expressApp.post('/serverFunctions', function (req, res) {
            serverFunctions(req, res);
        });

        //execute server method
        expressApp.post('/execServerMethod', function (req, res) {
            execServerMethod(req, res);
        });

        //get the layout
        expressApp.post('/getLayout', function (req, res) {
            getLayout(req, res);
        });

        socketio.on('connection', function (client) {
            ioConnection(client);
        });

        socketio.on('request', function (client) {
            ioRequest(client);
        });
    }

    return {
        init:init
    }

  
}




