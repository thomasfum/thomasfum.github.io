/*!
 * mySlide.js
 * http://lab.hakim.se/mySlide-js
 * MIT licensed
 *
 * Copyright (C) 2016 Hakim El Hattab, http://hakim.se
 */
 
 
 
 
(function( root, factory ) {
	if( typeof define === 'function' && define.amd ) {
		// AMD. Register as an anonymous module.
		define( function() {
			root.mySlide = factory();
			return root.mySlide;
		} );
	} else if( typeof exports === 'object' ) {
		// Node. Does not work with strict CommonJS.
		module.exports = factory();
	} else {
		// Browser globals.
		root.mySlide = factory();
	}
}( this, function() {

	'use strict';

	var mySlide;

	// The mySlide.js version
	var VERSION = '3.3.0';

	var SLIDES_SELECTOR = '.slides section',
		HORIZONTAL_SLIDES_SELECTOR = '.slides>section',
		HOME_SLIDE_SELECTOR = '.slides>section:first-of-type',
		UA = navigator.userAgent,

		// Configuration defaults, can be overridden at initialization time
		config = {

		
			// Transition style
			transition: 'convex', // none/fade/slide/convex/concave/zoom


			// Number of slides away from the current that are visible
			viewDistance: 5,

			// Script dependencies to load
			dependencies: []

		},


		// The horizontal and vertical index of the currently active slide
		indexh,
	
		// The previous and current slide HTML elements
		previousSlide,
		currentSlide,

		// Slides may hold a data-state attribute which we pick up and apply
		// as a class to the body. This list contains the combined state of
		// all current slides.
		state = [],

		

		// Cached references to DOM elements
		dom = {},

		// Features supported by the browser, see #checkCapabilities()
		features = {}
		

	/**
	 * Starts up the presentation if the client is capable.
	 */
	function initialize( options ) {

		checkCapabilities();

		if( !features.transforms2d && !features.transforms3d ) {
			document.body.setAttribute( 'class', 'no-transforms' );

			// Since JS won't be running any further, we load all lazy
			// loading elements upfront
			var images = toArray( document.getElementsByTagName( 'img' ) ),
				iframes = toArray( document.getElementsByTagName( 'iframe' ) );

			var lazyLoadable = images.concat( iframes );

			for( var i = 0, len = lazyLoadable.length; i < len; i++ ) {
				var element = lazyLoadable[i];
				if( element.getAttribute( 'data-src' ) ) {
					element.setAttribute( 'src', element.getAttribute( 'data-src' ) );
					element.removeAttribute( 'data-src' );
				}
			}

			// If the browser doesn't support core features we won't be
			// using JavaScript to control the presentation
			return;
		}

		// Cache references to key DOM elements
		dom.wrapper = document.querySelector( '.mySlide' );
		dom.slides = document.querySelector( '.mySlide .slides' );

		// Force a layout when the whole page, incl fonts, has loaded
		window.addEventListener( 'load', layout, false );

		// Copy options over to our config object
		extend( config, options );

		// Loads the dependencies and continues to #start() once done
		load();

	}

	/**
	 * Inspect the client to see what it's capable of, this
	 * should only happens once per runtime.
	 */
	function checkCapabilities() {

		var testElement = document.createElement( 'div' );

		features.transforms3d = 'WebkitPerspective' in testElement.style ||
								'MozPerspective' in testElement.style ||
								'msPerspective' in testElement.style ||
								'OPerspective' in testElement.style ||
								'perspective' in testElement.style;

		features.transforms2d = 'WebkitTransform' in testElement.style ||
								'MozTransform' in testElement.style ||
								'msTransform' in testElement.style ||
								'OTransform' in testElement.style ||
								'transform' in testElement.style;

	}

    /**
     * Loads the dependencies of mySlide.js. Dependencies are
     * defined via the configuration option 'dependencies'
     * and will be loaded prior to starting/binding mySlide.js.
     * Some dependencies may have an 'async' flag, if so they
     * will load after mySlide.js has been started up.
     */
	function load() {

		var scripts = [],
			scriptsAsync = [],
			scriptsToPreload = 0;

		// Called once synchronous scripts finish loading
		function proceed() {
			if( scriptsAsync.length ) {
				// Load asynchronous scripts
				head.js.apply( null, scriptsAsync );
			}

			start();
		}

		function loadScript( s ) {
			head.ready( s.src.match( /([\w\d_\-]*)\.?js$|[^\\\/]*$/i )[0], function() {
				// Extension may contain callback functions
				if( typeof s.callback === 'function' ) {
					s.callback.apply( this );
				}

				if( --scriptsToPreload === 0 ) {
					proceed();
				}
			});
		}

		for( var i = 0, len = config.dependencies.length; i < len; i++ ) {
			var s = config.dependencies[i];

			// Load if there's no condition or the condition is truthy
			if( !s.condition || s.condition() ) {
				if( s.async ) {
					scriptsAsync.push( s.src );
				}
				else {
					scripts.push( s.src );
				}

				loadScript( s );
			}
		}

		if( scripts.length ) {
			scriptsToPreload = scripts.length;

			// Load synchronous scripts
			head.js.apply( null, scripts );
		}
		else {
			proceed();
		}

	}

	/**
	 * Starts up mySlide.js by binding input events and navigating
	 * to the current URL deeplink if there is one.
	 */
	function start() {

		// Make sure we've got all the DOM elements we need
		// Prevent transitions while we're loading
		dom.slides.classList.add( 'no-transition' );
		dom.wrapper.setAttribute( 'role', 'application' );

		
		// Updates the presentation to match the current configuration values
		configure();

		// Read the initial hash
		readURL();

		// Notify listeners that the presentation is ready but use a 1ms
		// timeout to ensure it's not fired synchronously after #initialize()
		setTimeout( function() {
			// Enable transitions now that we're loaded
			dom.slides.classList.remove( 'no-transition' );

			dispatchEvent( 'ready', {
				'indexh': indexh,
				'currentSlide': currentSlide
			} );
		}, 1 );

	
	}


	/**
	 * Creates an HTML element and returns a reference to it.
	 * If the element already exists the existing instance will
	 * be returned.
	 */
	function createSingletonNode( container, tagname, classname, innerHTML ) {

		// Find all nodes matching the description
		var nodes = container.querySelectorAll( '.' + classname );

		// Check all matches to find one which is a direct child of
		// the specified container
		for( var i = 0; i < nodes.length; i++ ) {
			var testNode = nodes[i];
			if( testNode.parentNode === container ) {
				return testNode;
			}
		}

		// If no node was found, create it now
		var node = document.createElement( tagname );
		node.classList.add( classname );
		if( typeof innerHTML === 'string' ) {
			node.innerHTML = innerHTML;
		}
		container.appendChild( node );

		return node;

	}



	/**
	 * Applies the configuration settings from the config
	 * object. May be called multiple times.
	 */
	function configure( options ) {

		var numberOfSlides = dom.wrapper.querySelectorAll( SLIDES_SELECTOR ).length;

		dom.wrapper.classList.remove( config.transition );

		// New config options may be passed when this method
		// is invoked through the API after initialization
		if( typeof options === 'object' ) extend( config, options );

		// Force linear transition based on browser capabilities
		if( features.transforms3d === false ) config.transition = 'linear';

		dom.wrapper.classList.add( config.transition );

		dom.wrapper.setAttribute( 'data-transition-speed', 'default' );
	
		dom.wrapper.classList.add( 'center' );
	

		sync();

	}

	/**
	 * Binds all event listeners.
	 */
	function addEventListeners() {

		window.addEventListener( 'hashchange', onWindowHashChange, false );
		window.addEventListener( 'resize', onWindowResize, false );
		var visibilityChange;

		if( 'hidden' in document ) {
			visibilityChange = 'visibilitychange';
		}
		else if( 'msHidden' in document ) {
			visibilityChange = 'msvisibilitychange';
		}
		else if( 'webkitHidden' in document ) {
			visibilityChange = 'webkitvisibilitychange';
		}

		if( visibilityChange ) {
			document.addEventListener( visibilityChange, onPageVisibilityChange, false );
		}

	}

	/**
	 * Unbinds all event listeners.
	 */
	function removeEventListeners() {
		
		window.removeEventListener( 'hashchange', onWindowHashChange, false );
		window.removeEventListener( 'resize', onWindowResize, false );

	}

	/**
	 * Extend object a with the properties of object b.
	 * If there's a conflict, object b takes precedence.
	 */
	function extend( a, b ) {

		for( var i in b ) {
			a[ i ] = b[ i ];
		}

	}

	/**
	 * Converts the target object to an array.
	 */
	function toArray( o ) {

		return Array.prototype.slice.call( o );

	}

	

	/**
	 * Measures the distance in pixels between point a
	 * and point b.
	 *
	 * @param {Object} a point with x/y properties
	 * @param {Object} b point with x/y properties
	 */
	function distanceBetween( a, b ) {

		var dx = a.x - b.x,
			dy = a.y - b.y;

		return Math.sqrt( dx*dx + dy*dy );

	}

	/**
	 * Dispatches an event of the specified type from the
	 * mySlide DOM element.
	 */
	function dispatchEvent( type, args ) {

		var event = document.createEvent( 'HTMLEvents', 1, 2 );
		event.initEvent( type, true, true );
		extend( event, args );
		dom.wrapper.dispatchEvent( event );

	

	}



	/**
	 * Applies JavaScript-controlled layout rules to the
	 * presentation.
	 */
	function layout() {

		if( dom.wrapper ) {
			// Select all slides, vertical and horizontal
			var slides = toArray( dom.wrapper.querySelectorAll( SLIDES_SELECTOR ) );

			for( var i = 0, len = slides.length; i < len; i++ ) {
				var slide = slides[ i ];

				// Don't bother updating invisible slides
				if( slide.style.display === 'none' ) {
					continue;
				}
				slide.style.height='100%';
			}
		}
	}

	/**
	 * Steps from the current point in the presentation to the
	 * slide which matches the specified horizontal and vertical
	 * indices.
	 *
	 * @param {int} h Horizontal index of the target slide
	
	 */
	function slide( h ) {

		// Remember where we were at before
		previousSlide = currentSlide;

		// Query all horizontal slides in the deck
		var horizontalSlides = dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR );

			// Remember the state before this slide
		var stateBefore = state.concat();

		// Reset the state array
		state.length = 0;

		var indexhBefore = indexh || 0;

		// Activate and transition to the new slide
		indexh = updateSlides( HORIZONTAL_SLIDES_SELECTOR, h === undefined ? indexh : h );
	
		// Update the visibility of slides now that the indices have changed
		updateSlidesVisibility();

		layout();

		// Apply the new state
		stateLoop: for( var i = 0, len = state.length; i < len; i++ ) {
			// Check if this state existed on the previous slide. If it
			// did, we will avoid adding it repeatedly
			for( var j = 0; j < stateBefore.length; j++ ) {
				if( stateBefore[j] === state[i] ) {
					stateBefore.splice( j, 1 );
					continue stateLoop;
				}
			}

			document.documentElement.classList.add( state[i] );

			// Dispatch custom event matching the state's name
			dispatchEvent( state[i] );
		}

		// Clean up the remains of the previous state
		while( stateBefore.length ) {
			document.documentElement.classList.remove( stateBefore.pop() );
		}

		// Find the current horizontal slide and any possible vertical slides
		// within it
		var currentHorizontalSlide = horizontalSlides[ indexh ]/*,currentVerticalSlides = currentHorizontalSlide.querySelectorAll( 'section' )*/;

		// Store references to the previous and current slides
		currentSlide = currentHorizontalSlide;

		
		// Dispatch an event if the slide changed
		var slideChanged = ( indexh !== indexhBefore );
		if( slideChanged ) {
			dispatchEvent( 'slidechanged', {
				'indexh': indexh,
				'previousSlide': previousSlide,
				'currentSlide': currentSlide,
			} );
		}
		else {
			// Ensure that the previous slide is never the same as the current
			previousSlide = null;
		}

		// Solves an edge case where the previous slide maintains the
		// 'present' class when navigating between adjacent vertical
		// stacks
		if( previousSlide ) {
			previousSlide.classList.remove( 'present' );
			previousSlide.setAttribute( 'aria-hidden', 'true' );
		}



	}

	/**
	 * Syncs the presentation with the current DOM. Useful
	 * when new slides or control elements are added or when
	 * the configuration has changed.
	 */
	function sync() {

		// Subscribe to input
		removeEventListeners();
		addEventListeners();

		// Force a layout to make sure the current config is accounted for
		layout();
	
		updateSlidesVisibility();
	}



	/**
	 * Updates one dimension of slides by showing the slide
	 * with the specified index.
	 *
	 * @param {String} selector A CSS selector that will fetch
	 * the group of slides we are working with
	 * @param {Number} index The index of the slide that should be
	 * shown
	 *
	 * @return {Number} The index of the slide that is now shown,
	 * might differ from the passed in index if it was out of
	 * bounds.
	 */
	function updateSlides( selector, index ) {

		// Select all slides and convert the NodeList result to
		// an array
		var slides = toArray( dom.wrapper.querySelectorAll( selector ) ),
			slidesLength = slides.length;

		if( slidesLength ) {
			// Enforce max and minimum index bounds
			index = Math.max( Math.min( index, slidesLength - 1 ), 0 );

			for( var i = 0; i < slidesLength; i++ ) {
				var element = slides[i];

				element.classList.remove( 'past' );
				element.classList.remove( 'present' );
				element.classList.remove( 'future' );

				// http://www.w3.org/html/wg/drafts/html/master/editing.html#the-hidden-attribute
				element.setAttribute( 'hidden', '' );
				element.setAttribute( 'aria-hidden', 'true' );

				// If this element contains vertical slides
				if( element.querySelector( 'section' ) ) {
					element.classList.add( 'stack' );
				}

				if( i < index ) {
					// Any element previous to index is given the 'past' class
					element.classList.add(  'future'  );
				}
				else if( i > index ) {
					// Any element subsequent to index is given the 'future' class
					element.classList.add( 'past' );
				}
			}

			// Mark the current slide as present
			slides[index].classList.add( 'present' );
			slides[index].removeAttribute( 'hidden' );
			slides[index].removeAttribute( 'aria-hidden' );

			// If this slide has a state associated with it, add it
			// onto the current state of the deck
			var slideState = slides[index].getAttribute( 'data-state' );
			if( slideState ) {
				state = state.concat( slideState.split( ' ' ) );
			}

		}
		else {
			// Since there are no slides we can't be anywhere beyond the
			// zeroth index
			index = 0;
		}

		return index;

	}

	/**
	 * Optimization method; hide all slides that are far away
	 * from the present slide.
	 */
	function updateSlidesVisibility() {

		// Select all slides and convert the NodeList result to
		// an array
		var horizontalSlides = toArray( dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR ) ),
			horizontalSlidesLength = horizontalSlides.length,
			distanceX,
			distanceY;

		if( horizontalSlidesLength && typeof indexh !== 'undefined' ) {

			// The number of steps away from the present slide that will
			// be visible
			var viewDistance = config.viewDistance;
			for( var x = 0; x < horizontalSlidesLength; x++ ) {
				var horizontalSlide = horizontalSlides[x];
				// Determine how far away this slide is from the present
				distanceX = Math.abs( ( indexh || 0 ) - x ) || 0;

				// Show the horizontal slide if it's within the view distance
				if( distanceX < viewDistance ) {
					horizontalSlide.style.display = 'block';
				}
				else {
				
					horizontalSlide.style.display = 'none';
				}
			}
		}
	}







	/**
	 * Determine what available routes there are for navigation.
	 *
	 * @return {Object} containing four booleans: left/right/up/down
	 */
	function availableRoutes() {

		var horizontalSlides = dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR );
	
		var routes = {
			left: indexh > 0 ,
			right: indexh < horizontalSlides.length - 1 
		};
		return routes;

	}


	/**
	 * Reads the current URL (hash) and navigates accordingly.
	 */
	function readURL() {

		var hash = window.location.hash;

		// Attempt to parse the hash as either an index or name
		var bits = hash.slice( 2 ).split( '/' ),
			name = hash.replace( /#|\//gi, '' );

		// If the first bit is invalid and there is a name we can
		// assume that this is a named link
		if( isNaN( parseInt( bits[0], 10 ) ) && name.length ) {
			var element;

			// Ensure the named link is a valid HTML ID attribute
			if( /^[a-zA-Z][\w:.-]*$/.test( name ) ) {
				// Find the slide with the specified ID
				element = document.getElementById( name );
			}

			if( element ) {
				// Find the position of the named slide and navigate to it
				var indices = mySlide.getIndices( element );
				slide( indices.h );
			}
			// If the slide doesn't exist, navigate to the current slide
			else {
				slide( indexh || 0);
			}
		}
		else {
			// Read the index components of the hash
			var h = parseInt( bits[0], 10 ) || 0;

			if( h !== indexh ) {
				slide( h );
			}
		}
	}



	/**
	 * Retrieves the h/v location of the current, or specified,
	 * slide.
	 *
	 * @param {HTMLElement} slide If specified, the returned
	 * index will be for this slide rather than the currently
	 * active one
	 *
	 * @return {Object} { h: <int>, v: <int>, f: <int> }
	 */
	function getIndices( slide ) {

		// By default, return the current indices
		var h = indexh;

		// If a slide is specified, return the indices of that slide
		if( slide ) {
			
			// Select all horizontal slides
			var horizontalSlides = toArray( dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR ) );

			// Now that we know which the horizontal slide is, get its index
			h = Math.max( horizontalSlides.indexOf( slide ), 0 );

		}
		return { h: h};
	}

	
	/**
	 * Handler for the window level 'hashchange' event.
	 */
	function onWindowHashChange( event ) {

		readURL();

	}

	/**
	 * Handler for the window level 'resize' event.
	 */
	function onWindowResize( event ) {

		layout();

	}

	/**
	 * Handle for the window level 'visibilitychange' event.
	 */
	function onPageVisibilityChange( event ) {

		var isHidden =  document.webkitHidden ||
						document.msHidden ||
						document.hidden;

		// If, after clicking a link or similar and we're coming back,
		// focus the document.body to ensure we can use keyboard shortcuts
		if( isHidden === false && document.activeElement !== document.body ) {
			// Not all elements support .blur() - SVGs among them.
			if( typeof document.activeElement.blur === 'function' ) {
				document.activeElement.blur();
			}
			document.body.focus();
		}

	}


	// --------------------------------------------------------------------//
	// ------------------------------- API --------------------------------//
	// --------------------------------------------------------------------//


	mySlide = {
		VERSION: VERSION,

		initialize: initialize,
		configure: configure,
		//readURLAndGetIndex:readURLAndGetIndex,
		sync: sync,

		// Navigation methods
		slide: slide,
		
		// Forces an update in slide layout
		layout: layout,

		// Returns an object with the available routes as booleans (left/right/top/bottom)
		availableRoutes: availableRoutes,

		// Adds or removes all internal event listeners (such as keyboard)
		addEventListeners: addEventListeners,
		removeEventListeners: removeEventListeners,

		// Returns the indices of the current, or specified, slide
		getIndices: getIndices,

		// Forward event binding to the mySlide DOM element
		addEventListener: function( type, listener, useCapture ) {
			if( 'addEventListener' in window ) {
				( dom.wrapper || document.querySelector( '.mySlide' ) ).addEventListener( type, listener, useCapture );
			}
		},
		removeEventListener: function( type, listener, useCapture ) {
			if( 'addEventListener' in window ) {
				( dom.wrapper || document.querySelector( '.mySlide' ) ).removeEventListener( type, listener, useCapture );
			}
		}

	
	};

	return mySlide;

}));
//------------------------------------------------------//

//id is Menu_sec2
function selectMenu(id)
{
		//console.log('var id='+id);
		var a = document.getElementById('Menu').getElementsByTagName('li');
		for(var j = 0; j < a.length-1; j++){
			var t="Menu_sec"+(j+1);
			document.getElementById(t).style.backgroundColor="rgba(255,255,255,0)";
		}
		document.getElementById(id).style.backgroundColor="rgba(255,255,255,0.2)";
		currntID=id.substring(8);
		//console.log('id='+currntID+"/"+nbID);
}				
 // Required, even if empty.
		mySlide.initialize({
		transition: 'convex',
		});
		//-- Init
		var currntID=1;
		var nbID=1;
		var hash = window.location.hash;
			var bits = hash.slice( 2 ).split( '/' );
			var name = hash.replace( /#|\//gi, '' );
			//console.log(name);
			if( name.length ) 
			{
				var element;
				

				// Ensure the named link is a valid HTML ID attribute
				if( /^[a-zA-Z][\w:.-]*$/.test( name ) ) {
					// Find the slide with the specified ID
					//console.log("--->Menu_"+name);
					selectMenu('Menu_'+name)
				}
			}
			else
				selectMenu('Menu_sec1');
		
		//-- keyboard
		document.addEventListener('keydown', function(event) {
			if(event.keyCode == 37) {
				//console.log('Left was pressed');
				currntID--;
				if(currntID<1)
					currntID=nbID;
				//console.log('id='+currntID+"/"+nbID);
				window.location.href ="#/sec"+currntID;
				selectMenu('Menu_sec'+currntID);
				
			}
			else if(event.keyCode == 39) {
				//console.log('Right was pressed');
				currntID++;
				if(currntID>nbID)
					currntID=1;
				//console.log('id='+currntID+"/"+nbID);
				window.location.href ="#/sec"+currntID;
				selectMenu('Menu_sec'+currntID);
			}
		});
		//-- touch
		 var touchsurface = document.getElementById('touchsurface'),
        startX,
        startY,
        dist,
        threshold = 150, //required min distance traveled to be considered swipe
        allowedTime = 200, // maximum time allowed to travel that distance
        elapsedTime,
        startTime
		
		touchsurface.addEventListener('touchstart', function(e){
			var touchobj = e.changedTouches[0]
			//console.log(touchobj);
			dist = 0
			startX = touchobj.pageX
			startY = touchobj.pageY
			startTime = new Date().getTime() // record time when finger first makes contact with surface
			e.preventDefault()
		}, false);
 
		touchsurface.addEventListener('touchmove', function(e){
			e.preventDefault() // prevent scrolling when inside DIV
		}, false)
 
		touchsurface.addEventListener('touchend', function(e){
			var touchobj = e.changedTouches[0]
			dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
			elapsedTime = new Date().getTime() - startTime // get time elapsed
			// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
			//console.log("dist="+dist +" "+elapsedTime);
			var allowedTime=200;
			var threshold=100;
			var swiperightBol = (elapsedTime <= allowedTime && Math.abs(dist) >= threshold && Math.abs(touchobj.pageY - startY) <= 100)
			if(swiperightBol)
			{
				//console.log("swip");
				if(dist<0)
				{
					//console.log('Swift Left');
					currntID--;
					if(currntID<1)
						currntID=nbID;
					//console.log('id='+currntID+"/"+nbID);
					window.location.href ="#/sec"+currntID;
					selectMenu('Menu_sec'+currntID);
				}
				if(dist>0)
				{
					//console.log('swift Right');
					currntID++;
					if(currntID>nbID)
						currntID=1;
					//console.log('id='+currntID+"/"+nbID);
					window.location.href ="#/sec"+currntID;
					selectMenu('Menu_sec'+currntID);
				}
			}
			e.preventDefault()
		}, false)
		//-- click
		var a = document.getElementById('Menu').getElementsByTagName('li');
		nbID=a.length-1;
		//console.log('id='+currntID+"/"+nbID);
		for(var i = 0; i < a.length; i++){
			  a[i].onclick = function(){
				 selectMenu(this.id);
		}
	}
