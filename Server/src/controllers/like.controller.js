import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }
    if(!req.user){
        throw new ApiError(401, "Please login to like the video")
    }
    const likeExists = await Like.aggregate([
        {
            $match:{
                video: mongoose.Types.ObjectId(videoId),
                likedBy: mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {$count: "likedBy"}
    ])
    if(Array.isArray(likeExists) && likeExists.length > 0 && likeExists[0].likedBy > 0){
        await Like.deleteOne({
            video: mongoose.Types.ObjectId(videoId),
            likedBy: mongoose.Types.ObjectId(user._id)
        })
    }else{
        await Like.create({
            video: mongoose.Types.ObjectId(videoId),
            likedBy: mongoose.Types.ObjectId(user._id)
        })
    }
    return res.status(200).json(new ApiResponse(200, null, "Video like toggled successfully"))          
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }
    if(!req.user){
        throw new ApiError(401, "Please login to like the comment")
    }
    const existingLike = await Like.findOne({
        comment: mongoose.Types.ObjectId(commentId),
        likedBy: mongoose.Types.ObjectId(req.user?._id)
    })
    if(!existingLike){
        await Like.create({
            comment: mongoose.Types.ObjectId(commentId),
            likedBy: mongoose.Types.ObjectId(req.user?._id)
        })
    }else{
        await Like.deleteOne({
            comment: mongoose.Types.ObjectId(commentId),
            likedBy: mongoose.Types.ObjectId(req.user?._id)
        })
    }
    return res.status(200).json(new ApiResponse(200, null, "Comment like toggled successfully"))    
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400, "Invalid tweet ID")
    }
    if(!req.user){
        throw new ApiError(401, "Please login to like the tweet")
    }
    const existingLike = await Like.findOne({
        tweet: mongoose.Types.ObjectId(tweetId),
        likedBy: mongoose.Types.ObjectId(req.user?._id)
    })
    if(!existingLike){
        await Like.create({
            tweet: mongoose.Types.ObjectId(tweetId),
            likedBy: mongoose.Types.ObjectId(req.user?._id)
        })
    }else{
        await Like.deleteOne({
            tweet: mongoose.Types.ObjectId(tweetId),
            likedBy: mongoose.Types.ObjectId(req.user?._id)
        })
    }
})


const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    if(!req.user){
        throw new ApiError(401, "User not authorized")
    }
    const userId = req.user?._id;
    const likeVideos = await Like.aggregate([
        {
            $match: {
                likedBy: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "Video",
                localField: "video",
                foreignField: "_id",
                as: "videos"
            },
        },
        {
            $unwind: "$videos"
        },
        {
            $lookup: {
                from: "User",
                localField: "videos.owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                _id: "$videos._id",       // Video ID
                title: "$videos.title",   // Video Title
                thumbnail: "$videos.thumbnail",  // Video Thumbnail (if applicable)
                duration: "$videos.duration",  // Video Duration
                likesCount: "$videos.likesCount", // Total Likes on Video
                owner: {
                    _id: "$owner._id",
                    name: "$owner.name",
                    profilePic: "$owner.profilePic" // Owner's Profile Picture
                }
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200,likeVideos, "Liked videos data"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}



[
    {
      "_id": "like1",
      "likedBy": "user123",
      "videos": [
        {
          "_id": "videoA",
          "title": "Intro to MongoDB",
          "owner": "user456"
        },
        {
          "_id": "videoB",
          "title": "Advanced MongoDB",
          "owner": "user789"
        }
      ],
      "owner": [
        { "_id": "user456", "name": "Alice" },
        { "_id": "user789", "name": "Bob" }
      ]
    }
  ]