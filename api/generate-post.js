export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, sub } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });
  }

  const systemPrompt = `You are writing a LinkedIn post for Benjamin VandenWymelenberg — CEO of Woodchuck USA (American-made laser-engraved wood products, Minneapolis), Nature Link Resorts (luxury disconnect resort in northern Minnesota), and other ventures. He is a faith-driven entrepreneur, husband, father, and builder with a $100M vision.

Style guide:
- First-person, authentic voice — sounds like a real person, not a brand
- Short punchy sentences, especially at the start
- Use line breaks generously for LinkedIn readability
- 150-300 words total
- End with 3-5 relevant hashtags on their own line
- No em-dashes
- Real, specific, vulnerable — not corporate fluff
- Draw from his actual world: American manufacturing, resort development, faith, family, AI tools, the CEO transition from founder to leader
- Start with the strongest possible hook line

Write ONLY the post — no intro, no explanation, no quotation marks around it.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Write a LinkedIn post based on this prompt: "${prompt}"${sub ? `\n\nAdditional context: ${sub}` : ''}`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Anthropic API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'Empty response from API' });
    }

    res.status(200).json({ post: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
