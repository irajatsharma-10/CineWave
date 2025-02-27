import mongoose, {Schema, model} from "mongoose"
const commentSchema = new Schema({
    content:{
        type: String,
        required: [true, "Please enter the valid comment"],
    },
    video: {
        type: mongoose.Types.ObjectId,
        ref: "Video"
    },
    owner:{
        type: mongoose.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

export const Comment = model("Comment",commentSchema)