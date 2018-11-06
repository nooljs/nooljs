// nooljsclient.js 0.1.0
// Copyright (c) 2016  Chandru(Puva) Krishnar <chandru0507@gmail.com>
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
		},
		clear: function (type) {
			var storage = {};
			if (type == "localStorage" && localStorage)
				storage = localStorage;
			else if (type == "sessionStorage" && sessionStorage)
				storage = sessionStorage;
			else
				return; // invalid type  or not supported
			storage.clear();
		}

	}
});

nooljs.factory('nlServerMethods', ['httpService', 'nlUtil',  function (httpService, nlUtil) {
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
		getValue : function ($scope, varName, checkParent = true, checkChildren = false,scopeIds) {

			//if ($scope.__checkChildren == true && checkChildren == false)
			//	checkChildren = true;

			if (!scopeIds) {
				scopeIds = [];
			}

			if (scopeIds.includes($scope.$id))
				return null; // already searched

			scopeIds.push($scope.$id);

			//parser the varName
			var vars = varName.split(".");
			var value = null;
			for (var i = 0; i < vars.length; i++) {
				if (i == 0) {
					var temp = $scope;
					value = temp[vars[i]];	

					if ((value == undefined || value == null) && $scope._childrenScope) {
						// we have children scope
						for (let ii = 0; ii < $scope._childrenScope.length && (value == undefined || value == null); ii++) {
							value = this.getValue($scope._childrenScope[ii], varName, false, false, scopeIds);
						}
					}

					//if (value==null && checkChildren == true) {
					//	for (var cs = temp.$$childHead; cs && value == null; cs = cs.$$nextSibling) {
					//		// cs is child scope
					//		value = this.getValue(cs, varName, false, true); 
					//	}
					//}
					while ((value == undefined || value == null) && temp.$parent && checkParent == true) {
						temp = temp.$parent;
						value = this.getValue(temp, varName, false, false, scopeIds);
					}					
				} else {
					if (value)
						value = value[vars[i]];
				}
            }
            if (value == undefined)
				value = null;

			
            
			return value;
		},
		serverProcess: function ($scope, elem, attrs, httpService, nlStorage, $compile, elemType, preClickType, postClientType, nlSocket) {

			let dbAttr = JSON.parse(attrs[elemType]);
			let  nlDbModel = (attrs.nlDbModel) ? attrs.nlDbModel : dbAttr.md;

			return this.serverCoreProcess($scope, elem, attrs, httpService, nlStorage, $compile, elemType, attrs[preClickType], attrs[postClientType],
				dbAttr, nlDbModel,  nlSocket);
		},
		serverCoreProcess: function ($scope, elem, attrs, httpService, nlStorage, $compile, elemType, preClientFun, postClientFun, dbAttr, nlDbModel, nlSocket) {
			that = this;
			//console.log(attrs[elemType]);
			//console.log("nlServerClick  Directive attr :" + attrs[elemType]);
			

			if (preClientFun) {
				//call the client post data function with scope as input
				var script = preClientFun + "($scope)";
				var result = $scope.$nlScriptObj[preClientFun]($scope);

				// if nlClientPreData return false
				if (result == false)
					return;
            }

            var data = [];

            //var dbAttr = JSON.parse(attrs[elemType]);
            for (var i = 0; (dbAttr.p && i < dbAttr.p.length); i++) {
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

			// if elem type nlDynDbData change as elemDbType since both are doing samething
			elemType = (elemType == 'nlDynDbData') ? 'nlDbData' : elemType;

			var postProcessCallback = function (attrs, dbAttr, elemType, data, nlSocket) {

                var error = data.error;

                // if this is error then return
                if (error) {
                    $scope.$root._error = error;
                 //   console.log(" elemType : %s, error  code:%s, error Message: %s", elemType, error.code, error.message);
                    return;
                }
                else {
                    $scope.$root._error = {};
                }
                data = data.data;               

				if (nlDbModel) {
					// hangle index model
					if (nlDbModel.indexOf("[") > 0) {
						let indexStr = nlDbModel.substring(nlDbModel.indexOf("[") + 1, nlDbModel.indexOf("]"));
						let mainModel = nlDbModel.substring(0, nlDbModel.indexOf("["));

						if (!$scope[mainModel])
							$scope[mainModel] = {};
						$scope[mainModel][indexStr] = (dbAttr.md) ? data[dbAttr.md] : data;
					}
					else {
						$scope[nlDbModel] = (dbAttr.md) ? data[dbAttr.md] : data; //[attrs.nlServerData];
					}
				}

               // console.log(" post data:" + data);

                if (elemType == "nlDbLogin" || elemType == "nlServerLogin") {
                    //check whether this has session key
                    if (data._userKey_ && data.user) {
                        nlStorage.set("sessionStorage", "_userKey_", data._userKey_);
                        $scope.$root.user = data.user;
                    }
                }
                if (elemType == "nlServerLogout") {
					nlStorage.remove("_userKey_");
					nlStorage.clear("sessionStorage");
					var targetId = (attrs) ? attrs.targetId : null;
					that.getLayOut($scope, elem, attrs, httpService, $compile, data.url, "", nlSocket, targetId);
                    return;
                }

                //check whether there is any post data function
				if (postClientFun) {
                    //call the client post data function with scope as input
					var script = postClientFun + "($scope)";
                    //eval($scope.scriptData);
                    //eval(script);
					$scope.$nlScriptObj[postClientFun]($scope);
                    //$scope.$eval(script);
                }
                if (attrs.nlRedirect) {
                    var redirect = JSON.parse(attrs.nlRedirect.replace(/'/g, "\""));

                   // console.log("successfully processed  next template :" + redirect.url);

                    if (((elemType == "nlDbLogin" && data._userKey_) || elemType != "nlDbLogin") && ((!redirect.cond) || $scope.$eval(redirect.cond))) {
						//console.log("successfully   satisfied condition for next template :" + redirect.url);

						//Chandru K - 2017-11-15close all the open modals this is temp fix.. later we need to identify which modal to be close and open
						$(".modal").modal('hide');
						var targetId = (attrs) ? attrs.targetId : null;
						that.getLayOut($scope, elem, attrs, httpService, $compile, redirect.url, redirect.params, nlSocket, targetId);
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
		getLayOut: function ($scope, elem, attrs, httpService, $compile, layoutName, params, nlSocket, targetId) {
            that = this;

			var layoutCallback = function ($scope, elem, attrs, $compile, layoutName, params, data) {

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
              //  console.log(' layout loaded %s', data);
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
                   // console.log("script data :" + scriptdata);
                    //$scope.$eval(scriptdata);
                    if (newScope.scriptData)
                        newScope.$nlScriptData += ' ' + scriptdata;
                    else
                        newScope.$nlScriptData = scriptdata;

                    newScope.$nlScriptObj = eval(("x=" + scriptdata));
                  //  newScope.$nlScriptObj.$scope = newScope;
                    data = data.substring(0, spos);
                }

                //get the parent content
               // console.log("template :" + data);

                var spos = data.indexOf("<nl-template");
                var epos = data.indexOf(">", spos);

				var nlTemplateAttrs = data.substring(spos + "<nl-template".length, epos);

				var parentElemName = targetId;
				if (!targetId) {

					var spos = nlTemplateAttrs.indexOf("nl-parent=");
					spos = nlTemplateAttrs.indexOf("\"", spos);
					epos = nlTemplateAttrs.indexOf("\"", spos + 1);
					parentElemName = nlTemplateAttrs.substring(spos + 1, epos);
				//	console.log("parent element name :" + parentElemName);
				}

				//$cookieStore.put('layout_' + parentElemName.trim(), layoutName);
				nlStorage.set("sessionStorage", "layout_" + parentElemName.trim(), layoutName);

				//parser dynamic ng-model
				var spos = 0;
				spos =data.indexOf('ng-model="{{', spos);

				while ( spos > 0) {
					var endpos = data.indexOf('}}', spos);
					var dyModel = data.substring(spos + 12, endpos);
					//get the value
					var realModel = that.getValue($scope, dyModel);
					data = data.substring(0, spos + 10) + realModel + data.substring(endpos+2) ;
					//console.log("dymodel: " + dyModel + " , realModel:" + realModel);
					spos = data.indexOf('ng-model="{{', spos);
				}

                var pelem = angular.element(document.getElementById(parentElemName));
                // var e =$compile(data)($scope);
                // pelem.replaceWith(e);
                //elem.show();
                pelem.html(data).show();

                if (params) {
                    //for(var name in $scope,params)
                    for (var name in params) {
                        //newScope[name] =params[name];
						let value = that.getValue($scope, name); 
						newScope[name] = (value == null && value == undefined) ? params[name] : value  ;
                    }
                }
                // execure the load function for the template
                // get the nl-load
                spos = nlTemplateAttrs.indexOf("nl-load=");
                if (spos > 0) {
                    // we  have load function for the template
                    spos = nlTemplateAttrs.indexOf("\"", spos);
                    epos = nlTemplateAttrs.indexOf("\"", spos + 1);
                    var loadFunction = nlTemplateAttrs.substring(spos + 1, epos);
                   // console.log("Load function :" + loadFunction);

                    if (newScope.$nlScriptObj[loadFunction]) {
                        // execute the nl-loada function after loading the template
                        newScope.$nlScriptObj[loadFunction](newScope);
                    }
                    else {
                        console.log("Error : function " + loadFunction + " for the template " + layoutName + " not available.");
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

nooljs.directive('nlDefaultTemplate', ['httpService', 'nlUtil', '$compile', 'nlSocket', 'nlStorage', function (httpService, nlUtil, $compile, nlSocket, nlStorage) {
			console.log("nlDefaultTemplate Directive was run");
			return {
				restrict : 'A',
				link : function ($scope, elem, attrs) {
					function init() {

						//var layout = $cookieStore.get('layout_' + attrs.id);
						var layout = nlStorage.get('layout_' + attrs.id);

						if ((!layout) || layout.length == 0)
							layout = attrs.nlDefaultTemplate;

						nlUtil.getLayOut($scope, elem, attrs, httpService, $compile, layout, null, nlSocket, attrs.id);
					};
                    init();
                   // console.log("nlDefaultTemplate  was called , scope id :%d, , element:%s, attr:%s", $scope.$id, elem, attrs);
				}
			};
		}
	]);

nooljs.directive('nlTemplate', ['$compile', 'nlSocket', function ($compile, nlSocket) {
			//console.log("nlTemplate Directive was run");
			return {
				restrict : 'E',
				scope : true,
				require : ['^?nlDbLogin', 'nlTemplate'],
				controller : function ($scope) {
                    console.log("nlTemplate controller was called");

                    nlSocket.on('alert', function (data) {
                        console.log("alert from server ..." + data);      /* I expect this to be the data I want */
                    });
				},
				link : function ($scope, elem, attrs, ctrl) {
                  //  console.log("nlTemplate Link was called");
                   // console.log("nlTemplate  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
				}
			};
		}
]);

nooljs.directive('nlDialog', ['$compile', function ($compile) {
	console.log("nlDialog Directive was run");
	return {
		restrict: 'A',
		scope: true,
		controller: function ($scope) {
			//console.log("nlDialog controller was called");
		},
		link: function ($scope, elem, attrs, ctrl) {
			$("body").append(elem);
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
						//console.log(attrs.nlDbData);
					//	console.log("nlDbData  Directive attr :" + attrs.nlDbData);
                        nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDbData', 'nlClientPreData', 'nlClientPostData', nlSocket);
					};

					int();
                   // console.log("Link was called");
                   // console.log("nlDbData  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
				}
			};
		}
]);

nooljs.directive('nlDynDbData', ['httpService', 'nlUtil', 'nlStorage', '$compile', 'nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
	console.log("nlDynDbData Directive was run");
	return {
		restrict: 'A',
		link: function ($scope, elem, attrs) {
			function int() {
				//console.log(attrs.nlDbData);
				//console.log("nlDynDbData  Directive attr :" + attrs.nlDynDbData);
				nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlDynDbData', 'nlClientPreData', 'nlClientPostData', nlSocket);
			};

			int();
			//console.log("Link was called");
			//console.log("nlDynDbData  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
		}
	};
}
]);

nooljs.directive('nlServerData', ['httpService', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			//console.log("nlServerData Directive was run");
			return {
				restrict : 'A',
				link : function ($scope, elem, attrs) {
					function int() {
                        nlUtil.serverProcess($scope, elem, attrs, httpService, nlStorage, $compile, 'nlServerData', 'nlClientPreData', 'nlClientPostData', nlSocket);
					};

					int();
                  //  console.log("Link was called");
                  //  console.log("nlServerData  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
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
                   // console.log("Link was called");
                   // console.log("nlServerClick  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
				}
			};
		}
]);

nooljs.directive('nlReportServerChange', ['httpService', 'nlUtil', 'nlStorage', '$compile', 'nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
	console.log("nlServerClick Directive was run");
	return {
		restrict: 'A',
		controller: function ($scope, $element) {
			$scope.changeEvent= function(){
				$scope.changeCallback();
			}
		},
		link: function ($scope, elem, attrs) {
			function int() {
				$scope.changeCallback = function () {
					// get  all the  db-queries for this report
					let model = attrs["nlModel"] ? attrs["nlModel"] : attrs["ngModel"];
					let queries = $scope._filters[model]; //filterName:filterName, attrName:attrName, obj:obj, model:model
					//execute any pre client function
					let preClientFun = attrs["nlReportServerChange"];

					if (preClientFun) {
						//call the client post data function with scope as input
						var result = $scope.$nlScriptObj[preClientFun]($scope);

						// if nlClientPreData return false
						if (result == false)
							return;
					}

					for (let i = 0; i < queries.length; i++) {
						//if (i > 0)
						//	preClientFun = null; // exceute the function only once

						let postClientFun = queries[i].postClientFun;

						let elmType = queries[i].attrName;
						let dbAttr = queries[i].obj;
						let nlDbModel = queries[i].model ? queries[i].model : dbAttr.md;
						let elScope = queries[i].elScope ? queries[i].elScope : $scope;
						nlUtil.serverCoreProcess(elScope, elem, attrs, httpService, nlStorage, $compile, elmType, null, postClientFun, dbAttr, nlDbModel, nlSocket);
					}
				};
				elem.bind('change', $scope.changeCallback);
			};

			int();
			// console.log("Link was called");
			// console.log("nlServerClick  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
		}
	};
}
]);

nooljs.directive('nlDbClick', ['httpService', 'nlStorage', 'nlUtil', 'nlStorage', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			//console.log("nlClick Directive was run");
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
                  //  console.log("nlClick  was called");
                  //  console.log("nlDbClick  was called , scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
				}
			};
		}
	]);

nooljs.directive('nlClickRedirect', ['httpService', 'nlUtil', 'nlStorage', '$compile', 'nlSocket', function (httpService, nlUtil, nlStorage, $compile, nlSocket) {
			//console.log("nlClick Directive was run");
			return {
				restrict : 'A',
				require : "^nlTemplate",
				link : function ($scope, elem, attrs, nlTemplateCtrl) {
					function int() {
						$scope.clickingCallback = function () {
							//read redirect url and convert into json object
							var url = JSON.parse(attrs.nlClickRedirect.replace(/'/g, "\""));

                            nlUtil.getLayOut($scope, elem, attrs, httpService, $compile, url.url, url.params, nlSocket, url.targetId );
						};
						elem.bind('click', $scope.clickingCallback);
					};

					int();
                  //  console.log("nlClick  was called, scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
				}
			};
		}
	]);

nooljs.directive('nlDbLogin', ['httpService', 'nlStorage', 'nlUtil', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			//console.log("nlDbLogin Directive was run");
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
                       // console.log("nlDbLogin Link was called, scope id :$d, parentid:$d, element:$s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
					}
				}
			};
		}
	]);
nooljs.directive('nlServerLogin', ['httpService', 'nlStorage', 'nlUtil', '$compile','nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			//console.log("nlServerLogin Directive was run");
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
                    //    console.log("nlServerLogin Link was called, scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
					}
				}
			};
		}
	]);
nooljs.directive('nlServerLogout', ['httpService', 'nlStorage', 'nlUtil', '$compile', 'nlSocket', function (httpService, nlStorage, nlUtil, $compile, nlSocket) {
			//console.log("nlServerLogout Directive was run");
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
                       // console.log("nlServerLogout Link was called, scope id :%d, parentid:%d, element:%s, attr:%s", $scope.$id, $scope.$parent.$id, elem, attrs);
					}
				}
			};
		}
	]);
