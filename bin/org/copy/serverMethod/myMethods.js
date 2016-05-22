{
	myServerMethod1:
	{
		"permission":"myServerMethod1", 
		"method":function( name, value){
			return "hello - from method 1 " + name + " " + value;
		}
	},
	myServerMethod2:
	{
		"permission":"myServerMethod2",
		"method":function( name){
			return "hello -- from method 2 " + name ;
		}
	}
}