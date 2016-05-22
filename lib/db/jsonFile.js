// noolServer.js 0.0.1
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports =
{
	execute:function(config, query)
	{	
		//console.log("json file config:%s, query:$s", config, query );	
		var fs = require("fs"); 
		var q = require("q");
		var deferred = 	q.defer();
		
		 fs.readFile( query, function (err, data)
		{
			if(err)
			{				
				console.log("file reading error %s", err );
				deferred.reject(err) ;
			}
			else
				deferred.resolve(JSON.parse(data));
		});
		return deferred.promise;
	}
}
