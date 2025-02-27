import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema = new Schema({
    title:{
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    description: {
        type: String,
        trim: true,
        min: [12, "Minimum description of atleast 12 words is required"],
        max: [100, "Word limit exceeded"]
    },
    videoFile:{
        type: String,
        required: true
    },
    thumbnail:{
        type: String,
        required: true,
    },
    duration:{
        type: Number, // we get through cloudinary
        required: true
    },
    views:{
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    
},{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)

const Video = mongoose.model("Video", videoSchema)
export default Video