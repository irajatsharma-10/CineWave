import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {uploadOnCloudinary} from "../utils/FileUpload.js";
import User from "../models/user.model.js";


// not required async handler as we are not handling any of the web requests here
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(400, "user not found");
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();


    await User.findByIdAndUpdate(
      userId,
      {
        refreshToken: refreshToken,
      },
      {new: true}
    );
    

    return {accessToken, refreshToken};
  } catch (error) {
    throw new ApiError(500, "Error generating refresh and access token");
  }
};
// get data from the frontend
// received data validation required
// check username or email already exist
// if then return username email already exist
// else create the user model hash the password and save it in the data base
// check for images and check for avatar
// upload data(images and files) to cloudinary
// create user object - create entry in db
// remove password and refresh token from response
// check for user creation
// return response

const registerUser = asyncHandler(async (req, res) => {

  const {fullName, email, username, password} = req.body;
  //console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{username}, {email}],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file path is required");
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file path is required");
  }
  console.log("uploaded avatar on cloudinary", avatar);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // fetch data from the user
  
  const {username, email, password} = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({$or: [{username}, {email}]});
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  // User provide the methods from the mongoose
  const checkPasswordValid = await user.isPasswordCorrect(password);

  if (!checkPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(
    user._id
  );
  const sanitizedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // here we have to perform the multiple data calls

  // cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitizedUser,
        },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {new: true}
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const {newRefreshToken, accessToken} = await generateAccessAndRefreshTokens(
      user?._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {refreshToken: newRefreshToken},
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }
  user.password = newPassword; // here the user password is modified
  await user.save({validateBeforeSave: false});
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password modified successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.body?.accessToken;
  if (!token) {
    throw new ApiError(401, "Not logged in");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user data"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const {fullName, email} = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {new: true}
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing for update");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(400, "Failed to update the new Avatar on cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      avatar: avatar?.url,
    },
    {new: true}
  ).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200,"Avatar updated successfully"))
});


const updateCoverImage = asyncHandler(async (req, res) => {
  const updateCoverImagePath = req.file?.path;
  if (!updateCoverImagePath) {
    throw new ApiError(400, "CoverImage file is missing for update");
  }
  const coverImage = await uploadOnCloudinary(updateCoverImagePath);
  console.log("cover image while uploading", coverImage)
  if (!coverImage?.url) {
    throw new ApiError(400, "Failed to update the new cover image on cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      coverImage: coverImage?.url,
    },
    {new: true}
  ).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200,"Cover Image updated successfully"))
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params
  if(!username?.trim()){
    throw new ApiError(400,"username is missing")
  }
  // User.find({
  //   username: username
  // })


  // explore mongodb documentation and mongodb while writing the pipeline
  const channel = await User.aggregate([{
    $match:{
      username: username.toLowerCase()
    }
  },
  {
    // in mongodb database all model name changes to lowercase and will become plural
    $lookup:{
      from: "subscriptions",
      localField: "_id",
      // channel is the entity in subscription model
      foreignField: "channel",
      as: "subscribers"
    }
  },{
    $lookup:{
      from: "subscriptions",
      localField: "_id", 
      foreignField: "subscriber",
      as: "subscribedTO"
    }
  },
  {
    $addFields:{
      subscribersCount:{
        $size: "$subscribers"
      },
      channelsSubscribedToCount:{
        $size:"$subscribedTO"
      },
      isSubscribed:{
        $cond:{
          // in lookup to both array and object
          if:{$in: [req.user?._id, "$subscribers.subscriber"]},
          then: true,
          else: false
        }
      }
    },
  },{
    // the field which you want to pass on to the user 
    // mark their flag as 1
    $project:{
      fullName: 1,
      username: 1,
      subscribersCount: 1,
      channelsSubscribedToCount: 1,
      isSubscribed: 1,
      avatar: 1,
      coverImage: 1,
      email: 1 
    }
  }])
  console.log("Channel aggregate details ", channel)
  if(!channel?.length){
    throw new ApiError(404, "channel does not exists")
  }
  return res.status(200).json(new ApiResponse(200,channel,"User channel fetched successfully "))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match: {
        // here we want mongodb document id 
        // req.user._id is providing the string
        // actually mongoose convert the string into objectId internally 
        // inside an aggregation pipeline, Mongoose does not do this conversion, so you must explicitly convert the string into an ObjectId.
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },{
      $lookup:{
        from : "Video",
        localField:"watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup:{
              from: "User",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline:[
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])
  return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})


export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateCoverImage,
  updateUserAvatar,
  getUserChannelProfile,
  getWatchHistory
};
