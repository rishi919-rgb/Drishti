import mongoose from 'mongoose';

const drishtiAnalysisSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Optional for anonymous analyses
        },
        imageBase64: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        detectedText: {
            type: String,
            trim: true,
            default: '',
        },
        currency: {
            type: String,
            trim: true,
            default: '',
        },
        prompt: {
            type: String,
            trim: true,
            default: '',
        },
        publicId: {
            type: String,
            unique: true,
            required: true,
        },
        analysisTime: {
            type: Number,
            default: 0, // Time taken for analysis in milliseconds
        },
        ipAddress: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

// Generate a unique public ID before saving
drishtiAnalysisSchema.pre('save', function() {
    if (!this.publicId) {
        this.publicId = generatePublicId();
    }
});

// Helper function to generate public ID
function generatePublicId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Index for faster queries
drishtiAnalysisSchema.index({ user: 1, createdAt: -1 });
drishtiAnalysisSchema.index({ publicId: 1 });

const DrishtiAnalysis = mongoose.model('DrishtiAnalysis', drishtiAnalysisSchema);

export default DrishtiAnalysis;
