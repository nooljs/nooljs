// noolServer.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports =
{
    /* Store all the stored procedure information here 
    */
    storedProcedures: {},
   
    parseProcedure: function (procedureName)
    {

       /* var regexp = /^[a-zA-Z0-9-_]+$/;
        var check = "checkme";

        if (check.search(regexp) == -1)
        { alert('invalid'); }
        else
        { alert('valid'); }
        */

        var info = {
            name:procedureName,
            server :"",
            schema: "",
            procedure: ""
        } ;

        var arr = procedureName.split(".");

        if(arr.length > 3)
            throw(" Error : " + procedureName + " contains  more than 3 '.' ");

        if(arr.length ==3){
            info.server = arr[0];
            info.schema = arr[1];
            info.procedure = arr[2].replace("[", "").replace("]", "").trim();
        }
        if(arr.length ==2){
            info.schema = arr[0];
            info.procedure = arr[1].replace("[", "").replace("]", "").trim();
        }
        if(arr.length ==1){
            info.procedure = arr[0].replace("[", "").replace("]", "").trim();
        }

        return info;

    },
    
    getProcedureInformation: function (procedureName, config)
    {
        if (this.storedProcedures[procedureName])
            return this.storedProcedures[procedureName];
        
        //parse the  stored procedure
        var info =  this.parseProcedure(procedureName);
        

        var query = "select t1.[name] as [SP_name],t2.[name] as [Parameter_name], ";
        query += "    t3.[name] as [Type],t2.[Length],t2.colorder as [Param_order] ";
        query +=   "              from sysobjects t1 ";
        query +=   "              inner join " + ( (info.server.length > 0 ) ?  info.server + ".."  : ""  ) + "syscolumns t2 on t1.[id]=t2.[id] ";
        query +=   "              inner join " + ( (info.server.length > 0 ) ?  info.server + ".."  : ""  ) + "systypes t3 on t2.xtype=t3.xtype ";
        query += "               where t1.[name]='" + info.procedure + "'";
        query +=   "              order by [Param_order]";

         var sql = require("seriate");
         sql.setDefaultConfig(config);
         var thisConfig = config;
         var params = {};

         var requestObj = {
             query: query,
             params: params
         };

         var result;
         sql.setDefaultConfig(config);

         return sql.execute(requestObj)
             .then(function( results) {

                 //  console.log( "sql query result : %s", JSON.stringify(results)) ;
                 results = results[0][0];
                 info.results = results;
                 this.storedProcedures[procedureName] = info;
                 return info;

             }, function( err) {
                 console.log("sql query error : %s", err);
                 throw (err);
             } );
    }, 

   /* checkParams: function (procedureName, config, params) {


        var _Q = require('q');
        _Q.spawn(function* () {

            var info = yield this.getProcedureInformation(procedureName, config);
            var bError = false;

            if (!info.results)
                throw ("Error: %s  does not have parameter information. ", procedureName);

            for (var name in params) {
                if (params.hasOwnProperty(name)) {

                    var bfound = false;

                    for (var i = 0; i < info.results.types; i++) {

                        if (info.results.types[i].Parameter_name.toLowerCase() === name.toLowerCase()) {
                            // we have found paramters info from list
                            var type = eval("sql." + info.results.types[i].Type);
                            params[name].type = type;
                            bfound = true;
                            break;
                        }
                    }
                    if (bfound == false) {
                        bError = true;
                        console.log("Error: %s  have invalid paramter name %s. ", procedureName, name);
                    }
                }
            }

            if (bError)
                throw ("Error: %s  have invalid paramter names. ", procedureName);
        });

    }, */

   
	execute:function(config,query, data, option)
	{
		console.log("sql server execute - config :%s,query:%s, data:%s", config,query, data);
		var sql = require("seriate");
		sql.setDefaultConfig( config );
		var thisConfig = config;
		var params ={};
		var spos, epos;
		
		//The params are defined after;@param='',
		//parser the query
		
		if(data)
		{		
			for(var i=0; i <data.length;i++)
			{
               // console.log("query:%s, name:%s, value:%s", query, data[i].name, data[i].value);

                if (data[i].value != undefined || data[i].value != null)
                    query = query.replace("{{" + data[i].name + "}}", "'" + data[i].value.toString().replace(/'/g, "''") + "'");
			}
		
		}
		var arr = query.split(";");
		
		for(var i=0; i < arr.length;i++)
		{
			if((arr[i].match(/'/g) || []).length %2 == 1 &&  (i +1 <arr.length))
			{
				arr[i+1] =  arr[i] + ',' +  arr[i+1];
				arr.splice(i,1);
				i--;
			}
		}
		
		var querystring = query;
		if(arr.length > 1 )
		{
			// we have params
		   var paramStr = arr[1];
		   querystring = arr[0]; 	   
		   
		   var paramArrs = paramStr.split(",");		   
		   for( var i = 0; i <paramArrs.length;i++)
		   {
			   var pData = paramArrs[i];
			   if( (pData.match(/'/g) || []).length %2 == 1 &&  (i +1 < paramArrs.length))
			   {
				   paramArrs[i+1] =  paramArrs[i] + ',' +  paramArrs[i+1];
				   paramArrs.splice(i,1);
				   i--;
			   }
			   else {
					var paramName =   pData.substring(0, pData.indexOf("="));
					var paramValue = pData.substring(pData.indexOf("=")+1);
					
					
					//var obj= {};
					
					//parser param value type:value
					if(paramValue.indexOf(":") > 0  && ( paramValue.indexOf("'") < 0 || paramValue.indexOf(":") < paramValue.indexOf("'") ) )
					{
						// we have type
						var type = paramValue.substring(0, paramValue.indexOf(":"));
						var value = paramValue.substring( paramValue.indexOf(":")+1);
						value = ( value.indexOf("'") >=0 && value.lastIndexOf("'") >=0  ) ?  value.substring(value.indexOf("'") +1, value.lastIndexOf("'") ) : value;
						
						//console.log("query string : param name %s, type:%s" , paramName, type);

                        try {
                            paramName = paramName.trim();
                            type = eval("sql." + type.trim());
                            params[paramName] = { type: type, val: value.trim() };
                        }
                        catch (er) {
                            console.log("SqlServer.js Error:%s, param name %s, type:%s", er, paramName, type );
                            throw er;
                        }
					}
					else{
						//default type is varchar
						params[paramName] = { type:sql.VarChar, val:value};
					}
					//params.push(obj);
			   }
		   }
		}
		var bprocedure = false;
		var requestObj = {  
				query: querystring,
				params:params
        };

            //if query-string start with "procedure=" then it is stored procedure
            if (querystring.startsWith("procedure=")) {
                bprocedure = true;

                requestObj = {
                    procedure: querystring.replace("procedure=", ""),
                    params: params
                };

                // build execution string for display
                var querystr = "exec " + requestObj.procedure;
                var index = 0;
                for(var p in params)
                {
                    if (index > 0)
                        querystr += ",";

                    querystr += " " + p + "='" + params[p].val + "'";
                    index++;
                }

                console.log("sql query string : %s", querystr);
                //check params
              //   requestObj.params = yield  this.checkParams(requestObj.procedure, config, requestObj.params);
            }
            else {
                console.log("sql query string : %s", requestObj.query);
            }


            //console.log("query string : %s," , querystring, JSON.stringify(requestObj));	
            //console.log("query string : %s, params:%s" , querystring, JSON.stringify(params));
           

            return sql.execute(requestObj)
                .then(function (results) {

                    //  console.log( "sql query result : %s", JSON.stringify(results)) ;
                    if (bprocedure)
                        results = results[0][0];
                    return results;

                }, function (err) {
                    console.log("sql query error : %s", err);
                    throw (err);
                }); 
			
	}
}
