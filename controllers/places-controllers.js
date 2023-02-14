const fs = require("fs");
const uuid = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
// import getCoordsForAddress from "../util/location";
const Place = require("../models/place");
const { findByIdAndUpdate } = require("../models/place");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }
  if (!place) {
    const error = new HttpError("Cold not find a place for id", 404);
    return next(error);
  }
  res.json({
    place: place.toObject({ getters: true }),
  });
};

const getPlacesByUserId = async (req, res, next) => {
  const uId = req.params.uid;
  let places;
  // let userOfPlaces;
  try {
    places = await Place.find({ creator: uId });
    // userOfPlaces = await User.findById(uId).populate('places');
    // places = userOfPlaces.places;
  } catch (err) {
    const error = new HttpError("Sth went wrong", 500);
    return next(error);
  }
  if (!places || places.length === 0) {
    return next(new HttpError("Cold not find a places for user id", 404));
  }
  res.json({ places: places.map((item) => item.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid. Check data", 422));
  }
  const { title, description, address } = req.body;
  let convertedAddress;
  try {
    convertedAddress = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }
  const createdPlace = new Place({
    title,
    description,
    location: convertedAddress,
    address,
    image: req.file.path,
    creator: req.userData.userId,
  });
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    const err = new HttpError("Creating place failed.", 500);
    return next(err);
  }

  if (!user) {
    const err = new HttpError("User is not in DB. Authorization failed", 404);
    return next(err);
  }

  try {
    // await createdPlace.save();
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating new Place failed", 500);
    return next(error);
  }
  res.status(201).json({ place: createdPlace });
};

// const updatePlace = (req, res, next) => {
//   const { title, description } = req.body;
//   const placeId = req.params.pid;
//   // const updatedPlace = { title, description, };
//   const place = DUMMY_PLACES.find((pl) => pl.id === placeId);
//   if (!place) {
//     return next(new HttpError("Cold not find a place for user id", 404));
//   }
//   if (!title && !description) {
//     return next(new HttpError("No user entry. Place was not updated"), 204);
//   }
//   for (let item of DUMMY_PLACES) {
//     if (item.id === placeId) {
//       if (description) {
//         item.description = description;
//       }
//       if (title) {
//         item.title = title;
//       }
//     }
//   }
//   res.status(200).json({ DUMMY_PLACES });
// };

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid. Check data", 422));
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const err = new HttpError("You have no authorization for this action", 401);
    return next(err);
  }

  place.title = title;
  place.description = description;
  // let updatedPlace;
  try {
    // updatedPlace = await Place.updateOne({ id: placeId }, { title, description });
    // updatedPlace = await findByIdAndUpdate(placeId, {
    //   runValidators: true,
    //   new: true,
    // });
    await place.save();
  } catch (err) {
    return next(new HttpError("could not update. try again later", 500));
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// const deletePlace = (req, res, next) => {
//   const placeId = req.params.pid;
//   const placeIndex = DUMMY_PLACES.findIndex((pl) => pl.id === placeId);
//   if (placeIndex === -1) {
//     return next(new HttpError("Cold not find a place for user id", 404));
//   }
//   DUMMY_PLACES.splice(placeIndex, 1);
//   res.status(200).json({ DUMMY_PLACES });
// };

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  // const newDummy = DUMMY_PLACES.filter((p) => p.id !== placeId);
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (error) {
    const err = new HttpError(
      "could not start connecting to data-base, try again later",
      500
    );
    return next(err);
  }

  if (!place) {
    return next(new HttpError("could not find a place for that id", 404));
  }

  if (place.creator.id !== req.userData.userId) {
    const err = new HttpError("You have no authorization for this action", 401);
    return next(err);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    const err = new HttpError("could not finish process", 500);
    return next(err);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({
    message: "Deleted place.",
    place: place.toObject({ getters: true }),
  });
};

exports.createPlace = createPlace;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
