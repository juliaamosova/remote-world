
$(document).ready(function() {

    var map;
    var service;

    // User's location variable
    var userPosition;

    var ENTER_KEY = 13;

    /* Setting a new InfoWindow:
    An InfoWindow displays content in a popup window above the map, at a given location. */
    var infoWindow = new google.maps.InfoWindow;

    // Initialize Firebase
    var config = {
      apiKey: "AIzaSyCAxnE1S0_G_x1xW1yQwZSByeYlGq1pWoQ",
      authDomain: "remote-world.firebaseapp.com",
      databaseURL: "https://remote-world.firebaseio.com",
      projectId: "remote-world",
      storageBucket: "",
      messagingSenderId: "970136406263"
    };
    firebase.initializeApp(config);

    var db = firebase.database();
    var reviews = db.ref("userReview");

    var firebaseAuth = firebase.auth();
    var provider = new firebase.auth.GoogleAuthProvider();

    var currentUser;

    // Variable for storing current user's selection of place type: cafe, co-working, library
    var currentPlacesSelection;

    // Google Sign-in
    firebaseAuth.signInWithPopup(provider).then(function(result) {
        var token = result.credential.idToken;
        console.log(result);

        // Signed-in User Information
        currentUser = result.user;

        // Setting user's profile picture using Google's account one
        $('#picture').attr('src', currentUser.photoURL);

        console.log(currentUser);
        console.log(currentUser.displayName);
        console.log(currentUser.photoURL);

    }).catch(function(error) {
        console.log(error);
    });

    // Loading the initial Map:
    function initMap() {

      // Hide Places Results Box on initial Map Load
      $('#right-panel').hide();

      // Hide My Reviews section on initial Map Load
      $("#menu #myReviewsSection").hide();

      // Hide 'Hide Reviews' button on initial Map Load
      $("#menu .closeReview").hide();

      /* Geolocation:
      The Geolocation object is used by scripts to programmatically determine the location information
      associated with the hosting device. The location information is acquired by applying a user-agent s
      pecific algorithm, creating a 'position' object, and populating that object with appropriate data accordingly.
      When 'getCurrentPosition()'' method called, it must immediately return and then asynchronously attempt
      to obtain the current location of the device. */

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          /*
          The JavaScript class that represents a 'map' is the 'Map' class.
          Objects of this class define a single map on a page.
          We create a new instance of this class using the JavaScript 'new' operator.
          There are two required options for every map: 'center' and 'zoom'.
          When we create a new map instance, we specify a <div> HTML element in the page as a container for the map.
          HTML nodes are children of the JavaScript document object,
          and we obtain a reference to this element via the 'document.getElementById()' method. */

          map = new google.maps.Map(document.getElementById('map'), {
            center: pos,
            zoom: 13
          });

          // Setting user's location globaly
          userPosition = pos;

          // Setting position at which this InfoWindow is anchored
          infoWindow.setPosition(pos);
          // Specifying the content of InfoWindow - letting user know where they are using InfoWindow
          infoWindow.setContent('You are here!');
          infoWindow.open(map);
          map.setCenter(pos);
        }, function() {
              handleLocationError(true, infoWindow, map.getCenter());
          });
      } else {
          // Browser doesn't support Geolocation
          handleLocationError(false, infoWindow, map.getCenter());
      }
    };

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
      infoWindow.setPosition(pos);
      infoWindow.setContent(browserHasGeolocation ?
                            'Error: The Geolocation service failed.' :
                            'Error: Your browser doesn\'t support geolocation.');
      infoWindow.open(map);
    };

    // Text Search Request - for Cafe, Co-Working & Library Spaces
    function textSearchMap(searchType, position) {

      if (navigator.geolocation) {

          map = new google.maps.Map(document.getElementById('map'), {
            center: userPosition,
            zoom: 13
          });

          var request = {
            location: userPosition,
            radius: '3000',
            query: searchType
          };

          service = new google.maps.places.PlacesService(map);
          service.textSearch(request, processResults);

          // Storing current user's selection of place type: cafe, co-working or library
          currentPlacesSelection = searchType;
      } else {
        console.log("No geolocation object for text search");
      }
    };

    // Processing Search Results
    function processResults(results, status, pagination) {

      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        return;
      } else {

        // Checking if the Raiting filter had been selected & applying raing filter
        if (document.getElementById("rating").checked) {
          results = results.filter(function(place) {
            return place.rating >= 4;
          })
          console.log("Results with raiting higher than 4: " + results);
        }

        // Checking if Hours filter had been selected and applying hours filter
        if (document.getElementById("hours").checked) {
          results = results.filter(function(place) {
            if (place.opening_hours != null) {
              var isOpen = place.opening_hours.open_now;
              console.log("Opening Hours: " + isOpen);
              return isOpen === true;
            } else {
              return false;
            }
          })
          console.log("Results with places that are open now: " + results);
        }

        for (var i = 0; i < results.length; i++) {
          createMarker(results[i]);

          if (pagination.hasNextPage) {
            var moreButton = document.getElementById('more');
            moreButton.disabled = false;

            moreButton.addEventListener('click', function() {
              moreButton.disabled = true;
              pagination.nextPage();
            });
          }
        }
        console.log(results);
      }
    };

    // Clear Results Box any time the map is filtered
    function clearPlacesList() {
      placesList = document.getElementById('places');
      placesList.innerHTML = '';
    };

    // Creating Markers on the Map
    function createMarker(place) {
      var bounds = new google.maps.LatLngBounds();
      placesList = document.getElementById('places');

      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      var marker = new google.maps.Marker({
        map: map,
        icon: image,
        title: place.name,
        position: place.geometry.location
      });

      google.maps.event.addListener(marker, 'click', function() {
        infoWindow.setContent('<div><strong>' + marker.title + '</strong><br>' + place.formatted_address + '</div>');
        infoWindow.open(map, this);

        var $this = $(this);

        $('#menu .submitReview').toggleClass('hide');
        $('#menu .reviewInput').toggleClass('hide');
        $('#menu .submitReview').text('Submit a Review for ' + marker.title);
      });

      placesList.innerHTML += '<li>' + place.name + '</li>';
      bounds.extend(place.geometry.location);
      map.fitBounds(bounds);
      map.setZoom(14);
    };

  var App = {
    init: function() {
      // Methods that need to be called on initialization
      App.bindEvents();
    },
    bindEvents: function() {
      // Filtering map: looking for cafes
      $("#menu #buttons #cafe").on('click', function() {
        console.log("Cafe button had been clicked on!");
        textSearchMap('cafe');
        $('#right-panel').show();
        clearPlacesList();
      });
      // Filtering map: looking for co-working spaces
      $("#menu #buttons #co-working").on('click', function() {
        console.log("Co-working button had been clicked on!");
        textSearchMap('co-working');
        $('#right-panel').show();
        clearPlacesList();
      });
      // Filtering map: looking for libraries
      $("#menu #buttons #library").on('click', function() {
        console.log("Library button had been clicked on!");
        textSearchMap('library');
        $('#right-panel').show();
        clearPlacesList();
      });
      // When clicked on avatar, return app to its original state
      $("#menu #avatar img").on('click', function() {
        initMap();
        clearPlacesList();
      });
      // Submitting a review
      $("#menu .submitReview").on('click', function(e) {
        App.create(e);
      });
      // Applying Rating filter
      $("#menu #rating").on('click', function() {
        console.log("Rating checkbox had been selected!");
        textSearchMap(currentPlacesSelection);
        clearPlacesList();
      });
      // Applying Hours filter
      $("#menu #hours").on('click', function() {
        console.log("Hours checkbox had been selected!");
        textSearchMap(currentPlacesSelection);
        clearPlacesList();
      });
      // Displaying My Reviews
      $("#menu #reviewButtons #myReviews").on('click', function() {
        console.log("My Reviews button had been clicked on!");
        App.render();
        $("#menu #myReviewsSection").show();
        $("#menu .closeReview").show();
      });
      // Hiding My Reviews Section and 'Hide Button'
      $("#menu .closeReview").on('click', function() {
        $("#menu #myReviewsSection").hide();
        $("#menu .closeReview").hide();
      });

      reviews.on('value', this.render.bind(this));
    },
    // Save review in Firebase's database
    create: function (e) {
			var $input = $(e.target).siblings('.reviewInput').find('input');
			var val = $input.val().trim();
			if (!val) {
				return;
			}
			reviews.push({
				message: val
			});
			$input.val('');
		},

    // Read reviews from Firebase's database
    render: function () {
      var myReviews = firebase.database().ref("userReview");
      myReviews.on('value', function(snapshot) {
        $("#menu #myReviewsSection").html("<ul></ul>")
        snapshot.forEach(function(reviewItem) {
          $("#menu #myReviewsSection ul").append("<li>" + reviewItem.val().message + "</li>");
        });
      });
    },
  }

  initMap();
  App.init();

});
