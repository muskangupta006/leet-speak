require('dotenv').config();

const { saveSession, getUserSessions, db } = require('./firebase');
const admin = require('firebase-admin');

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const FEATHERLESS_KEY = process.env.FEATHERLESS_API_KEY;
const FEATHERLESS_URL = 'https://api.featherless.ai/v1/chat/completions';
const MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

function buildPrompt(question, transcript, resume) {
  return `
Interview question: "${question}"

Candidate resume:
${resume || 'No resume provided.'}

Candidate's spoken answer:
"${transcript}"

Return ONLY this JSON, no extra text, no markdown:
{
  "star": {
    "situation": { "rating": "strong or weak or missing", "score": 0-100, "feedback": "one sentence" },
    "task":      { "rating": "strong or weak or missing", "score": 0-100, "feedback": "one sentence" },
    "action":    { "rating": "strong or weak or missing", "score": 0-100, "feedback": "one sentence" },
    "result":    { "rating": "strong or weak or missing", "score": 0-100, "feedback": "one sentence" }
  },
  "confidence": {
    "score": 0-100,
    "label": "low or medium or high",
    "reasoning": "one sentence"
  },
  "filler_words": {
    "total": exact number,
    "breakdown": { "um": 0, "uh": 0, "like": 0, "you know": 0, "basically": 0, "literally": 0, "kind of": 0, "sort of": 0 }
  },
  "improved_script": "Rewritten answer in natural spoken English. No bullet points. Will be read aloud by ElevenLabs.",
  "top_tip": "The single most important thing to fix."
}

Rules:
- filler_words: count exact occurrences word by word, do not estimate
- confidence: low if hedging language, high if specific metrics and decisive tone
- star scores: 0=absent, 50=vague, 100=specific and compelling
- improved_script: use their resume details where relevant, write as natural speech
`;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/analyze', async (req, res) => {
  const { transcript, question, resume } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  try {
    const response = await axios.post(
      FEATHERLESS_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert behavioral interview coach. Return ONLY valid JSON, no explanation, no markdown backticks.',
          },
          {
            role: 'user',
            content: buildPrompt(question, transcript, resume),
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${FEATHERLESS_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let raw = response.data.choices[0].message.content;
    raw = raw.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    const result = JSON.parse(raw);
    res.json(result);

  } catch (err) {
    console.error('Error:', JSON.stringify(err.response?.data, null, 2));
    res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
});
// Save a session after analysis
app.post('/save-session', async (req, res) => {
  const { userId, questionId, question, transcript, resume, analysisResult } = req.body;

  
  try {
     const sessionId = await saveSession(userId, {
      questionId,
      question,
      transcript,
      resume,
      ...analysisResult
    });
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('Firebase error:', err.message);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Get all sessions for a user
app.get('/sessions/:userId', async (req, res) => {
  try {
    const sessions = await getUserSessions(req.params.userId);
    res.json(sessions);
  } catch (err) {
    console.error('Firebase error:', err.message);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

app.post('/complete-question', async (req, res) => {
  const { userId, questionId } = req.body;

  try {
    await db.collection('users').doc(userId).set({
      completedQuestions: admin.firestore.FieldValue.arrayUnion(questionId)
    }, { merge: true });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/completed-questions/:userId', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.userId).get();
    const data = doc.exists ? doc.data() : { completedQuestions: [] };
    res.json(data.completedQuestions || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/session-summary/:userId/:questionId', async (req, res) => {
  try {
    const { userId, questionId } = req.params;
    
    const snapshot = await db.collection('sessions')
      .where('userId', '==', userId)
      .where('questionId', '==', parseInt(questionId))
      .get();

    if (snapshot.empty) {
      return res.json(null);
    }

    const data = snapshot.docs[0].data();
    
    const s = data.star?.situation?.score || 0;
    const t = data.star?.task?.score      || 0;
    const a = data.star?.action?.score    || 0;
    const r = data.star?.result?.score    || 0;
    const c = data.confidence?.score      || 0;

    res.json({
      star: { situation: s, task: t, action: a, result: r },
      confidence: c,
      overall: Math.round((s + t + a + r + c) / 5)
    });
  } catch (err) {
    console.error('session-summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});



const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Analyze server running on http://localhost:${PORT}`);
});