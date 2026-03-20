import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Allow anonymous analyses
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
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
        publicId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        analysisTime: {
            type: Number,
            default: 0, // Time in milliseconds
        },
        imageUrl: {
            type: String, // Optional: store image URL if saved to cloud storage
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        tags: [{
            type: String,
            trim: true,
        }],
    },
    { 
        timestamps: true,
        // Add index for faster queries
        index: { userId: 1, createdAt: -1 },
        index: { publicId: 1 }
    }
);

// Generate unique public ID before saving
analysisSchema.pre('save', async function() {
    if (this.isNew && !this.publicId) {
        // Generate a short, unique ID
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        this.publicId = `drishti_${timestamp}_${random}`;
    }
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
