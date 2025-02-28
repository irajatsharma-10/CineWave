import mongoose from "mongoose";
import {Comment} from "../models/comment.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";
const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const {videoId} = req.params;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const {page = 1, limit = 10} = req.query;
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const comments =await Comment.aggregate([
    {
      $match: {
        video: mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: (options.page - 1) * options.limit,
    },
    {
      $limit: options.limit,
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
      $addFields: {
        owner: {
          $arrayElemAt: ["$owner", 0],
        },
      },
    },
    {
      $lookup: {
        from: "Like",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likes: {
          $size: "$likes",
        },
        isLikes: {
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
        likes: 1,
        isLiked: 1,
        createdAt: 1,
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const {videoId} = req.params;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const videoExists = await Video.findById(videoId);
  if(!videoExists){
    throw new ApiError(404, "Video not found");
  }
  const {content} = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  if(!req.user){
    throw new ApiError(401, "Please sign in to comment");
  }
  const comment = await new Comment({
    content,
    owner: req.user._id,
    video: videoId,
  })
  await comment.save();
  return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"));

});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  if(!req.user){
    throw new ApiError(401, "Please sign in to update comment");
  }
  const {commentId} = req.params;
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findById(commentId);
  if(!comment){
    throw new ApiError(404, "Comment not found");
  }
  if(req.user?._id !== comment.owner.toString()){
    throw new ApiError(403, "You are not allowed to update this comment");
  }
  const {content} = req.body;
  if(!content.trim()){
    throw new ApiError(400, "Content is required");
  }
  await Comment.findByIdAndUpdate(commentId, {$set:{content}}, {new: true});
  return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const {commentId} = req.params;
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  if(!req.user){
    throw new ApiError(401, "Please sign in to delete comment");
  }
  const comment = await Comment.findById(commentId);
  if(!comment){
    throw new ApiError(404, "Comment not found");
  }
  if(req.user?.id.toString() !== comment.owner.toString()){
    throw new ApiError(403, "You are not allowed to delete this comment");
  }
  await Like.deleteMany({comment: commentId});
  await Comment.findByIdAndDelete(commentId);
  return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));

});

export {getVideoComments, addComment, updateComment, deleteComment};
