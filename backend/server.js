require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Google clients
const speechClient = new speech.SpeechClient();
const storage = new Storage();
const bucket = storage.bucket(process.env.BUCKET_NAME);

// Basic API route
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from the backend! The API is working correctly.',
    timestamp: new Date().toISOString(),
  });
});

// Optional: test that GCS auth works
app.get('/api/test-storage', async (req, res) => {
  try {
    const [files] = await bucket.getFiles({ maxResults: 5 });
    res.json({
      success: true,
      bucket: process.env.BUCKET_NAME,
      files: files.map(file => file.name),
    });
  } catch (error) {
    console.error('Storage test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    console.log('Uploaded file info:', req.file);

    // Upload original audio to Google Cloud Storage
    const gcsFileName = `audio/${Date.now()}-${req.file.originalname || 'recording.webm'}`;
    await bucket.upload(filePath, {
      destination: gcsFileName,
    });

    console.log(`Uploaded to GCS: ${gcsFileName}`);

    // Read file locally for transcription
    const fileBuffer = fs.readFileSync(filePath);
    const audioBytes = fileBuffer.toString('base64');

    const request = {
        audio: {
            uri: `gs://${process.env.BUCKET_NAME}/${gcsFileName}`, 
        },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
      },
    };

    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();

    console.log('Full speech response:', JSON.stringify(response, null, 2));

    const transcript = (response.results || [])
      .map(r => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    // Optional: save transcript to GCS too
    const transcriptFileName = `transcripts/${Date.now()}.txt`;
    await bucket.file(transcriptFileName).save(transcript, {
      contentType: 'text/plain',
    });

    fs.unlinkSync(filePath);

    res.json({
      transcript,
      rawResultsCount: response.results?.length || 0,
      audioFile: gcsFileName,
      transcriptFile: transcriptFileName,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      error: 'Transcription failed',
      details: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Try accessing http://localhost:${PORT}/api/data in your browser`);
});