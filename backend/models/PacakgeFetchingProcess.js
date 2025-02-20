import mongoose from "mongoose";

const packageFetchingProcessSchema = new mongoose.Schema({
    packageName: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const PackageFetchingProcess = mongoose.model('PackageFetchingProcess', packageFetchingProcessSchema);

export default PackageFetchingProcess;