const axios = require('axios');

const HttpError = require('../models/http-error');

const API_KEY = process.env.GOOGLE_API_KEY;

async function getCoordsForAddress(address) {
  return {
    lat: 40.7484474,
    lng: -73.9871516
  };
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data;

  if (!data || data.status === 'ZERO_RESULTS') {
    const error = new HttpError(
      'Could not find location for the specified address.',
      422
    );
    throw error;
  }

  const coordinates = data.results[0].geometry.location;

  return coordinates;
}

module.exports = getCoordsForAddress;



//  -------------------------------------map-box------------------------------------

// const getCoordsForAddress = async (address) => {
//   let data;
//   try {
//     const url = 'https://api.mapbox.com/geocoding/v5';
//     const endpoint = 'mapbox.places';
//     const searchText = encodeURIComponent(address);
//     const YOUR_MAPBOX_ACCESS_TOKEN;
 
//     const response = await axios({
//       method: 'GET',
//       url: `${url}/${endpoint}/${searchText}.json/?access_token=${YOUR_MAPBOX_ACCESS_TOKEN}`,
//     });
//     data = response.data;
//   } catch (e) {
//     throw new HttpError('Something went wrong', 500);
//   }
 
//   if (!data || data.status === 'ZERO_RESULTS') {
//     throw new HttpError(
//       'Could not find location for the specified address.',
//       422
//     );
//   }
 
//   const [lng, lat] = data.features[0].center;
 
//   return { lat, lng };
// };


//  -------------------------------------map-box------------------------------------

// --------------------------------------LocationIQ---------------------------------

// const axios = require("axios");
// const HttpError = require("../models/http-error");
// const API_KEY = "YOUR_API_KEY_HERE";
 
// async function getCoordsForAddress(address) {
//   const response = await axios.get(
//     `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(
//       address
//     )}&format=json`
//   );
 
//   const data = response.data[0];
 
//   console.log(data);
 
//   if (!data || data.status === "ZERO_RESULTS") {
//     const error = new HttpError(
//       "Could not find location for the specified address.",
//       422
//     );
//     throw error;
//   }
 
//   const coorLat = data.lat;
//   const coorLon = data.lon;
//   const coordinates = {
//     lat: coorLat,
//     lng: coorLon
//   };
 
//   return coordinates;
// }
 
// module.exports = getCoordsForAddress;


// --------------------------------------LocationIQ---------------------------------