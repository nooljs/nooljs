# nooljs  ( Beta)


## Introduction

Full stack JavaScript framework  built using  the famous open sources libraries.. Nodejs, Angularjs, expressjs, npm, socket-io.  
* Easy to build complex data driven JavaScript applications  with minimum coding.
* Support multiple  data connections suck as ms-sql, MySQL, PostgreSQL, and Mondodb.
* Real time framework build top of Express-js and socket-io 
* The client side is powered by  the Angularjs. The layout can be built using the Angularjs tags and elements.
* Modularized layout to simplify the comlex web pages.
* Can be mixed both Express-js and socket-io

## Quick Start
  1. Install nooljs with npm

   `$ npm install nooljs -g`

  2. Create new nooljs project by running command
   `$ nooljs`
    It will ask project name. enter the project name( example testprj). It will create new folder for the project and sample application.
  3. Go the new  project folder

   `$ cd testproj`

  4. Update the npm dependency packages

   `npm  update`

  5. Run the application

   `node app.js`
   
## Tutorials & Blogs
 Tutorials & Blogs are available  at  https://nooljs.blogspot.ca/
 
## Source Code
 Source codes can be downloaded from https://github.com/nooljs/nooljs


## API Document
 For the full document  please visit http://nooljs.github.io/nooljs/
 

### Folder Structure
    * config -- Configuration folder
    * layout - Contains all the layout files
    * public -- Public files ( js, image)
    * server -- All the server side JavaScript files 
    * servermethod -- Put all the server methods here 

### Layout
The Layout is heart of the nooljs project.  Each page/module of the application can be defined as layout.
    It should be keep inside the layout folder.

```
 <nl-template id="store-edit-template" nl-permission="store-edit" nl-parent="main-content" >
 </nl-template>
<nl-server-script>
</nl-server-script>
<nl-client-script>

```

 The layout file contains three parts : 
   * nl-template - Html template for the module
   * nl-server-script -  Sever side javascript code for this module
   * nl-client-script - Client side javascript code for this module


### nl-template
nl-template contains all the html for the given module. It can be easily injected into html page or layout file.

The sample layout is  shown below:

  
```
<nl-template id="store-edit-template" nl-permission="store-edit" nl-parent="main-content" >
<button class="button button-block button-positive"  id="item-edit-back"
	  nl-click-redirect="{'url':'store-template'}" >    Back
</button>
<h1 >{{store.StoreName}}  Edit</h1>
 <ion-content class="has-header  has-footer">
<ion-list nl-server-data="getStore"  nl-post-client="assignStoreName">	
 <ion-item>
   <label class="item-input">
    <span class="input-label">Store name</span>
    <input type="text" ng-model="store.StoreName" />
  </label>
   <ion-item>
   <label class="item-input  item-select">
    <span class="input-label">Country</span><div nl-db-data="exec  dbo.usp_GetCountries"   nl-db-model="countries"  nl-cahche="sessionStorage">
      <select ng-model="store.Country"   >
						 <option  ng-repeat="country in countries" value="{{country.CountryCode}}"  ng-selected="country.CountryCode==store.Country">{{country.CountryName}}</option>
       </select>
	   </div>
  </label>
   </ion-item> 
</ion-list>
 </ion-content>
</nl-template>
<nl-server-script>
{
  getStore:
  {
	model:"store",
    db:
	{
		query:"exec Admin_GetStoreInfo {{StoreId}}",
		resultType:"single"
	}
  }
}
</nl-server-script>
<nl-client-script>
{
  assignStoreName:function ($scope)
  {
	console.log(" enter assignDefaultStore  function ");
	$scope.$root.storeName = $scope.store.StoreName;
  }
  }
</nl-client-script>


```




