import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
    packageName: {
        type: String,
        required: true,
    },
    appName: {
        type: String,
        required: true,
    },
    base64Image: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Package = mongoose.model('Package', packageSchema);

export default Package;