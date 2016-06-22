// nooljsclient.js 0.0.1
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT

var nooljs = angular.module('nooljs', []);
//var socket = io.connect(location.origin);
//var nlUseWebSocket = false;

nooljs.factory('nlSocket', function ($rootScope) {
    var socket = io.connect(location.origin);
    return {
        on: function(event,  callback) {
            socket.on(event, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (event, data, callback) {
            socket.emit(event, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        }
        // add other events
    }
});

nooljs.factory('nlStorage', function () {
	return {
		set : function (type, name, value) {
			var storage = {};
			if (type == "localStorage" && localStorage)
				storage = localStorage;
			else if (type == "sessionStorage" && sessionStorage)
				storage = sessionStorage;
			else
				return; // invalid type  or not supported

			// convert to value to json string
			storage.setItem(name, JSON.stringify(value));
		},
		get : function (name) {
			var value = sessionStorage.getItem(name);

			if (!value) {
				value = localStorage.getItem(name);
			}

			return value && JSON.parse(value); ; // invalid type  or not supported
		},
		remove: function (name) {
			sessionStorage.removeItem(name);
			localStorage.removeItem(name);
		}
	}
});

nooljs.factory('nlServerMethods', ['httpService', 'nlUtil', function (httpService, nlUtil) {
	return {
		exec:function()
		{
			var callback = undefined;
			var methodName =  undefined;
			var args = [];
			for (var i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			methodName = args.shift();
			if(arguments.length> 0){
				if(typeof(arguments[arguments.length -1]) == "function")
				{
					callback = args.pop();// last item is call back and remove it from array
				}
			}
			
            if (getWebsocketUsedfromAttrs()){
                nlSocket.emit("nlServerMethod", JSON.stringify(args), function (data) {
                    postProcessCallback(attrs, dbAttr, elemType, JSON.parse(data));
                });
			}
			else {
				return httpService.execServerMethod(methodName, JSON.stringify(args));
			}
		}
	}
}]);

nooljs.factory('nlUtil', function ($http, nlStorage) {
    var _useWebsocket = false;

    var getWebsocketUsedfromAttrs = function (attrs) {
        if (attrs && attrs.nlWebsocket) {
            if (attrs.nlWebsocket == "true")
                return true;

            return false;
        }
        return _useWebsocket;
    }
  

    return {

        getWebsocketUsedfromAttrs: getWebsocketUsedfromAttrs,

        isWebsocket: function () {
            return _useWebsocket;
        },
        useWebsocket: function (useWebsocketFlag) {
            _useWebsocket = useWebsocketFlag;
        },
		getValue : function ($scope, varName) {

			//parser the varName
			var vars = varName.split(".");
			var value = null;
			for (var i = 0; i < vars.length; i++) {
				if (i == 0) {
					var temp = $scope;
					while (temp[vars[i]] == undefined && temp.$parent)
						temp = temp.$parent;
					value = temp[vars[i]];
				} else {
					if (value)
						value = value[vars[i]];
				}
			}
			return value;
		},
        serverProcess: function ($scope, elem, attrs, httpService, nlStorage, $compile, elemType, preClickType, postClientType, nlSocket) {
			that = this;
			console.log(attrs[elemType]);
			console.log("nlServerClick  Directive attr :" + attrs[elemType]);
			var data = [];

			var dbAttr = JSON.parse(attrs[elemType]);
			for (var i = 0; (dbAttr.p && i <  dbAttr.p.length); i++) {
				var scopeName = dbAttr.p[i];
				//data[scopeName]=nlUtil.getValue($scope, scopeName);

                //don't send _error
                if (scopeName != "_error") {
                    value = {
                        name: scopeName,
                        value: this.getValue($scope, scopeName)
                    };
                    data.push(value);
                }

			};

			if (attrs[preClickType]) {
				//call the client post data function with scope as input
				var script = attrs[preClickType] + "($scope)";
				var result = $scope.$nlScriptObj[attrs[preClickType]]($scope);

				// if nlClientPreData return false
				if (result == false)
					return;
            }

            var postProcessCallback = function (attrs, dbAttr, elemType, data, nlSocket) {

                var error = data.error;

                // if this is error then return
                if (error) {
                    $scope.$root._error = error;
                    console.log(" elemType : %s, error  code:%s, error Message: %s", elemType, error.code, error.message);
                    return;
                }
                else {
                    $scope.$root._error = {};
                }
                data = data.data;

                var nlDbModel = (attrs.nlDbModel) ? attrs.nlDbModel : dbAttr.md;

                if (nlDbModel)
                    $scope[nlDbModel] = (dbAttr.md) ? data[dbAttr.md] : data; //[attrs.nlServerData];

                console.log(" post data:" + data);

                if (elemType == "nlDbLogin" || elemType == "nlServerLogin") {
                    //check whether this has session key
                    if (data._userKey_ && data.user) {
                        nlStorage.set("sessionStorage", "_userKey_", data._userKey_);
                        $scope.$root.user = data.user;
                    }
                }
                if (elemType == "nlServerLogout") {
                    nlStorage.remove("_userKey_");
                    that.getLayOut($scope, elem, attrs, httpService, $compile, data.url, "", nlSocket);
                    return;
                }

                //check whether there is any post data function
                if (attrs[postClientType]) {
                    //call the client post data function with scope as input
                    var script = attrs[postClientType] + "($scope)";
                    //eval($scope.scriptData);
                    //eval(script);
                    $scope.$nlScriptObj[attrs[postClientType]]($scope);
                    //$scope.$eval(script);
                }
                if (attrs.nlRedirect) {
                    var redirect = JSON.parse(attrs.nlRedirect.replace(/'/g, "\""));

                    console.log("successfully processed  next template :" + redirect.url);

                    if (((elemType == "nlDbLogin" && data._userKey_) || elemType != "nlDbLogin") && ((!redirect.cond) || $scope.$eval(redirect.cond))) {
                        console.log("successfully   satisfied condition for next template :" + redirect.url);

                        that.getLayOut($scope, elem, attrs, httpService, $compile, redirect.url, redirect.params, nlSocket);
                    }
                }

            }

            // Don't pass error object to server
            if (data && data._error)
                data._error = undefined;
             
            var useWebSocket = getWebsocketUsedfromAttrs(attrs);
			// execute server function and get the data
            if (useWebSocket) {
                var cacheName = "data_" + dbAttr.t + "_" + elemType + "_" + dbAttr.m;
                var result = nlStorage.get(cacheName);

                // if result is available in the storage then get the result
                if (result)
                    return result;

                var _userKey_ = nlStorage.get("_userKey_");


                var reqData = {
                        "type": elemType,
                        "method": dbAttr.m,
                        "data": data,
                        "_userKey_": _userKey_,
                        "template": dbAttr.t
                    };
                nlSocket.emit("nlServerData", reqData, function (data) {
                    postProcessCallback(attrs, dbAttr, elemType, JSON.parse(data), nlSocket );
                });

			} else {
                httpService.postData(dbAttr.t, elemType, dbAttr.m, data).then(function (data) {

                    postProcessCallback(attrs, dbAttr, elemType, data, nlSocket);
                });
			}

		},
        getLayOut: function ($scope, elem, attrs, httpService, $compile, layoutName, params, nlSocket) {
            that = this;

            var layoutCallback = function ($scope, elem, attrs,  $compile, layoutName, params, data) {

                var error = data.error;

                // if this is error then return
                if (error) {
                    $scope.$root._error = error;
                    console.log(" %s layout load errror %s %s", layoutName, error.code, error.message);
                    return;
                } else {
                    $scope.$root._error = {};
                }
                data = data.layout;
                console.log(' layout loaded %s', data);
                //get data from  any nl-client-script tags
                var spos = data.indexOf("<nl-client-script");
                var epos = data.indexOf("</nl-client-script");

                //add new scope with passing params
                var newScope = $scope; //$scope.$root.$new();

                if (spos >= 0 && epos > 0) {
                    // get first > tag from spos
                    var sspos = data.indexOf(">", spos);
                    //we have client script
                    var scriptdata = data.substring(sspos + 1, epos);
                    console.log("script data :" + scriptdata);
                    //$scope.$eval(scriptdata);
                    if (newScope.scriptData)
                        newScope.$nlScriptData += ' ' + scriptdata;
                    else
                        newScope.$nlScriptData = scriptdata;

                    newScope.$nlScriptObj = eval(("x=" + scriptdata));
                    data = data.substring(0, spos);
                }
                //get the parent content
                console.log("template :" + data);
                var spos = data.indexOf("nl-parent=");
                spos = data.indexOf("\"", spos);
                var epos = data.indexOf("\"", spos + 1);
                var parentElemName = data.substring(spos + 1, epos);
                console.log("parent element name :" + parentElemName);

                var pelem = angular.element(document.getElementById(parentElemName));
                // var e =$compile(data)($scope);
                // pelem.replaceWith(e);
                //elem.show();
                pelem.html(data).show();

                if (params) {
                    //for(var name in $scope,params)
                    for (var name in params) {
                        //newScope[name] =params[name];
                        newScope[name] = that.getValue($scope, params[name]);
                    }
                }

                $compile(pelem.contents())(newScope);
            }

            var useWebSocket = getWebsocketUsedfromAttrs(attrs);
            if (useWebSocket)
            {
                var _userKey_ = nlStorage.get("_userKey_");

                var reqData = {
                    "name": layoutName,
                    "_userKey_": _userKey_
                };

                nlSocket.emit("nlLayout", reqData, function (data) {
                    layoutCallback($scope, elem, attrs, $compile, layoutName, params, JSON.parse(data));
                });
            }
            else {
                httpService.getLayout(layoutName).then(function (data) {
                    layoutCallback($scope, elem, attrs, $compile, layoutName, params, data);
                });
            }
		}
	}
});

nooljs.factory('httpService', function ($http, nlStorage) {
	return {

		getLayout : function (layoutName) {

			var result = nlStorage.get(layoutName);

			// if result is available in the storage then get the result
			if (result)
				return result;

			var _userKey_ = nlStorage.get("_userKey_");

			return $http({
				url : '/getLayout',
				method : "POST",
				data : $.param({
					"name" : layoutName,
					"_userKey_" : _userKey_
				}),
				headers : {
					'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}).then(function (result) {
				return result.data;
			});
		},
		execServerMethod : function (methodName,args) {

			var _userKey_ = nlStorage.get("_userKey_");

			return $http({
				url : '/execServerMethod',
				method : "POST",
				data : $.param({
					"method":methodName,
					"args" : args,
					"_userKey_" : _userKey_
				}),
				headers : {
					'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}).then(function (result) {
				return result.data;
			});
		},
		postData : function (template, type, serverMethod, data, nlCache) {
			var cacheName = "data_" + template + "_" + type + "_" + serverMethod;
			var result = nlStorage.get(cacheName);

			// if result is available in the storage then get the result
			if (result)
				return result;
			var _userKey_ = nlStorage.get("_userKey_");


			return $http({
				url : '/serverFunctions',
				method : "POST",
				data : $.param({
					"type" : type,
					"method" : serverMethod,
					"data" : data,
					"_userKey_" : _userKey_,
					"template" : template
				}),
				headers : {
					'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}).then(function (result) {
				if (result.data && result.data.data && nlCache)
					nlStorage.set(nlCache, cacheName, result.data.data);

				return result.data;
				//   return result.data[serverMethod];
			});
			/*
			return $http.post('core/server/serverfunction.js').then(function(result) {
			return result.data;
			});
			 */
		},
		getData : function (type, serverMethod, data, nlCache) {
			var cacheName = "data_" + template + "_" + type + "_" + serverMethod;
			var result = nlStorage.get(cacheName);

			return $http({
				url : '/Serverfunctions',
				method : "GET",
				data : $.param({
					"type" : type,
					"method" : serverMethod,
					"data" : data
				}),
				headers : {
					'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}).then(function (result) {
				if (result.data && result.data && nlCache)
					nlStorage.set(nlCache, cacheName, result.data.data);
				return result.data;
			});
			/*
			return $http.post('core/server/serverfunction.js').then(function(result) {
			return result.data;
			});
			 */
		}
	};
});

nooljs.directive('nlDefaultTemplate', ['httpService', 'nlUtil', '$compile', 'nlSocket', function (httpService, nlUtil, $compile, nlSocket) {
			console.log("nlDefaultTemplate Directive was run");
			return {
				restrict : 'A',
				link : function ($scope, elem, attrs) {
					function init() {
                        nlUtil.getLayOut($scope, elem, attrs, httpService, $compile, attrs.nlDefaultTemplate, null, nlSocket);
					};
					init();
				}
			};
		}
	]);

nooljs.directive('nlTemplate', ['$compile', function ($compile) {
			console.log("nlTemplate Directive was run");
			return {
				restrict : 'E',
				scope : true,
				require : ['^?nlDbLogin', 'nlTemplate'],
				controller : function ($scope) {
					console.log("nlTemplate controller was called");
				},
				link : function ($scope, elem, attrs, ctrl) {
					console.log("nlTemplate Link was called");
				}
			};
		}
	]);

nooljs.directive('nlDbData', ['httpService', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			console.log("nlDbData Directive was run");
			return {
				restrict : 'A',
				link : function ($scope, elem, attrs) {
					function int() {
						console.log(attrs.nlDbData);
						console.log("nlDbData  Directive attr :" + attrs.nlDbData);
                        nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDbData', 'nlClientPreData', 'nlClientPostData', nlSocket);
					};

					int();
					console.log("Link was called");
				}
			};
		}
	]);

nooljs.directive('nlServerData', ['httpService', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			console.log("nlServerData Directive was run");
			return {
				restrict : 'A',
				link : function ($scope, elem, attrs) {
					function int() {
                        nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlServerData', 'nlClientPreData', 'nlClientPostData', nlSocket);
					};

					int();
					console.log("Link was called");
				}
			};
		}
	]);

nooljs.directive('nlServerClick', ['httpService', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			console.log("nlServerClick Directive was run");
			return {
				restrict : 'A',

				link : function ($scope, elem, attrs) {
					function int() {
						$scope.clickingCallback = function () {
                            nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlServerClick', 'nlClientPreClick', 'nlClientPostClick', nlSocket);
						};
						elem.bind('click', $scope.clickingCallback);
					};

					int();
					console.log("Link was called");
				}
			};
		}
	]);

nooljs.directive('nlDbClick', ['httpService', 'nlStorage', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, nlStorage, $compile, nlSocket) {
			console.log("nlClick Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) {
					function int() {
						$scope.clickingCallback = function () {
                            nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDbClick', 'nlDbClientPreClick', 'nlClientPostClick', nlSocket);
							//nlUtil.dbClick($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDbClick');
						};
						elem.bind('click', $scope.clickingCallback);
					};

					int();
					console.log("nlClick  was called");
				}
			};
		}
	]);

nooljs.directive('nlClickRedirect', ['httpService', 'nlUtil', 'nlStorage', '$compile', 'nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			console.log("nlClick Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) {
					function int() {
						$scope.clickingCallback = function () {
							//read redirect url and convert into json object
							var url = JSON.parse(attrs.nlClickRedirect.replace(/'/g, "\""));

                            nlUtil.getLayOut($scope, elem, attrs, httpService, $compile, url.url, url.params, nlSocket );
						};
						elem.bind('click', $scope.clickingCallback);
					};

					int();
					console.log("nlClick  was called");
				}
			};
		}
	]);

nooljs.directive('nlDbLogin', ['httpService', 'nlStorage', 'nlUtil', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			console.log("nlDbLogin Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) { {
						function int() {
							$scope.clickingCallback = function () {
                                nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDbLogin', 'nlClientPreLogin', 'nlClientPostLogin', nlSocket);
							};
							elem.bind('click', $scope.clickingCallback);
						};

						int();
						console.log("Link was called");
					}
				}
			};
		}
	]);
nooljs.directive('nlServerLogin', ['httpService', 'nlStorage', 'nlUtil', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			console.log("nlServerLogin Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) { {
						function int() {
							$scope.clickingCallback = function () {
                                nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlServerLogin', 'nlClientPreLogin', 'nlClientPostLogin', nlSocket);
							};
							elem.bind('click', $scope.clickingCallback);
						};

						int();
						console.log("Link was called");
					}
				}
			};
		}
	]);
nooljs.directive('nlServerLogout', ['httpService', 'nlStorage', 'nlUtil', '$compile', 'nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			console.log("nlServerLogout Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) { {
						function int() {
							$scope.clickingCallback = function () {
                                nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlServerLogout', 'nlClientPreLogout', 'nlClientPostLogout', nlSocket);
							};
							elem.bind('click', $scope.clickingCallback);
						};

						int();
						console.log("Link was called");
					}
				}
			};
		}
	]);
