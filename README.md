# nooljs

## Coming soon........
Full stack JavaScript framework  built using  famous open sources libraries.. Nodejs, Anjularjs, expressjs, npm, socket-io.  
Support multiple  data connections ms-sql, mysql, json file, ....

## Introduction

## Quick Start

## API Document

### Folder Structure
    config -- Configuration folder
    layout - Contains all the layout files
    public -- Public files ( js, image)
    server -- All the server side JavaScript files 
    servermethod -- Put all the server methods here 

### Template

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


 

### Configuration

### Database Connection

### MS SQL
### MySql
### MongoDB

### WebSocket/ Express
### Permission


