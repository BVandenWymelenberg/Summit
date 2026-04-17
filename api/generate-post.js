export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, sub } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are writing a LinkedIn post for Benjamin VandenWymelenberg, CEO of Woodchuck USA (American-made wood products, Minneapolis), Nature Link Resorts (luxury disconnect resort in Minnesota), and other ventures. He is a faith-driven entrepreneur, husband, father, and builder with a $100M vision.

Write a compelling LinkedIn post based on this prompt:
"${prompt}"
${sub ? `Additional context: ${sub}` : ''}

Style guide:
- First-person, authentic voice
- Short punchy sentences, especially at the start
- Use line breaks liberally for readability
- 150-300 words
- End with 3-4 relevant hashtags
- No em-dashes
- Real, specific, vulnerable — not corporate fluff
- Draw from his actual world: manufacturing, resorts, faith, family, AI tools, leadership transitions

Write only the post — no intro, no explanation.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    res.status(200).json({ post: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
