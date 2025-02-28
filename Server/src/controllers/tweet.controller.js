import mongoose, {isValidObjectId} from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const {content} = req.body;
  if (!content.trim()) {
    throw new ApiError(400, "Please enter the valid content");
  }
  if (!req.user) {
    throw new ApiError(401, "Please login to create a tweet");
  }
  // create the tweet
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });
  await tweet.save();
  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const {userId} = req.params;
  const {page = 1, limit = 20} = req.query;

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Please provide a valid user id");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: (options?.page - 1) * options?.limit, // for skip value must be an integer not a object
    },
    {
      $limit: options?.limit,
    },
    {
      $lookup: {
        from: "User",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      addFields: {
        owner: {
          $arrayElemAt: ["$owner", 0],
        },
      },
    },
    {
      $lookup: {
        from: "Like",
        localField: "_id",
        foreignField: "tweet",
        as: "likes", // stores the result in the form of like array
      },
    },
    {
      $addFields: {
        likes: {
          $size: "$likes",
        },
        isLiked: {
          $cond: {
            if: {$in: [req.user?._id, "$likes.likedBy"]},
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (!tweets.length) {
    throw new ApiError(401, "Error while fetching tweets");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const {content} = req.body;
  if (!content.trim()) {
    throw new ApiError(400, "Please enter the valid content");
  }
  const {tweetId} = req.params;
  if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const user = req.user?._id;
  if (!user) {
    throw new ApiError(401, "Please login to update the tweet");
  }

  // this will mislead even if the tweet found but the owner is not the same
  //   const tweet = await Tweet.findOne({_id: tweetId, owner: user})
  //   if(!tweet){
  //     throw new ApiError(404, "Tweet not found or you do not have permission to update this tweet")
  //   }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() != user.toString()) {
    throw new ApiError(403, "You do not have permission to update this tweet");
  }

  //   $set ensures that only the specified fields are updated, leaving the rest of the document unchanged.
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {$set: {content}},
    {new: true}
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Error while updating the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const {tweetId} = req.params;
  if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const user = req.user?._id;
  if (!user) {
    throw new ApiError(401, "Please login to update the tweet");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet.owner.toString() != user.toString()) {
    throw new ApiError(403, "You do not have permission to update this tweet");
  }
  await Like.deleteMany({tweet: tweetId});
  await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export {createTweet, getUserTweets, updateTweet, deleteTweet};
