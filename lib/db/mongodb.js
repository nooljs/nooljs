// noolServer.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports =
    {
    execute: function (config, query, data, option) {
        
        var mongoClient = require('mongodb').MongoClient;
        var Q = require('q');
        var cols , fun , params, params2;
        
        //parser mongodb query which format cols=db;fun=test;params={}
        
        //get collection name
        var nspos = query.indexOf("cols");
        var espos = query.indexOf("=", nspos); // get the post of = after cols string
        
        if (nspos < 0 || espos < 4 || query.substring(nspos + 4, espos).trim().length != 0)            
            throw { type: "Mongodb parser error", error: "Not found cols=" };
        
        var epos = query.indexOf(";", espos);
        
        cols = ((epos > 0) ? query.substring(espos + 1, epos):query.substring(espos + 1)).trim();
        
        query = (nspos > 0) ? query.substring(0, nspos):"" + (epos > 0)? query.substring(epos + 1) :"";
        
        // parser the fun name
        query = query.trim();
        nspos = query.indexOf("fun");
        espos = query.indexOf("=", nspos); // get the post of = after cols string
        
        if (nspos < 0 || espos < 3 || query.substring(nspos + 3, espos).trim().length != 0)
            throw { type: "Mongodb parser error", error: "Not found fun=" };
        
        epos = query.indexOf(";", espos);
        
        fun = ((epos > 0) ? query.substring(espos + 1, epos):query.substring(espos + 1)).trim();
        
        query = (nspos > 0) ? query.substring(0, nspos):"" + (epos > 0)? query.substring(epos + 1) :"";
        
        //parser params
        query = query.trim();
        nspos = query.indexOf("params");
        espos = query.indexOf("=", nspos); // get the post of = after cols string
        
        epos = ( query.indexOf(";updateParam=", espos) > 0 ) ? query.indexOf(";updateParam=", espos) :  ( (query.substring(query.length-2, query.length-1) == ";") ? query.length-1: -1 );
        
        if (nspos < 0 || espos < 6 || query.substring(nspos + 6, espos).trim().length != 0) {
            // no params
            params = {};
        }
        else {
           // params =   ((query.substring(query.length-2, query.length-1) == ";") ?  query.substring(espos + 1, query.length-1):query.substring(espos + 1)).trim();
            params  = ((epos > 0) ? query.substring(espos + 1, epos):query.substring(espos + 1)).trim();
            query = (nspos > 0) ? query.substring(0, nspos):"" + (epos > 0)? query.substring(epos + 1) :"";
            
        }
        
        try {
            params = JSON.parse(params);

        }
        catch (err) {
            params = {};

        }
        
        //parser params
        query = query.trim();
        nspos = query.indexOf("updateParam");
        espos = query.indexOf("=", nspos); // get the post of = after cols string
        
        if (nspos < 0 || espos < 6 || query.substring(nspos + 6, espos).trim().length != 0) {
            // no params
            params2 = {};
        }
        else {
            params2 =   ((query.substring(query.length-2, query.length-1) == ";") ?  query.substring(espos + 1, query.length-1):query.substring(espos + 1)).trim();
            
        }
        
        try {
            params2 = JSON.parse(params);

        }
        catch (err) {
            params2 = {};

        }

        
        if (data) {
            for (var i = 0; i < data.length; i++) {
             //   console.log("query:%s, name:%s, value:%s", params, data[i].name, data[i].value);
                params = params.replace("{{" + data[i].name + "}}", "'" + data[i].value.replace(/'/g, "''") + "'");
                    //query = query.replace('{{' + data[i].name + '}}','@' + data[i].name);
                    //	query = query.replace(/{{/g, "'");
                    //	query = query.replace(/}}/g,"'");
            }

        }

        var deferred = Q.defer();
        
        
        // Connect to the db
        mongoClient.connect(config, function (err, db) {
            
            if (err) {
                var error = { type: "Mongodb error", error: err };
                return deferred.reject(JSON.stringify(error));
            }
            
           var collection = db.collection(cols);
            
            switch (fun) {
                case "find":
                    {
                        collection[fun](params).toArray(function (err, result) {
                            
                            if (err) {
                                var error = { type: "Mongodb resultset error", error: err };
                                return deferred.reject(JSON.stringify(error));
                            }
                            deferred.resolve(result);
                            db.close();
                        });
                    }
                    break;
                case "update":
                    {
                        collection[fun](params, param2, function (err, result) {
                            
                            if (err) {
                                var error = { type: "Mongodb resultset error", error: err };
                                return deferred.reject(JSON.stringify(error));
                            }
                            deferred.resolve(result);
                            db.close();
                        });
                    }
                    break;
               default:
                    {
                        collection[fun](params, function (err, result) {
                            
                            if (err) {
                                var error = { type: "Mongodb resultset error", error: err };
                                return deferred.reject(JSON.stringify(error));
                            }
                            deferred.resolve(result);
                            db.close();
                        });
                    }
                    break;
            }
            
          /*  collection[fun](params, function (err, result) {
                
                if (err) {
                    var error = { type: "Mongodb resultset error", error: err };
                    return deferred.reject(JSON.stringify(error));
                }
                deferred.resolve(result);
                d.close();
            });
           * */

        });
        
        return deferred.promise;
    }
}