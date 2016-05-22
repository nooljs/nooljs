// noolServer.js 0.0.1
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT

module.exports = function () {
	var $config = {};
	var $connection = {};
	var _serverF = {};
	var _dbAdapter = {};
	var $permission = {};
	var _Q = {};
	var _fs = {};
	var _layoutParser= {};
	var $users = {};
	var $serverMethods = [];
    var path = require("path");
    var requireDirectory = require('require-directory');
    var  dbConnection = requireDirectory (module, "../db");
	
	_monitorServerMethodsTimeout = 60000; // 60 sec

	readFile = function (fileName) {
		var deferred = _Q.defer();
		_fs.readFile(fileName, function (err, data) {
			if (!err)
				deferred.resolve(data);
			else
				deferred.reject(err);

		});
		return deferred.promise;
	};

	getConnection = function (name) {
		for (var i in $connection) {
			if ($connection[i].name == name)
				return $connection[i];
		}
		return null;
	};
	
	clearServerMethod=function(fileName)
	{
		for( var i in $serverMethods)
		{
			if($serverMethods[i].name==fileName)
			{
				$serverMethods.splice(i,1);
				return;
			}
		}
	};
	
	getServerMethod= function(fileName)
	{
		for( var i in $serverMethods)
		{
			//console.log( "getServerMethod %s   current name : %s, filename : %s",i, $serverMethods[i].name,   fileName);
			if($serverMethods[i].name==fileName)
			{
			//	console.log(" getServerMethod %s  selected current name : %s, filename : %s",i, $serverMethods[i].name,   fileName);
				return $serverMethods[i];
			}
		}
	}
	
	executeServerMethod =function(fileName, methodName, args, callback, user)
	{
		var result = {};
		
		var serverMethod = getServerMethod(fileName);
		
		if(serverMethod && serverMethod.fun, serverMethod.fun[methodName] && serverMethod.fun[methodName].method)
		{
			serverMethod = serverMethod.fun[methodName];
				
			// validate the permission
			if(serverMethod.permission)
			{
				// we have permission name
				//validate it
				if(!validatePermission(serverMethod.permission, user, $config, $permission))
				{
					
					result.error= {code:"INVALID_PERMISSION", message:"Server method " + fileName + "." +  methodName +  " does not have permission."};
					if(callback)
						callback(result);
					return;
				}
				console.log("executeServerMethod starting ... serverMethod %s has valid permission %s",serverMethod , serverMethod.permission);
				
			}
			try
			{
				console.log("executeServerMethod executing ... serverMethod %s , args:%s",serverMethod, JSON.stringify(args)) ;
				
				var obj = {
					$user:user,
					$config:$config,
					$connection:$connection
				};
				// args.push(callback);
				 result.data =  serverMethod.method.apply(obj, JSON.parse(args));
				console.log("executeServerMethod ... serverMethod %s  executed. result: %s",serverMethod , result.data);
			}
			catch(err)
			{
				console.log("executeServerMethod executing ... serverMethod %s has error %s",serverMethod , err);
				result.error = {code:"SERVER_ERROR", message:JSON.stringify(err)};
				//if(callback)
				//	callback(result.error, null);
			}
		}
		else{
			result.error= {code:"INVALID_METHOD", message:"Server method " + fileName + "." +  methodName +  " is not fond."};
				console.log("executeServerMethod  error :%s",result.error);
		}
		if(callback)
		{			
				console.log("executeServerMethod  callback error :%s, data:%s",result.error, result.data);
			callback(result);
		}
		
	};
	monitorServerMethods =function()
	{
		loadAllServerMethods(_fs, "SereverMethods");
	}
	loadAllServerMethods =function(fs, directoryName){
		
		fs.readdir(directoryName, function(err, filenames)
		{
			if(err)
				return;
			filenames.forEach(function(fileName){loadServerMethods( fs, fileName.substr(0, fileName.lastIndexOf('.')) , directoryName)});
		});
	};
	loadServerMethods = function(fs, fileName, directoryName){
		console.log("loadServerMethods readFile :%s" , (directoryName + "/" + fileName + ".js" ) );	 
	 
		var path = directoryName + "/" + fileName + ".js";
	
		var fileStat = fs.statSync(path);		
		
		var serverMethod = getServerMethod(fileName);
		if(serverMethod)
		{
			if(serverMethod.stat < fileStat)
			{
				//clear existing queries for this file
				clearServerMethod(fileName);
			}
			else
				return; // file upto date.. no need to re-parser it
		}
	
		return readFile( path)
		.then(function (data)
		{
	 
			data = data.toString();
			var obj = eval("x="+ data);
			$serverMethods.push({name:fileName,fun:obj, stat:fileStat});
		})
		.catch(function (err){
			console.log("loadServerMethods file name :%s  err :",fileName, err);
		});
	};
	nlServerLogout = function (methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_) {
		
		//first remove  user from user list
		if (_userKey_)
			$users.removeUser(_userKey_);

		$scope.data.url =$config.logout;
		
		if(callback)
		{			
			callback($scope);			
		}
	};

	nlDbLogin = function (methodName, typeName, template, data, $scope, serverF,  callback,  _userKey_) {
		_Q.spawn(function  * () {
			var query = _layoutParser.getQuery(methodName);
			
			var conn = getConnection($config.defaultConnection);			
			
			var result ={};
			try{
				result = yield dbConnection[conn.type].execute(conn.config, query.queryString, data);
			}
			catch(error)
			{
				$scope.error = {code:"SERVER_ERROR", message:error};
				callback($scope);
				return;
			}

			if (Array.isArray(result) && result.length == 1)
				result = result[0];

			if ($config.userid && result && result[$config.userid] && result[$config.userid] > 0) {
					
				// login successfully
				var user = result;
				var userKey = $users.createSession(user);
				$scope.data._userKey_ = userKey;
				$scope.data.user = user;
				bSessionCreated = true;
			} else {
					$scope.error = {
						code : ((result && result.errorcode) ? result.errorcode : "INVALID_LOGIN"),
						message : (((result && result.errormessage) ? result.errormessage : " login username/password"))
					};
			}
			
			callback($scope);
		});
	};

	nlDbClick = function (methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_) {
		_Q.spawn(function  * () {
			//first remove  user from user list
			try
			{
				var query = _layoutParser.getQuery(methodName);
				var conn = getConnection($config.defaultConnection);
				$scope.data = yield dbConnection[conn.type].execute(conn.config, query.queryString, data);				
			}
			catch(err)
			{
				console.log('nlDbClick catch error : %s', JSON.stringify(err));
				$scope.error = {code:"SERVER_ERROR", message:JSON.stringify(err)};
			}
			callback($scope);
		});
	};

	nlDbData = function (methodName, typeName, template, data, $scope, serverF,callback,  _userKey_) {
		_Q.spawn(function  * () {
			//first remove  user from user list
			try{
				
				var query = _layoutParser.getQuery(methodName);
				var conn = getConnection($config.defaultConnection);
				$scope.data = yield dbConnection[conn.type].execute(conn.config, query.queryString, data);			
			}
			
			catch(err)
			{
				console.log('nlDbData catch error : %s', JSON.stringify(err));
				$scope.error = {code:"SERVER_ERROR", message:JSON.stringify(err)};
			}
			callback($scope);
		});
	};

	nlServerClick = function (methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_) {
		return nlServerProcess(methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_);
	};

	nlServerData = function (methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_) {
		return nlServerProcess(methodName, typeName, template, data, $scope, serverF, callback,  _userKey_);
	};

	nlServerLogin = function (methodName, typeName, template, data, $scope, serverF,  callback,  _userKey_) {
		return nlServerProcess(methodName, typeName, template, data, $scope, serverF, callback,  _userKey_);
	};
	nlServerProcess = function (methodName, typeName, template, data, $scope, serverF, callback ,  _userKey_) {
		
		_Q.spawn(function  * () {
			var error;
			try{
				var bSessionCreated = false;
				$scope = nameValueToObj(data);

				if (!$scope)
					$scope = {};
		
				//get the server object
				var serverFunObj = _layoutParser.getServerFunction(template, methodName);
				serverFun = serverFunObj.fun;
				
				// execure server function if  available
				if (typeof serverFun.server == "function") {
					
					// we have server function execute it
					var result = serverFun.server($scope);

					//check whether  it is login process
					if (typeName == 'nlServerLogin' && $scope.user && $config.userid && $scope.user[$config.userid] && $scope.user[$config.userid] > 0 && !bSessionCreated) {
						
						// login sucecssfull
						var user = $scope.user;
						var userKey = $users.createSession(user);
						$scope._userKey_ = userKey;
						bSessionCreated = true;
					}

					// if the server function return false then exist
					if (result == false)
					{					
						callback({data:$scope});
						return;
					}
				}

				if (serverFun.db && serverFun.db.query) 
				{
					//$scope[serverFunObj.model] = yield serverF.sqlserver['dbData'](serverFun.db.query, layoutParser.objToNameValue($scope));
					var conn = getConnection(((serverFun.db.connection) ? serverFun.db.connection : $config.defaultConnection));
					var result = yield dbConnection[conn.type].execute(conn.config, serverFun.db.query, _layoutParser.objToNameValue($scope));
					
					
					$scope[serverFunObj.model] =  result ; //yield serverF[conn.type].execute(conn.config, serverFun.db.query, _layoutParser.objToNameValue($scope));

					if (serverFun.db.resultType && serverFun.db.resultType == 'single') {
						
						// get only first row of the result set
						if ($scope[serverFunObj.model] && Array.isArray($scope[serverFunObj.model]) == true && $scope[serverFunObj.model].length > 0)
							$scope[serverFunObj.model] = $scope[serverFunObj.model][0];
					}				
					
					//check whether  it is login process
					if (typeName == 'nlServerLogin' && $scope.user && $config.userid && $scope.user[$config.userid] && $scope.user[$config.userid] > 0 && !bSessionCreated) {
						
						// login sucecssfull
						var user = $scope.user;
						var userKey = $users.createSession(user);
						$scope._userKey_ = userKey;
						bSessionCreated = true;
					}
				}

				if (typeof serverFun.post == "function") 
				{				
					// we have post  server function execute it
					serverFun.post($scope);

					//check whether  it is login process
					if (typeName == 'nlServerLogin' && $scope.user && $config.userid && $scope.data.user[$config.userid] && $scope.user[$config.userid] > 0 && !bSessionCreated) {
						// login successfully
						var user = $scope.user;
						var userKey = $users.createSession(user);
						$scope._userKey_ = userKey;
						bSessionCreated = true;
					}
				}
			}
			catch(err)
			{
				console.log('nServerProcess catch error : %s', JSON.stringify(err));
				error = {code:"SERVER_ERROR", message:JSON.stringify(err)};
			}
			callback({data:$scope,error:error});
		});
	};

	validatePermission = function (permissionName, user, $config, $permission) {
		
		// if permission name is empty need not be validate
		if (!permissionName)
			return true;

		var bValidated = false;
		
		if(!user )
		{
			console.log("validatePermission  empty user");
			return false;
		}

		for (var i in $permission) {
			
			var p = $permission[i];
			
			if (user[p.userKey] == p.userValue) {
				
				// we found matching object
				if (p.permission == "*") {
					// for * all the  permissions are allowed
					return true;
				}

				//check whether permission exists in the array
				for (var j in p.permission) {
					// we have found matching permission. return true.
					if (p.permission[j] == permissionName)
						return true;
				}
			}
		}
		return bValidated;
	};

	init = function (Q, fs, serverF,layoutParser) {
		_Q = Q;
		_fs = fs;
		_serverF = serverF;
		_layoutParser = layoutParser;	

		//initialize layout parser
		_layoutParser.init(fs); 

		var configFile = "config/config.json";
		var connectionFile = "config/connection.json";
		
		//load all server methods 
		loadAllServerMethods(fs, "ServerMethods");
		setInterval(monitorServerMethods, _monitorServerMethodsTimeout);
		
		// read the config file
		readFile(configFile)
		.then(function (data) {
			if (!data) {
				console.log("can't read config file");
				return;
			}

			$config = JSON.parse(data);

			//create user session
			$users = _serverF.nlUsers(($config.sessionTimeoutMinutes) ? $config.sessionTimeoutMinutes : 60);

			// load connection data
			return readFile(connectionFile);
		})
		.then(function (data) {
			if (!data) {
				return;
			}
			$connection = JSON.parse(data);

			if ($config.permission) {
				var conn = getConnection($config.permission.connection);
				return dbConnection[conn.type].execute(conn.config, $config.permission.query);
			}
		})
		.then(function (result) {
			$permission = result;
		})
		.catch (function (err) {
			console.log("server Init error  :" + err);
		});

	};
	return {
		execServerMethod: function(methodName, args, callback,  _userKey_) {
			try{
				
				var obj = $users.getUser(_userKey_);
				var user = obj.user;
				
				//methodname should be filename.methodname
				var methods = methodName.split(".");
				executeServerMethod(methods[0], methods[1], args, callback, user);
			}
			catch(err)
			{
				console.log("execServerMethod : %s, err : %s",methodName,  JSON.stringify(err));
				if(callback)
					callback( {code:"SERVER_ERROR", message:JSON.stringify(err)});
			}
			
		},
		serverFunctions : function (methodName, typeName, template, data, $scope, serverF, callback,  _userKey_) {
			var bSessionCreated = false;

			var obj = $users.getUser(_userKey_);
			var user = obj.user;

			_layoutParser.getFileData(_fs, template, "layout")
			.then(function (result) {

				var permissionName = result.permission;

				if (!validatePermission(permissionName, user, $config, $permission)) {
					// invalid permission
					$scope.error = {
						code : "NOPermission",
						message : $config.permission.errorMessage
					};
					return;
				}
					
				this[typeName](methodName, typeName, template, data, $scope,  serverF, callback,  _userKey_);
			})
			.catch (function (err) {
			  console.log("server process  error  :" + err);
		});
			//return $scope;
		},
		init : init,
		getLayout : function (layoutName, _userKey_) {
			
			return _layoutParser.getFileData(_fs, layoutName, "layout")
			.then(function (result) {
				
				var data = {};
				if (!result) {
					//  the layout table file not found
					data.error = {
						code : "NoLayout",
						message : "layout is not found for " + layoutName
					};
				}
				else {
					// we have layout object
					//get the user object
					var user = $users.getUser(_userKey_).user;
					var permissionName = result.permission;
					if (!validatePermission(permissionName, user, $config, $permission)) {
						
						console.log("validation failure for permission :%s, user: %s" , permissionName, user );
						// invalid permission
						data.error = {
							code : "NOPermission",
							message : $config.permission.errorMessage
						};
					} else {
						data.layout = result.data;
					}
				}
				return data;
			});
		}
	}
}
