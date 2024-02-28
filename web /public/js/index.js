let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.7749968, lng: -86.1794685 },
    zoom: 14,
  });
}