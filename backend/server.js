const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const multer = require("multer");
const fs = require("fs");
const speech = require("@google-cloud/speech");

// Middleware
app.use(cors()); // Allow frontend to make requests
app.use(express.json()); // Parse JSON bodies

// File upload setup
const upload = multer({ dest: "uploads/" });

// Google Speech client
const speechClient = new speech.SpeechClient();

// Basic API route
app.get('/api/data', (req, res) => {
    // You and your friends can expand this route to connect to a database, etc.
    res.json({
        message: 'Hello from the backend! The API is working correctly.',
        timestamp: new Date().toISOString()
    });
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("Uploaded file info:", req.file);

        const filePath = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);
        const audioBytes = fileBuffer.toString("base64");

        const request = {
            audio: {
                content: audioBytes,
            },
            config: {
                encoding: "WEBM_OPUS",
                sampleRateHertz: 48000,
                languageCode: "en-US",
                enableAutomaticPunctuation: true,
            }
        };

        const [response] = await speechClient.recognize(request);

        console.log("Full speech response:", JSON.stringify(response, null, 2));

        const transcript = (response.results || [])
            .map(r => r.alternatives?.[0]?.transcript || "")
            .join(" ")
            .trim();

        fs.unlinkSync(filePath);

        res.json({ transcript, rawResultsCount: response.results?.length || 0 });

    } catch (error) {
        console.error("Transcription error:", error);

        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: "Transcription failed",
            details: error.message,
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Try accessing http://localhost:${PORT}/api/data in your browser`);
});
