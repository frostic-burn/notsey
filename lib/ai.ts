export const generateShortAIAnalysis = async (title: string, content: string): Promise<string> => {
  try {
    const noteText = content.replace(/<[^>]*>/g, "")
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": "AIzaSyBwva7OjbZMXFR_rV9CKrqcRreJ9kLK6L4",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a supportive friend. Analyze this note in 1-2 short sentences. Be empathetic but concise. Focus on the main emotion or theme. Don't over-explain.

Title: "${title}"
Content: ${noteText}

Examples of good responses:
- "You seem stressed about work — maybe time to pause?"
- "This feels hopeful today. Good energy here."
- "Lots of planning happening. You're getting organized."
- "Sounds overwhelming. Want to break it down?"

Keep it short, human, and caring.`,
                },
              ],
            },
          ],
        }),
      },
    )

    const data = await response.json()

    if (data.candidates?.[0]?.content) {
      return data.candidates[0].content.parts[0].text.trim()
    } else {
      return "Couldn't analyze this note right now."
    }
  } catch (error) {
    return "Error analyzing note. Try again later."
  }
}

export const generateContextualReply = async (
  title: string,
  content: string,
  previousMessages: any[],
): Promise<string> => {
  try {
    const noteText = content.replace(/<[^>]*>/g, "")
    const conversationHistory = previousMessages
      .slice(-3) // Only last 3 messages for context
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": "AIzaSyBwva7OjbZMXFR_rV9CKrqcRreJ9kLK6L4",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You're continuing a conversation about this note. The note was edited, so give a short update.

Previous conversation:
${conversationHistory}

Updated note - Title: "${title}"
Content: ${noteText}

Give a brief, contextual response about what changed. 1-2 sentences max. Be supportive and observant.

Examples:
- "The tone feels lighter now — seems like you're feeling better."
- "You added more details. Getting clearer on your thoughts?"
- "This sounds more decisive than before."`,
                },
              ],
            },
          ],
        }),
      },
    )

    const data = await response.json()

    if (data.candidates?.[0]?.content) {
      return data.candidates[0].content.parts[0].text.trim()
    } else {
      return "Something changed in your note."
    }
  } catch (error) {
    return "Noticed some changes here."
  }
}
