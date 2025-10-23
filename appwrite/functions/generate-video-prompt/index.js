export default async ({ req, res, log, error }) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.json({ ok: true }, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Appwrite-Project',
    });
  }

  try {
    // Parse the request body - Appwrite may send it as string or object
    let payload = req.body;
    
    // Step 1: Parse if string
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
        log('Parsed string body to object');
      } catch (parseError) {
        log('Failed to parse request body string:', payload);
        return res.json(
          { error: 'Invalid JSON in request body' },
          400,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    log('Step 1 - Payload after initial parse:', JSON.stringify(payload));

    // Step 2: Extract from 'data' field if present
    let input = payload;
    if (payload && typeof payload === 'object' && payload.data !== undefined) {
      log('Found data field, type:', typeof payload.data);
      
      // If data is a string, parse it
      if (typeof payload.data === 'string') {
        try {
          input = JSON.parse(payload.data);
          log('Parsed data string to object');
        } catch (e) {
          log('Failed to parse payload.data as JSON:', payload.data);
          return res.json(
            { error: 'Invalid JSON in data field' },
            400,
            { 'Access-Control-Allow-Origin': '*' }
          );
        }
      } else {
        // data is already an object
        input = payload.data;
      }
    }

    log('Step 2 - Final input object:', JSON.stringify(input));

    const {
      subject = '',
      action = '',
      environment = '',
      lighting = '',
      camera_shot = '',
      camera_angle = '',
      camera_movement = '',
      style = '',
      details = '',
    } = input;

    log('Extracted fields - subject:', subject, 'action:', action);

    // Validate required fields
    if (!subject || !action) {
      log('Validation failed - subject:', subject, 'action:', action);
      return res.json(
        { error: 'Subject and Action are required fields' },
        400,
        { 'Access-Control-Allow-Origin': '*' }
      );
    }

    // Build system prompt
    const systemPrompt = `You are an expert AI Video Prompt Engineer and Creative Director. Your sole purpose is to convert a user's structured inputs into a single, cohesive, and evocative prompt for a generative video model like Sora.

Your Task: Take the following user-provided context and synthesize it into a single, flowing paragraph.

User Subject: ${subject}
User Action: ${action}
User Environment: ${environment}
User Lighting: ${lighting}
User Camera Shot: ${camera_shot}
User Camera Angle: ${camera_angle}
User Camera Movement: ${camera_movement}
User Style: ${style}
User Details: ${details}

Rules for Output:

1. Synthesize, Don't List: Do NOT just list the inputs. Weave them into a natural, descriptive scene description.

2. Emphasize Cinematography: The camera instructions (shot, angle, movement) are critical. Start the prompt with them (e.g., "A cinematic close-up shot..." or "A sweeping drone shot...").

3. Be Descriptive and Evocative: Use strong adjectives and describe the atmosphere, mood, and textures.

4. Connect Subject and Environment: Describe how the subject is interacting with the environment and the lighting.

5. Single Paragraph: The output must be one single, coherent paragraph. Do not use bullet points.

Example:

User Inputs:
Subject: "A small, futuristic delivery drone"
Action: "Navigating busy city traffic"
Environment: "A neon-lit cyberpunk city at night with flying vehicles"
Lighting: "Rainy, with reflections on wet streets"
Camera Shot: "Medium shot"
Camera Movement: "Tracking the drone"

Your Correct Output: "A cinematic medium shot tracks a small, futuristic delivery drone as it expertly navigates through the chaotic, multi-layered traffic of a neon-lit cyberpunk city. It is night, and a steady rain falls, causing the glowing advertisements on the towering skyscrapers to cast vibrant, distorted reflections on the wet surfaces of flying vehicles and the streets far below."

Now generate the prompt based on the user inputs provided above.`;

    // Call GPT-5 API
    const apiEndpoint = 'https://flowfi.cognitiveservices.azure.com/openai/deployments/gpt-5/chat/completions?api-version=2025-01-01-preview';
    const apiKey = '9zMZdd9AnkTcDvxT6MnDYfPopybq0Pydkwv6ihDRURqUTwWC5QlMJQQJ99BIACYeBjFXJ3w3AAAAACOGUgI4';

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      error('GPT-5 API error:', response.status, errorText);
      return res.json(
        { error: `GPT-5 API error: ${response.status}` },
        500,
        { 'Access-Control-Allow-Origin': '*' }
      );
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      return res.json(
        { error: 'No prompt generated' },
        500,
        { 'Access-Control-Allow-Origin': '*' }
      );
    }

    log('Successfully generated prompt');

    return res.json(
      { prompt: generatedPrompt },
      200,
      { 'Access-Control-Allow-Origin': '*' }
    );
  } catch (err) {
    error('Error in generate-video-prompt function:', err);
    return res.json(
      { error: err.message || 'Internal server error' },
      500,
      { 'Access-Control-Allow-Origin': '*' }
    );
  }
};
