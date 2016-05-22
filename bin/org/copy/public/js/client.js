var app = angular.module('myApp', ['nooljs', 'ionic']);

app.run(['nlUtil', function (nlUtil) {
    nlUtil.useWebsocket(true);
}]);

 
// Test controller for the server side method
app.controller("myController",['nlServerMethods', '$scope', function(nlServerMethods, $scope)
{
	$scope.serverResult= "my result";
	$scope.onclick= function(){
		nlServerMethods.exec( "myMethods.myServerMethod1", "First", "parameter")
		.then(function(data){
			$scope.serverResult = "data :" + data.data + " , error :"  + data.error;
		})
		.catch(function (err)
		{
			$scope.serverResult = " error :" + err;
		});
	};
}]);
