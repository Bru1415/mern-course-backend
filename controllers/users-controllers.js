const uuid = require("uuid");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

// const getUsers = (req, res, next) => {
//   const users = DUMMY_USERS;

//   if (!users || users.length === 0) {
//     return next(new HttpError("no users found", 404));
//   }

//   res.status(200).json({ users });
// };
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
    // const users = await User.find({}, 'email, name');
  } catch (error) {
    const err = new HttpError("Fetching failed", 500);
    return next(err);
  }

  const usersObjects = users.map((user) => user.toObject({ getters: true }));

  res.json({ users: usersObjects });
};

// const signup = (req, res, next) => {
//   const { name, email, password } = req.params;

//   if (!name || !email || !password) {
//     return next(new HttpError("the data is not complete", 406));
//   }
// same name twice is possible - do not use name for this
// if (DUMMY_USERS.find((user) => user.name === name)) {
//   return next(new HttpError("that name already exists", 409));
// }
//   if (DUMMY_USERS.find((user) => user.email === email)) {
//     return next(
//       new HttpError("there is already an account with that email", 409)
//     );
//   }
//   const newUser = { id: uuid(), name, email, password };
//   DUMMY_USERS.push(newUser);
//   //   send auth
//   // login();
//   res.status(201).json({ user: newUser });
// };
const signup = async (req, res, next) => {
  const valExpErrors = validationResult(req);

  if (!valExpErrors.isEmpty()) {
    return next(new HttpError("Invalid. Check data", 422));
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (error) {
    const err = new HttpError(
      "Could not establish connection to Database ",
      500
    );
    return next(err);
  }

  if (existingUser) {
    const error = new HttpError(
      "There is already a user with this email-address",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError("Could not create user, please try again", 500);
    return next(err);
  }
  const createdUser = new User({
    name, // name: name
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed", 500);
    return next(error);
  }

  let token;

  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Signing up failed", 500);
    return next(error);
  }

  // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

// const login = (req, res, next) => {
//   const { name, email, password } = req.params;
//         // const user = DUMMY_USERS.find((user) => user.name === name);  // names can exist more than once
//         //better use email
//        //if (user.email !== email || user.password !== password) {
//  const identifiedUser = DUMMY_USERS.find((u) => u.email === email);
// if (!identifiedUser || identifiedUser.password !== password) {
//   {
//     return next(
//       new HttpError(
//         "your credentials are not correct. Check your email and password",
//         401
//       )
//     );
//   }
//   //   send auth
//   // login();
//   res.status(200).json();
// };
const login = async (req, res, next) => {
  const { email, password } = req.body;
  const valExpErrors = validationResult(req);

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (error) {
    const err = new HttpError("Could not establish connection to DB", 500);
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials", 403));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    const err = new HttpError("Could not log you in. Try again later", 500);
    return next(err);
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials", 403));
  }

  let token;

  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Logging in failed", 500);
    return next(error);
  }

  // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
  res.status(201).json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });

  // res.json({
  //   message: "Logged in!",
  //   user: existingUser.toObject({ getters: true }),
  // });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
