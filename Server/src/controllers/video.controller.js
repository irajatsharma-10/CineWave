import mongoose from "mongoose";
import {Video} from "../models/video.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {deleteFromCloudinary} from "../utils/FileUpload.js";

import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Video from "../models/videoModel.js"; // Adjust the path as needed

const getAllVideos = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    // Convert page and limit to integers
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    // Build Aggregation Pipeline
    const aggregationPipeline = [
      {
        $match: {
          ...(userId && mongoose.isValidObjectId(userId) && { owner: mongoose.Types.ObjectId(userId) }),
          ...(query && {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          }),
        },
      },
      {
        $sort: { [sortBy]: sortType === "desc" ? -1 : 1 },
      },
    ];

    // Execute Aggregation with Pagination
    const videos = await Video.aggregatePaginate(Video.aggregate(aggregationPipeline), options);

    res.status(200).json({
      success: true,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default getAllVideos;


const publishAVideo = asyncHandler(async (req, res) => {
  const {title, description} = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || !description) {
    throw new ApiError(400, "All fields are required");
  }
  let videoLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalPath = req.files.videoFile[0].path;
  }
  if (!videoLocalPath) {
    throw new ApiError(404, "Video file is required to publish a video");
  }
  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) & (req.files.thumbnail.length > 0)
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(
      404,
      "Video thumbnail file is required to publish a video"
    );
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  if (!videoFile?.url) {
    throw new ApiError(404, "Failed to upload video on cloudinary");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  // thumbnail is usually an object returned from the upload function, containing additional metadata like public_id, secure_url, and url.
  if (!thumbnail?.url) {
    throw new ApiError(404, "Failed to upload video thumbnail on cloudinary");
  }

  const currentUser = req.user?._id;
  const newVideo = new Video({
    title,
    owner: currentUser,
    description,
    videoFile: videoFile?.url,
    thumbnail: thumbnail?.url,
    duration: videoFile?.duration,
    isPublished: true,
  });
  await newVideo.save();
  return res
    .status(201)
    .json(new ApiResponse(201, newVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  //TODO: get video by id

  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new ApiError(400, "Invalid video ID");
  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {views: 1},
    },
    {new: true}
  )

    .populate({
      path: "owner",
      select: "username avatar",
    })
    .exec();
  if (!video) throw new ApiError(404, "Video not found");
  return res.status(200).json(200, video, "Video data fetched successfully");
});

const updateVideo = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const {title, description} = req.body;
  if (!(title || description)) {
    throw new ApiError(400, "All fields are required");
  }

  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "New thumbnail is required for update");
  }

  const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!updatedThumbnail?.url) {
    throw new ApiError(404, "Failed to update new thumbnail on cloudinary");
  }
  //TODO: update video details like title, description, thumbnail

  const updatedVideoInfo = await Video.findByIdAndUpdate(
    videoId,
    {
      title,
      description,
      thumbnail: updatedThumbnail?.url,
    },
    {new: true}
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoInfo,
        "Video information updated successfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  //TODO: delete video

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).select("thumbnail videoFile");
  if (!video) {
    throw new ApiError(404, "Video not found for deletion");
  }
  const extractVideoUrl = (url) => {
    if (!url) {
      throw new ApiError(
        404,
        "Video information not found. Unable to proceed with deletion."
      );
    }
    const part = url.split("/");
    return part.slice(-2)[1].split(".")[0];
  };
  const videoThumbnailPublicId = extractVideoUrl(video?.thumbnail);
  const videoFilePublicId = extractVideoUrl(video?.videoFile);
  if (!videoThumbnailPublicId) {
    throw new ApiError(400, "Video thumbnail not found for deletion");
  }

  if (!videoFilePublicId) {
    throw new ApiError(400, "Video file not found for deletion");
  }

  await deleteFromCloudinary(videoThumbnailPublicId);
  await deleteFromCloudinary(videoFilePublicId);
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $pull: {watchHistory: videoId},
    },
    {new: true}
  );

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(404, "Video not found for deletion");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
});


const togglePublishStatus = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(404, "Invalid video Id");
  }

  // First, find the video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Toggle the publish status
  video.isPublished = !video.isPublished;
  await video.save({validateBeforeSave: false});

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Video publish status toggled successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
