// nlUsers.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT

module.exports = function(sessionTimeoutMinutes){
	var userSessions = [];
	this.sessionTimeoutMinutes = sessionTimeoutMinutes;
	
	generateGuid = function()
	{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
	};
	createSession = function(user)
	{
		var obj = {user:user, createdTime:new Date(), lastUpdated:new Date(), key:generateGuid()};
	    userSessions.push(obj);
		return obj.key;
	};
	removeUser = function(key)
	{
		if(!key)
			return  ;
	
	 for(var i in userSessions)
	 {
	   if(userSessions[i].key == key)
	   {		 
		   userSessions.splice(i,1);
		   return;
		}
	 }
	};
	
	getUser = function(key)
	{
		if(!key)
			return  {error:"Invalid Key"};
		
	 var result = {error:"Not found"};
	
	 for(var i in userSessions)
	 {
	   if(userSessions[i].key == key)
	   {
		// we have valid key
		//check the session timeout 
		if(sessionTimeoutMinutes > 0 )
		{
		  var currTime = new Date();
		  var diff = (currTime.getDate()- userSessions[i].lastUpdated.getDate())/(1000*60); // convert to minutes
		  
		  if(diff > sessionTimeoutMinutes)
		  {
		    // session expired
			result.error = "Expired".
			// remove user from list
			userSessions.splice(i,1);
			return result;
		  }
		  else{
		    // we have valid session
			result.user = userSessions[i].user;
			result.error = undefined;
			userSessions[i].lastUpdated = new Date();
			return result;
		  }
		}
	   }
	 }
	 return result;
	};
	return {
		createSession:createSession,
		getUser:getUser,
		removeUser:removeUser
	}

}