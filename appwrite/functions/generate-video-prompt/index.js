export default async ({ req, res, log, error }) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return res.send('', 200, corsHeaders);
  }

  // Safe JSON parser helper
  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  };

  try {
    log('=== Starting generate-video-prompt function ===');
    
    // CRITICAL: NEVER access req.bodyJson directly - it triggers JSON.parse on empty strings and causes 500 errors
    // Instead, safely parse req.body and req.bodyText manually
    
    const rawBody = req.body;
    const bodyText = typeof req.bodyText === 'string' ? req.bodyText : '';
    
    log(`req.body typeof: ${typeof rawBody}; ${typeof rawBody === 'string' ? 'length: ' + rawBody.length : 'is object'}`);
    log(`req.bodyText length: ${bodyText.length}`);
    
    let payload = {};
    
    // Parse the request body safely
    if (rawBody && typeof rawBody === 'object') {
      log('✓ Step 1: req.body is already an object');
      payload = rawBody;
    } else if (typeof rawBody === 'string' && rawBody.trim()) {
      log('✓ Step 1: Parsing req.body string');
      const parsed = safeParse(rawBody);
      if (!parsed) {
        log('✗ Step 1: Invalid JSON in req.body');
        return res.json({ error: 'Invalid JSON in request body' }, 400, corsHeaders);
      }
      payload = parsed;
    } else if (bodyText.trim()) {
      log('✓ Step 1: Parsing req.bodyText');
      const parsed = safeParse(bodyText);
      if (!parsed) {
        log('✗ Step 1: Invalid JSON in req.bodyText');
        return res.json({ error: 'Invalid JSON in request body' }, 400, corsHeaders);
      }
      payload = parsed;
    } else {
      log('✗ Step 1: No usable body found');
      return res.json({ 
        error: 'Empty request body. When using /executions, send { data: JSON.stringify(payload) }.' 
      }, 400, corsHeaders);
    }
    
    log(`Payload keys: ${Object.keys(payload).join(', ')}`);
    
    // Handle Appwrite SDK execution format (payload.data field contains the actual data)
    let input = {};
    if (payload && typeof payload === 'object' && 'data' in payload) {
      log('✓ Step 2: Found payload.data field');
      if (typeof payload.data === 'string') {
        if (!payload.data.trim()) {
          log('✗ Step 2: payload.data is empty string');
          return res.json({ error: 'Empty data string' }, 400, corsHeaders);
        }
        log('✓ Step 2: Parsing payload.data string');
        const parsed = safeParse(payload.data);
        if (!parsed) {
          log('✗ Step 2: Invalid JSON in payload.data');
          return res.json({ error: 'Invalid JSON in data field' }, 400, corsHeaders);
        }
        input = parsed;
      } else if (payload.data && typeof payload.data === 'object') {
        log('✓ Step 2: payload.data is already an object');
        input = payload.data;
      } else {
        log('✗ Step 2: payload.data is neither string nor object');
        input = {};
      }
    } else {
      log('✓ Step 2: No data field, using payload directly');
      input = payload;
    }
    
    log(`Input keys: ${Object.keys(input).join(', ')}`);
    
    if (!input || Object.keys(input).length === 0) {
      log('✗ Step 2: Input is empty after parsing');
      return res.json({ error: 'Empty request body' }, 400, corsHeaders);
    }


    // Extract fields with defaults
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
    } = input || {};

    log('Extracted fields - subject:', subject, 'action:', action);

    // Validate required fields
    if (!subject || !action) {
      log('Validation failed - subject:', subject, 'action:', action);
      return res.json(
        { error: 'Subject and Action are required fields' },
        400,
        corsHeaders
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
        corsHeaders
      );
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      return res.json(
        { error: 'No prompt generated' },
        500,
        corsHeaders
      );
    }

    log('Successfully generated prompt');

    return res.json(
      { prompt: generatedPrompt },
      200,
      corsHeaders
    );
  } catch (err) {
    error('Error in generate-video-prompt function:', err);
    return res.json(
      { error: err.message || 'Internal server error' },
      500,
      corsHeaders
    );
  }
};
