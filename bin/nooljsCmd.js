#! /usr/bin/env node
var fs = require('fs');
var fse = require('fs-extra');
var replace = require('replace');
var shelljs = require('shelljs');
var stdin = process.stdin, stdout = process.stdout;
 
 stdin.resume();
 stdout.write('Enter the projectName:');
  stdin.once('data', function(data) {
   data = data.toString().trim();
   console.log('Your project Name :' + data);   
   stdin.destroy();
   createProject(data);
  });
  
  
  
  function createProject(projectName)
  {
     try{
		 projectName = projectName.replace(/ /g,'');
		 fs.mkdirSync(projectName); 
		 console.log('Project ' + projectName + ' is created.' );
	 }
	 catch(ee)
	 {
		 console.log('Error : The project directory with name ' + projectName + ' is alreay exist.' );
		 return;
	 }
	 
	  // create project folders
	  try{
		  fse.copySync(__dirname + '/org/copy',  projectName);
		  //fs.renameSync( projectName + '/init_node.js', projectName + '/' + projectName' +.js' );
		  
		  // replace the text with  project name in the package.json
		  replace({
		  regex: "<%projectName%>",
		  replacement: projectName,
		  paths: [ projectName + '/package.json'],
		  recursive: false,
		  silent: true,
		});
		
		 //go to the  project folders
		// shelljs.cd(projectName);
		 
		 // download all the nodejs dependcy modules
		// shelljs.exec('npm install');

		  console.log('Project ' + projectName + ' is Succefully created.');
	  }
	   catch(ee)
	 {
		 console.log('Error : error on creating the project folders. ' + ee.toString());
		 return;
	 }
  }
  