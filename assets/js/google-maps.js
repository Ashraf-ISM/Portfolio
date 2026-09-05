function initMap() {
    // Latitude and Longitude
    var myLatLng = {lat: 23.8152778, lng: 86.4402774};

    var map = new google.maps.Map(document.getElementById('google-maps'), {
        zoom: 17,
        center: myLatLng
    });

    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: 'Dhanbad, India' // Title Location
    });
}