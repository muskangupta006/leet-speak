const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function saveSession(userId, data) {
  const session = {
    userId,
    question: data.question,
    transcript: data.transcript,
    resume: data.resume || '',
    star: data.star,
    confidence: data.confidence,
    filler_words: data.filler_words,
    improved_script: data.improved_script,
    top_tip: data.top_tip,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const ref = await db.collection('sessions').add(session);
  return ref.id;
}

async function getUserSessions(userId) {
  const snapshot = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .orderBy('completedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

module.exports = { saveSession, getUserSessions, db };