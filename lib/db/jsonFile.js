// noolServer.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT
module.exports =
{
	execute: function (config, query, data, option)
	{
	//	const low = require('lowdb');
		//const FileSync = require('lowdb/adapters/FileSync'); // require('lowdb/adapters/FileAsync');
		var q = require("q");
		var deferred = q.defer();
		var fun = "read"; // default function read
		var filename = "";
		var condition = "";
		var insertUpdate = "";
		const uuidv1 = require('uuid/v1');

		//query = [filename];[functionname];[query];[insert/update]

		if ((typeof query) == 'string') {

			var arr = query.split(";");

			for (var i = 0; i < arr.length; i++) {
				if ((arr[i].match(/'/g) || []).length % 2 == 1 && (i + 1 < arr.length)) {
					arr[i + 1] = arr[i] + ',' + arr[i + 1];
					arr.splice(i, 1);
					i--;
				}
			}
			filename = arr[0];

			if (arr.length > 1) {
				//read the function name
				fun = arr[1].trim();

				if (arr.length > 2) {
					//read the params
					var condition = arr[2].trim();
					
					if (arr.length > 3) {
						//read the params
						var insertUpdate = arr[3].trim();
					}

				}
			}
		}
		if ((typeof query) == 'object') {
			filename = query.filename;
			fun = query.fun;
			condition = query.condition;
			insertUpdate = query.insertUpdate;

			if (data && condition) {
				for (var i = 0; i < data.length; i++) {
					// console.log("query:%s, name:%s, value:%s", query, data[i].name, data[i].value);

					if (data[i].value != undefined || data[i].value != null) {
						let search = "{{" + data[i].name + "}}";
						condition = condition.replace(new RegExp(search, 'g'), data[i].value.toString());
					}
				}
			}

			if (data && insertUpdate) {
				for (var j = 0; j < data.length; j++) {
					// console.log("query:%s, name:%s, value:%s", query, data[i].name, data[i].value);

					if (data[j].value != undefined || data[j].value != null) {
						let search = "{{" + data[j].name + "}}";
						insertUpdate = insertUpdate.replace(new RegExp(search, 'g'), data[j].value.toString());
					}
				}

				//replace the new guid
				let search = "{{\\$\\$newGuid}}";
				insertUpdate = insertUpdate.replace(new RegExp(search, 'g'), uuidv1());
			}
		}

		if (data && filename) {
			for (var j = 0; j < data.length; j++) {
				// console.log("query:%s, name:%s, value:%s", query, data[i].name, data[i].value);

				if (data[j].value != undefined || data[j].value != null) {
					let search = "{{" + data[j].name + "}}";
					filename = filename.replace(new RegExp(search, 'g'), data[j].value.toString());
				}
			}
		}

			//console.log("json file config:%s, query:$s", config, query );	
		var fs = require("fs");
		var q = require("q");
		var deferred = q.defer();

		console.log("file reading -%s", filename);

		fs.readFile(filename, "utf8", function (err, res) {
			if (err) {
				console.log("file reading error %s: %s", filename, err);
				deferred.reject(err);
			}
			else {
				let result = null;
				try {
					result = JSON.parse(res);
				}
				catch (ee) {
					console.log("Jason parsing error -%s %s", filename, ee);
					deferred.reject(ee);
				}

				switch (fun) {
					case "read":
						deferred.resolve(result);
						break;
					case "add":
						{
							//insert the record at end							
							result.push(JSON.parse(insertUpdate));
							//save the result
							fs.writeFile(filename, JSON.stringify(result), function (err, res2) {
								if (err)
									deferred.reject(err);
								else
									deferred.resolve({status:1});
							});
							break;
						}
					default:
						deferred.resolve(result);
						break;
				}
			}
		});
		return deferred.promise;

		/*const adapter = new FileSync(arr[0]);
		var db = low(adapter);
		//var deferred = q.defer();

		if (arr.length == 1) {
			//No query ..read all the data
			//var res = db.read();
			var res = db.get('').value();
			return res;
			//	.then(function (value) { return value; })w;
		}
		else if (arr.length > 1) {
			//first param is file name
			//2nd param is query string for read write or update

		}
	//	return deferred.promise;
		*/
	}

	//execute: function (config, query) {
	//	//console.log("json file config:%s, query:$s", config, query );	
	//	var fs = require("fs");
	//	var q = require("q");
	//	var deferred = q.defer();

	//	fs.readFile(query, function (err, data) {
	//		if (err) {
	//			console.log("file reading error %s", err);
	//			deferred.reject(err);
	//		}
	//		else
	//			deferred.resolve(JSON.parse(data));
	//	});
	//	return deferred.promise;
	//}
}
