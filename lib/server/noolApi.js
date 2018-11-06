// noolApi.js 0.1.0
// Copyright (c) 2016  Chandru Krishnar <chandru0507@gmail.com>
// MIT

module.exports = function () {
	var _layoutParser = {};

	init = function (layoutParser) {
		_layoutParser = layoutParser;

	};

	getChildObject = function (theObject, childKey) {

		let result = null;
		if (theObject instanceof Array) {
			for (let i = 0; i < theObject.length; i++) {
				result = getObject(theObject[i], childKey);
			}
		}
		else {
			for (var key in theObject) {
				if (theObject.hasOwnProperty(key)) {
					if (key == childKey)
						return p[key];
					else if (theObject[key] instanceof Array || theObject[key] instanceof Object)
						result = getObject(theObject[key], childKey);
				}
			}

		}

		return result;
	};

	replaceDBString = function (theObject, childKey) {
		
		if (theObject instanceof Array) {
			for (let i = 0; i < theObject.length; i++) {
			  replaceDBString (theObject[i], childKey);
			}
		}
		else {
			for (let key in theObject) {
				if (theObject.hasOwnProperty(key)) {
					if (key == childKey)
					{
						// get the template
						theObject[key] = _layoutParser.parseDBQueryString(theObject["template"], theObject[key]);
					}
					else if(theObject[key] instanceof Array || theObject[key] instanceof Object)
						replaceDBString(theObject[key], childKey);
				}
			}
		}
	};

	return {
		init: init,
		getChildObject: getChildObject,
		replaceDBString: replaceDBString
	}

}