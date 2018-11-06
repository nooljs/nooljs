// LauoutPaser.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports = function()
{
 var queries=[];
 var files=[];
 var monitorTimeout=30000;
 var serverFunctions = [];
 var gCount = 0;
 
 /*readFile= function(Q, fs, fileName){
	 //console.log("reading file " + fileName);
		var deferred = Q.defer();
		fs.readFile(fileName, function (err, data){
			if(!err)
				deferred.resolve(data);
			 else 
				 deferred.reject(err);
				
		});
		return deferred.promise;		
	};
    */
	
    String.prototype.escapeSpecialChars = function () {
        return this.replace(/\n/g, "")
            .replace(/\r/g, "");
 }
    	
 clearQueries= function(fileName)
 {
	for(i=0; i < queries.length; i++)
	{
		if(queries[i].template.trim() == fileName.trim())
		{
			queries.splice(i, 1);
		}
	}
    }

 clearServerFunction = function (fileName) {
     for (i = 0; i < serverFunctions.length; i++) {
         if (serverFunctions[i].template.trim() == fileName.trim()) {
             serverFunctions.splice(i, 1);
         }
     }
 }

 addFile= function(file)
 {
	// console.log("layoutParser addFile : %s .", file.fileName);
	 var bFound = false;
	for(i=0; i < files.length; i++)
	{
		if(files[i].fileName.trim() == file.fileName.trim())
		{
			files[i] = file;
			bFound = true;
			break;
		}
	}
    if(bFound ==false)
      files.push(file);	
 }
 monitorFiles=function()
 {
	// console.log(" monitorFiles start....");
	 
	for(var ii=0; ii < files.length; ii++)
	{
 
		var stat =  fs.statSync(files[ii].path);
		if(stat.mtime > files[ii].stat.mtime)
		{
			console.log(" file  : %s  has been modified. count:%s", files[ii].fileName, ii);
			paserLayout( fs, files[ii].fileName, files[ii].directoryName, null)
			.then(function(data)
			{
			//	console.log("LayoutParser--monitorFiles  file  %s  paserLayout successfully completed.", files[i].fileName);
			})
			.catch(function(err){
			console.log("LayoutParser--monitorFiles  file  %s  paserLayout  err %s", files[i].fileName, err);
			});
		}
	}
 }
 
 init = function (fs1, iMonitorTimeout)
 {
     if ( iMonitorTimeout > 100) // should BeforeUnloadEvent more than 100ms
         monitorTimeout = iMonitorTimeout;

	 fs = fs1;
	 setInterval(monitorFiles, monitorTimeout);
 }
 objToNameValue=function(obj )
 { 
    function parserObj(obj, parentKey, data)
	{	
		 if(! obj)
			 return null;
		 if(!data)
		   data = [];
	   
		 for(var key in  obj)
		 {
			 if(key && key.length > 0 )
			 {
				 
				var newkey = (parentKey && parentKey.length > 0 ) ? parentKey + "." + key : key;
				
				 if(typeof obj[key] ==="object")
				 {
					bfound = true;
					//console.log( "%s %s %s",  JSON.stringify(obj[key]),newkey, data);
					data = parserObj(obj[key],newkey, data);
				 }
				 else{
					data.push( {name:newkey, value:obj[key]}); 
				 }
			  }
		 }
		 return data;
	 }
	 return  parserObj(obj, "", null);
 }
 nameValueToObj=function(data)
 {
	 if(! data)
		 return ;
	 
	 var obj = {};
	 for(var i=0; i < data.length; i++)
	 {
		this.setValue(obj,  data[i].name, data[i].value);
	 }
	 return obj;
 }
 getValue=function($scope, varName){
		   
		   //parser the varName
		   var vars = varName.split(".");
		   var value = null;
		   for(var i=0; i < vars.length; i++)
		   {
			   if(i==0)
			   {
				   var temp = $scope;
				   while(temp[vars[i]] == undefined && temp.parent)
					   temp == temp.$parent;
				   value = temp[vars[i]];
			   }
			   else{
				   if(value)
					   value = value[vars[i]];
			   }
		   }
		   return value;
	   }
  setValue=function($scope, varName, value){
		   
		   //parser the varName
		   var vars = varName.split(".");
		   var obj = $scope;
		   for(var i=0; i < vars.length; i++)
		   {
			   if(i < vars.length-1)
			   {
				   if(!obj[vars[i]])
					  obj[vars[i]] = {};
				  
				   obj = obj[vars[i]];
			   }
			   else{
				 obj[vars[i]] = value;
			   }
		   }
		   return value;
	   }
 getServerFunction=function(tempName, funName)
{
	var bFound = false;
	var query = null;
	for(i=0; i < serverFunctions.length; i++){
		
	//		 console.log("i%s - qname:%s currentQName:%s", i, serverFunctions[i].name , funName);
		if(serverFunctions[i].name == funName &&serverFunctions[i].template ==tempName )
		{
			serverFun = serverFunctions[i];
			nFound = true;
			break;
		}
	}
	return serverFun;
}

  parserLayoutDirectory = function(fs, directoryName)
{
	fs.readdir(directoryName, function(err, filenames)
	{
		if(err)
			return;
		filenames.forEach(function(fileName){paserLayout( fs, fileName, directoryName)});
	});
};
 getMinIndex = function(data, listString, pos)
 {
	 var npos  =-1;
	 for(var i=0; i< listString.length;i++)
	 {
		 var nnpos = data.indexOf( listString[i] ,pos);
		 
		 if( (nnpos < npos || npos < 0) && ( nnpos >= 0 ))
			 npos = nnpos;
	 }
	 
 // console.log("getMinIndex  :%s,", npos);	
	 return npos; 
 };
 
 parserServerFun = function (tempName, obj) {

     // remove existing server function for this template
     clearServerFunction(tempName);
	 
	 for(var key in obj){
		 var fun = obj[key];
		 
		 //get all the variables of scope object and script\
		 // first get the scrip variables {{}}
		 var ss = JSON.stringify(fun, function(a,b)
		 {
			return  (typeof b === "function")  ?  b.toString() : b;
		 });
		 var vspos = 0;
		 var vepos =0;	
	     var params = [];	
		
		var tempP = ss.match(/{{[.-\w]+}}/g);
		
		for(var index in tempP)
		{
			var p1 = tempP[index].substring(2, tempP[index].length - 2);
			if(params.indexOf(p1) < 0 )
				params.push(p1);
			
		}
		tempP = ss.match(/\$scope\.[.-\w]+/g);
		
		if(tempP)
		{
			for(var index in tempP)
			{
				var p1 = tempP[index].substring(7);
				if(params.indexOf(p1) < 0 )
					params.push(p1);			
			}			
		}

		// remove sub object name if parent object name  in the param
		for(var i=0; i < params.length; i++)
		{
			var paramName = params[i] + ".";
			
			
			for(var j=0;  j < params.length;j++ )
			{
				if( params[j].indexOf(paramName)==0)
				{
					// we found sub  paramter 
					//remove it since we have parent param
                    params.splice(j, 1);
                    j--;
					if(j < i)
						i = i-1;
				}
			}
		}		

        var model = ( fun.model) ? fun.model : key;
        var funObj = { template: tempName, name: key, fun: fun, params: params, model: model };
        
		serverFunctions.push(funObj);		
		
	 }
 };
 
 paserLayout = function (fs, fileName, directoryName) {
	 // console.log("readFile :%s" , (directoryName + "/" + fileName + ".html" ) );

	 //clear existing queries for this file
	 clearQueries(fileName);

	 var path = directoryName + "/" + fileName + ".html";

	 var fileStat = fs.statSync(path);
	 //return fs.readFile(path)
	 return readFile(path)
		 // return readFile(Q, fs,path)
		 .then(function (data) {
			 var count = 0;
			 var pos = 0;
			 var epos = 0;
			 var spos = 0;
			 var loop = 0;

			 data = data.toString();

			 // remove  nl-server-script from layout template and put into into memory
			 var spos = data.indexOf("<nl-server-script");
			 var epos = data.indexOf("</nl-server-script");

			 if (spos >= 0 && epos > 0) {
				 //get closing > tag of <nl-server-script
				 var sspos = data.indexOf(">", spos);

				 //get closing > tag of </nl-server-script
				 var eepos = data.indexOf(">", epos);

				 var scriptData = data.substring(sspos + 1, epos);

				 scriptData = scriptData.escapeSpecialChars();

				 //create script data object
				 try {
					 var obj = eval("x=" + scriptData);
				 }
				 catch (ee) {
					 console.log("server script  error :" + ee);
					 console.log("server script : x=" + scriptData);
					 throw ee;
				 }

				 // serverFunctions.push({name:fileName,fun:obj});
				 parserServerFun(fileName, obj);

				 // remove nl-server-script from data
				 var data1 = data.substring(0, spos);
				 if (data.length > eepos + 1)
					 data1 = data1 + data.substring(eepos + 1);
				 data = data1;


			 }

			 count = 0;
			 pos = 0;
			 epos = 0;
			 spos = 0;
			 loop = 0;

			 var permission = "";

			 while ((pos = getMinIndex(data, ["nl-db-click", "nl-db-query", "nl-db-login", "nl-db-data", "nl-server-click", "nl-server-data", "nl-permission", "nl-server-login", "nl-server-logout"], epos)) >= 0) {
				 loop = loop + 1;
				 //get the position of starting "
				 spos = data.indexOf("\"", pos);
				 if (spos < 0)
					 break; //  no " char found

				 var chars = data.toString().substring(pos, spos).replace(/ /g, '');

				 if (chars != "nl-db-query=" && chars != "nl-db-login=" && chars != "nl-db-click=" && chars != "nl-db-data=" && chars != "nl-server-data="
					 && chars != "nl-server-click=" && chars != "nl-permission=" && chars != "nl-server-login=" && chars != "nl-server-logout=") {
					 break; // invalid starting positions .. it should be  begun with nl-db-query= or nl-db-login=
				 }
				 var commandType = chars.substring(0, chars.length - 1);
				 epos = data.indexOf("\"", spos + 1);

				 var queryString = data.substring(spos + 1, epos);

				 if (commandType == "nl-permission") {
					 // we setup permission only once  for the template
					 if (!permission)
						 permission = queryString;
				 }
				 else if (commandType == "nl-server-data" || commandType == "nl-server-click" || commandType == "nl-server-login" || commandType == "nl-server-logout") {
					 // server function
					 //get server information from server functions
					 var serverFun = this.getServerFunction(fileName, queryString);

					 //if the comandt type "nl-server-login"  then model should be userAgent
					 if (commandType == "nl-server-login")
						 serverFun.model = "user";

					 var query = { template: fileName, name: serverFun.name, queryString: serverFun.name, params: serverFun.params, model: serverFun.model };
				 }
				 else {
					 // db query function

					 var query = { template: fileName, name: fileName + count, queryString: queryString, params: [], model: "" };
					 count++;
					 // now parser query
					 var vpos = 0;
					 var vepos = 0;
					 var vspos = 0;

					 while ((vspos = queryString.indexOf("{{", vepos)) >= 0) {
						 vepos = queryString.indexOf("}}", vspos);
						 var param = queryString.substring(vspos + 2, vepos);
						 query.params.push(param);
					 }
					 // remove sub object name if parent object name  in the param
					 for (var i = 0; i < query.params.length; i++) {
						 var paramName = query.params[i] + ".";

						 for (var j = 0; j < query.params.length; j++) {
							 if (query.params[j].indexOf(paramName) == 0) {
								 // we found sub  paramter 
								 //remove it since we have parent param
								 query.params.splice(j, 1);
								 j--;
								 if (j < i)
									 i = i - 1;
							 }
						 }
					 }
					 queries.push(query);
				 }
				 if (commandType !== "nl-permission") {
					 //replace query string with name
					 var queryName = { 't': query.template, 'm': query.name, 'p': query.params, 'md': query.model };
					 var qName = JSON.stringify(queryName);


					 data = data.substring(0, spos) + "'" + qName + "' " + data.substring(epos + 1);

					 //set new epos 
					 epos = epos + qName.length - queryString.length;
				 }
			 }
			 var file = { fileName: fileName.trim(), data: data, directoryName: directoryName, path: path, stat: fileStat, permission: permission };
			 //files.push(file);
			 addFile(file);

			 /*
			 if(callback)
				callback(data);
			*/
			 return file;
		 })
		 .catch(function (err) {
			 console.log("readFile err" + err);
			 throw err;
		 });
 };

 parseDBQueryString = function(name, queryString)
 {
	 if (!name && name == "")
		 name = "_Query_";

	 var query = { template: name, name: name + gCount, queryString: queryString, params: [], model: "" };
	 gCount++;
	 // now parser query
	 var vpos = 0;
	 var vepos = 0;
	 var vspos = 0;

	 while ((vspos = queryString.indexOf("{{", vepos)) >= 0) {
		 vepos = queryString.indexOf("}}", vspos);
		 var param = queryString.substring(vspos + 2, vepos);
		 query.params.push(param);
	 }
	 // remove sub object name if parent object name  in the param
	 for (var i = 0; i < query.params.length; i++) {
		 var paramName = query.params[i] + ".";

		 for (var j = 0; j < query.params.length; j++) {
			 if (query.params[j].indexOf(paramName) == 0) {
				 // we found sub  paramter 
				 //remove it since we have parent param
				 query.params.splice(j, 1);
				 j--;
				 if (j < i)
					 i = i - 1;
			 }
		 }
	 }
	 queries.push(query);

	 var queryName = { 't': query.template, 'm': query.name, 'p': query.params, 'md': query.model };
	 var qName = JSON.stringify(queryName);

	 data = qName ;
	 return data;

 }


 return{

getFileData:function (fs, fileName, directoryName)
{
	var promise ;
	var bFound = false;
	for(i=0; i < files.length; i++){
	
		if(files[i].fileName.trim() == fileName.trim())
		{			
		    promise = Promise.resolve(files[i]);
			bFound = true;
			break;
		}
	}
	
	if(bFound == false)
	{
		 promise = paserLayout(  fs, fileName, directoryName);
	}
	if (!promise)
		console.log("getFileData -- promise is empty");
	return promise;
},
getQuery:function(queryName)
{
	var bFound = false;
	var query = null;
	for(i=0; i < queries.length; i++){
		
		//	 console.log("i%s - qname:%s currentQName:%s", i, queries[i].name , queryName);
		if(queries[i].name == queryName)
		{
			query = queries[i];
			nFound = true;
			break;
		}
	}
	return query;
},
  getServerFunction,
  objToNameValue,
  nameValueToObj,
  setValue,
  getValue,
  init,
  parseDBQueryString
 }
}