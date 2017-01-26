

Vue.js demo using jquery.ajax, autocomplete and date pickers



Hosted at http://frazerk.net/booking/index.html


plugins	folder with autocomplete-Awesomplete  and  date picker files


I had to add this function to plugins/pikaday.js

    /**
     * return a Date object of the current selection or null if none chosen
     */
    getDateOrNull: function()
    {
        return isDate(this._d) ? new Date(this._d.getTime()) : null;
    },


and to plugins/awesomplete.js: line 67:

    if (c === 13 && me.selected) { // Enter
	    evt.preventDefault();
    	me.select();
    }else if ( c === 9 && me.selected) { //Tab - dont prevent default
	    me.select();
    }

