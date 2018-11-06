// noolServer.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports =
    {
        execute: function (config, query, data, option) {
            var pg = require('pq');
            var Q = require('q');

            if (data) {
                for (var i = 0; i < data.length; i++) {
                    console.log("query:%s, name:%s, value:%s", query, data[i].name, data[i].value);
                    query = query.replace("{{" + data[i].name + "}}", "'" + data[i].value.replace(/'/g, "''") + "'");
                }

            }
            var arr = query.split(";");

            for (var i = 0; i < arr.length; i++) {
                if ((arr[i].match(/'/g) || []).length % 2 == 1 && (i + 1 < arr.length)) {
                    arr[i + 1] = arr[i] + ',' + arr[i + 1];
                    arr.splice(i, 1);
                    i--;
                }
            }

            var querystring = query;
            var paramArr = [];
            if (arr.length > 1) {
                // we have params
                if (arr[1].length > 0)
                    paramArr = JSON.parse(arr[1]);
                querystring = arr[0];
            }
            var deferred = Q.defer();
        console.log("postgresql-execute:%s ", querystring);
        
        
        pg.connect(conString, function (err, client, done) {
            if (err) {
                return deferred.reject('postgresql - connection error. Err :', err);
            }
            client.query(query, paramArr, function (err, rows) {
                //call `done()` to release the client back to the pool 
                done();
                
                if (err) {
                    return deferred.reject('postgresql-execute-resultset error. err %s', err);
                }
                deferred.resolve(rows);
    //output: 1 
            });
        });

            pool.query(querystring, paramArr, function (err, rows, fields) {
                if (!err) {
					
                    //console.log("mysql-execute-resultset resolved. :%s ", querystring);
                    deferred.resolve(rows);
                }
                else {
                    console.log("mysql-execute-resultset error. :%s ", querystring);
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        }
    }