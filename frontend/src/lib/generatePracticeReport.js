// Generate practice summary report using Gemini API
import { aggregateNoteStats } from '../utils/audioUtils'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1'
const GEMINI_API_URL = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set in environment variables')
}

export async function generatePracticeReport(notes) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    throw new Error('No notes data available')
  }

  // Generate summary from notes using existing utility
  const summary = aggregateNoteStats(notes)
  
  // Calculate statistics for the report
  const totalNotes = summary.perNote.length
  const avgAccuracy = summary.metrics.averageEventAccuracy || 0
  const wellTunedCount = summary.perNote.filter(n => n.accuracy >= 90).length
  const needsWorkNotes = summary.perNote.filter(n => n.accuracy < 80).map(n => n.note)
  const bestNotes = summary.perNote
    .filter(n => n.accuracy >= 90)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map(n => n.note)
  
  // Convert data to descriptive text for Gemini
  const dataText = `
Practice Session Data:
- Total notes played: ${summary.metrics.totalEvents}
- Unique notes: ${totalNotes}
- Average accuracy: ${avgAccuracy}%
- Well-tuned notes (≥90%): ${wellTunedCount}/${totalNotes}

Note Performance Details:
${summary.perNote.map(n => `- ${n.note}: ${n.accuracy}% accuracy${n.avgCents !== null ? ` (${n.avgCents > 0 ? '+' : ''}${n.avgCents} cents deviation)` : ''}`).join('\n')}

Best performing notes (≥90% accuracy):
${bestNotes.length > 0 ? bestNotes.join(', ') : 'None'}

Notes needing improvement (<80%):
${needsWorkNotes.length > 0 ? needsWorkNotes.join(', ') : 'None'}
`

  const systemPrompt = `You are a professional violin instructor who writes concise practice summaries. Use only the provided data. Be supportive and specific.`

  const userPrompt = `Here is violin practice analysis data:
${dataText}

Generate a detailed practice summary report (max 1500 words) following this EXACT structure and format:

1. Practice Overview (1-2 sentences)
2. Key Metrics Snapshot (bullet points, 3-4 items)
3. Strengths (bullet points, 2-3 items)
4. Improvement Focus (bullet points, 2-3 items)
5. Suggested Next Practice (bullet points, 2-3 actionable steps)
6. AI Coach Comment (1 sentence)

IMPORTANT FORMATTING RULES:
- No emojis
- No markdown headers like ### or **
- Use clear section titles exactly as written above: "Practice Overview", "Key Metrics Snapshot", "Strengths", "Improvement Focus", "Suggested Next Practice", "AI Coach Comment"
- Use bullet points (• or -) for list items
- Write in plain text format
- Each section should be on a new line
- Use only the data provided. Do not invent or hallucinate any information.
- Be factual, supportive, and professional.

Example format:
Practice Overview
[1-2 sentences here]

Key Metrics Snapshot
• [First metric]
• [Second metric]
• [Third metric]
• [Fourth metric]

Strengths
• [First strength]
• [Second strength]
• [Third strength]

Improvement Focus
• [First area to improve]
• [Second area to improve]
• [Third area to improve]

Suggested Next Practice
• [First actionable step]
• [Second actionable step]
• [Third actionable step]

AI Coach Comment
[One sentence comment here]`

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 5000,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const reportText = data.candidates[0].content.parts[0].text
    return reportText

  } catch (error) {
    console.error('Error generating practice report:', error)
    throw error
  }
}

// Test function to verify Gemini API connection
export async function testGeminiAPI() {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables')
  }

  const testUrl = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  try {
    console.log('Testing Gemini API with model:', GEMINI_MODEL)
    console.log('Test URL:', testUrl.replace(GEMINI_API_KEY, '***'))
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'hello'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const testText = data.candidates[0].content.parts[0].text
    console.log('✅ Gemini API test successful! Response:', testText)
    return testText

  } catch (error) {
    console.error('❌ Error testing Gemini API:', error)
    throw error
  }
}

