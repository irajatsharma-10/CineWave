import mongoose, {Schema, model} from "mongoose"
const playListSchema = new Schema({
    name:{
        type: String,
    },
    description:{
        type: String,
    },
    videos: {
        type: mongoose.Types.ObjectId,
        ref: "Video"
    },
    owner:{
        type: mongoose.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

export const PlayList = model("PlayList",playListSchema)