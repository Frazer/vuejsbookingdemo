

var journeySearchFields={} //journeyFrom, journeyTo DOM fields;
var awesompleteFields={};  // to store Awesomplete 
var returnedSearches={};   // to save on re-searching to confirm selection, this keeps latest search
var chosenLocations={};    // on confirm selection, this keeps location IDs.

var returnDateTooEarlyText       = 'Return must be after leaving', 
	returnDateCheckText          = 'Place the request without a return date?',
	invalidCitySearchText        = 'Not found - please delete some letters to broaden your search',
	locationChoiceNeededText     = 'Please select a location',
	differentLocationsNeededText = 'Please ensure start and end locations are not the same',
	invalidDateText              = 'Please select using the date picker';

function initializeFields(){  //  we load Awesomplete async-ronously, to ensure fast page loading.  After it is ready, we initialize
	journeySearchFields['from'] = document.getElementById("journeyFrom");
	journeySearchFields['to']   = document.getElementById("journeyTo");
	

	var awesompleteParameters = {
		//autoFirst:true,    						//  highlight the first option in the dropdown - conflicts with mouse over
		filter: Awesomplete.FILTER_STARTSWITH,  //  ensure search field matches  begining - ie:  search: 'ien' does not return 'Wien' 
		//data: function (item, input) {	return { label: item.name, value: item.name }; },
	};

	awesompleteFields['from'] = new Awesomplete(journeySearchFields['from'], awesompleteParameters ); // full api at 
	awesompleteFields['to']   = new Awesomplete(journeySearchFields['to'], awesompleteParameters );	  // https://leaverou.github.io/awesomplete/
	journeySearchFields['from'].focus();

	journeySearchFields['from'].addEventListener('focus', function() {
	  awesompleteFields['from'].open();
	});
	journeySearchFields['to'].addEventListener('focus', function() {
	  awesompleteFields['to'].open();
	});
}






///////////////////

//  Vue object

var UVSearch = new Vue({
  el: '#UVSearch',
  data: {
  	fromError: '',
  	toError: '',
  	leaveError: '',
  	returnError: '',
  },
  methods: {

	switchSearch:function(){   ///  swaps the 2 search fields
		var tempVar;

		tempVar = journeySearchFields['from'].value;  journeySearchFields['from'].value = journeySearchFields['to'].value; journeySearchFields['to'].value = tempVar;
		tempVar = awesompleteFields['from'].list;  awesompleteFields['from'].list = awesompleteFields['to'].list; awesompleteFields['to'].list = tempVar;
		//tempVar = awesompleteFields['from'];  awesompleteFields['from'] = awesompleteFields['to']; awesompleteFields['to'] = tempVar;
		tempVar = returnedSearches['from'];  returnedSearches['from'] = returnedSearches['to']; returnedSearches['to'] = tempVar;
		tempVar = chosenLocations['from'];  chosenLocations['from'] = chosenLocations['to']; chosenLocations['to'] = tempVar;
		tempVar = this.fromError; this.fromError = this.toError; this.toError = tempVar;

	},
	update: function (field,event) {
      if (event) {
        //console.log(event.keyCode); //.target.value.length);
        
        if(event.keyCode >= 65 && event.keyCode <= 90 || event.keyCode === 8 || event.keyCode === 46 ){    //"input was a-z  or delete"

	        if (event.target.value.length>1 ){ 
				
	        	//  this was only needed on the Live API
	        	//var formattedString = event.target.value.toLowerCase();					// need to process umlauts and ss
	        	// formattedString = formattedString.replace(/\u00fc/g , "%C3%BC");		// Ü, ü 	\u00dc, \u00fc
	        	// formattedString = formattedString.replace(/\u00e4/g , "%C3%A4");		// Ä, ä		\u00c4, \u00e4
	        	// formattedString = formattedString.replace(/\u00f6/g , "%C3%B6");		// Ö, ö 	\u00d6, \u00f6
	        	// formattedString = formattedString.replace(/\u00df/g , "%C3%9F");		// ß 		\u00df


				//  Next we run the API location search.
				//  We dont need to query on every single keypress,
				//  This only requests if no letters have been pressed for 300ms
				//  the average typer pushes a key every 200 seconds
				clearTimeout(requestBuffer);	
				var requestBuffer = setTimeout(function() { locationSearch( event.target.value ,field); }, 300);  
		        
		    }
		}
      }
	},
	setPlace: function(field, event){   //  called when a city is chosen from the drop down
		//console.log(event.text.label);   ///   chosen place
		
		var chosenCity = returnedSearches[field].filter(  // find chosen city from last search
			(city) => { return city === event.text.label; }
		);  
		//console.log(chosenCity[0]);
		locationConfirmation(chosenCity[0], field);
	
	},
	validatePlace: function(field){   //  called on search submit if a city was not chosen from the drop down
		
		if (!journeySearchFields[field].value){return false;}   //  if no text, field is not valid

		var chosenCity = returnedSearches[field].filter(  // find chosen city from last search
			(city) => { return city.toLowerCase() === journeySearchFields[field].value.toLowerCase(); }
		);  
		if (chosenCity.length){   //  the search text matches a city exactly
			locationConfirmation(chosenCity[0], field);
			return true;
		}else{
			return false;    //  text does not match a city
		}

	
	},
	submitSearch:function(e){

	  if(e.type ==="click" || (e.type ==="keydown" &&  (e.which===13 || e.which===32 ) ) ){
		var noErrorsFound = true;

		// check if valid from and to locations
		// else set error

		// ERROR if chosenLocations are not set  or are the same place
		//			tests is  chosenLocations[field]  is set,  or if the text in the box exactly matches a city
		if (typeof chosenLocations['from'] !=="number" && !this.validatePlace('from')){setError('from', locationChoiceNeededText); noErrorsFound = false;} 
		if (typeof chosenLocations['to'] !=="number" && !this.validatePlace('to') ){setError('to', locationChoiceNeededText); noErrorsFound = false;} 
		if (chosenLocations['from']  && chosenLocations['from'] ===  chosenLocations['to'] ){
			setError('to', differentLocationsNeededText);
			setError('from', differentLocationsNeededText); noErrorsFound = false;}


		// check if departure date is valid
		// else set error
		if (!validateDate('leave', 'datepicker')){noErrorsFound = false;} 


		// if there is a return date, check it is valid
		// else set error
		if (this.returnError === returnDateTooEarlyText && noErrorsFound && !confirm(returnDateCheckText)){noErrorsFound = false;} 
		if (!validateDate('return', 'datepickerReturn')){noErrorsFound = false;} 


		// if all is ok, submit the search form
		if( noErrorsFound){

			button = document.getElementById("submitButton");
			button.innerHTML = "Searching...";
			var leavingDate = picker.getMoment().format('ddd MMM Do YYYY');
			var returningDate = picker2.getDateOrNull() ? moment(picker2.getDateOrNull()).format('ddd MMM Do YYYY')  : "one way";
			var completionMessage = "search Query: from:" + chosenLocations['from'] +", to:"+ chosenLocations['to'] 
				+ ", leave: "+leavingDate + ", return: "+returningDate;

			console.log( completionMessage);
			
			alert(completionMessage);
			
			alert("I hope you enjoyed this demo");

			//  My easter egg for you
			var fin = "Nbef!cz!Gsb{fs!Ljslnbo!;*!Qmfbtf!fnbjm!nf!bu!gsb{fsAgsb{fsl/ofu!jg!zpv(e!mjlf!up!xpsl!xjui!nf", fin2="";for(var i=0;i<fin.length;i++){
	    	    fin2 = fin2 + String.fromCharCode(fin.charCodeAt(i)-1);}console.log(fin2);
	      }
	    }
	},
  }

});


function debugCallFromConsole(){
	console.log(awesompleteFields);console.log(returnedSearches);console.log(chosenLocations);
}

function setError(field, message){
	var errorField = field +"Error";
	UVSearch[errorField] = message;

}
function clearError(field){

	if(UVSearch['toError']===differentLocationsNeededText){UVSearch['toError']="";UVSearch['fromError']="";}
	
	var errorField = field +"Error";
	UVSearch[errorField] = "";
}





////////////////////////

///  API request


function locationSearch(searchString, searchField){	
	
  	jQuery.getJSON(
		"http://gd.geobytes.com/AutoCompleteCity?callback=?&q="+searchString,
		function (data) {
			returnedSearches[searchField] = data;
		    //console.log(returnedSearches[searchField]);
		    if (returnedSearches[searchField][0]!==""){
			    awesompleteFields[searchField].list = returnedSearches[searchField]; 
			    clearError(searchField);
		    }else{
			    setError(searchField, invalidCitySearchText); 
		    }
		}
	 );

	chosenLocations[searchField] = false;   //  negate any chosen city if they are searching more


}

function locationConfirmation(searchString,searchField){	
	
	var cityID;
  	jQuery.getJSON(
		"http://gd.geobytes.com/GetCityDetails?callback=?&fqcn="+searchString,
		function (data) {
			//console.log(data);
			var previousCity = chosenLocations[searchField];
			chosenLocations[searchField] = data.geobytescityid;
			if (previousCity !== chosenLocations[searchField]) {clearError(searchField);}
		}
	 );
}


////////////////////

//  Dates

//  datepicker from  https://github.com/dbushell/Pikaday
var picker, picker2;  
var dateFormatString = 'ddd MMM D YYYY';
function initializeDates(){
    picker = new Pikaday({ field: document.getElementById('datepicker') , position: 'bottom left', 
    							format: dateFormatString,
    							minDate: new Date(), 
    							onSelect: dateChosen.bind(this,'leave'),
    							onClose: validateDate.bind(this,'leave', 'datepicker') });
    picker2 = new Pikaday({ field: document.getElementById('datepickerReturn') , position: 'bottom left', 
    							format: dateFormatString,
    							minDate: new Date(), 
    							onSelect: dateChosen.bind(this,'return'),
    							onClose: validateDate.bind(this,'return', 'datepickerReturn')});
}

function dateChosen(field){     //  called when a date is chosen from the calendar
	clearError(field);
	if (field === "leave"){setReturnAfter();}   //  check if leave date is before return date
}

function setReturnAfter(){   //  this makes sure the return date is not before the leave date
	var leaveDate = picker.getDate();
	var returnDate = picker2.getDateOrNull();

	if (returnDate && leaveDate>returnDate){picker2.setDate(''); setError('return',returnDateTooEarlyText)};
	picker2.setMinDate(leaveDate);
}

function validateDate(field, pickerID){

	// if the return field is blank, that is ok
	if (field==='return' && !document.getElementById('datepickerReturn').value ){picker2.setDate(null); return true; }

	if(!moment(document.getElementById(pickerID).value, dateFormatString).isValid()){
		setError(field, invalidDateText);
		return false;
	}else{
		return true;
	}

}
