interface VideoGenerationParams {
  prompt: string;
  duration?: number;
  height?: string;
  width?: string;
  variants?: string;
  endpoint: string;
  apiKey: string;
  deployment: string;
  onProgress?: (status: string) => void;
}

interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export async function generateVideo(params: VideoGenerationParams): Promise<Blob> {
  const { 
    prompt, 
    duration = 12, 
    height = "720",
    width = "1280",
    variants = "1",
    endpoint, 
    apiKey, 
    deployment,
    onProgress
  } = params;

  onProgress?.("Creating video generation job...");

  // Create video generation job
  const requestBody = {
    model: deployment,
    prompt,
    height,
    width,
    n_seconds: duration.toString(),
    n_variants: variants,
  };

  try {
    onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'POST', url: endpoint, body: requestBody, time: Date.now() })}`);
  } catch {}

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const opLoc = response.headers.get('operation-location') || response.headers.get('Operation-Location');

  try {
    const preview = await response.clone().text();
    onProgress?.(`log:${JSON.stringify({ type: 'response', method: 'POST', url: endpoint, status: response.status, headers: { 'operation-location': opLoc || null }, body: preview?.slice(0, 500), time: Date.now() })}`);
  } catch {}

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Video generation failed: ${error}`);
  }

  const job = await response.json();
  const jobId = job.id;

  console.info('[VideoGen] Job created with id:', jobId, 'endpoint:', endpoint);
  onProgress?.(`log:${JSON.stringify({ type: 'meta', message: 'Job created', jobId, operationLocation: opLoc || null, time: Date.now() })}`);
  // Prefer Operation-Location header if provided by Azure for polling
  onProgress?.("Job created. Waiting for processing...");

  // Poll for completion and get video
  return pollJobStatus(jobId, endpoint, apiKey, onProgress, opLoc || undefined);
}

async function pollJobStatus(
  jobId: string, 
  endpoint: string, 
  apiKey: string,
  onProgress?: (status: string) => void,
  statusUrlOverride?: string
): Promise<Blob> {
  const maxAttempts = 180; // 15 minutes max (progressive backoff)
  let attempts = 0;
  const baseDelayMs = 3000;

  while (attempts < maxAttempts) {
    // Give Azure a moment to register the job before first status check
    if (attempts === 0) {
      await new Promise((r) => setTimeout(r, 3000));
    }

    const [baseUrl, queryParams] = endpoint.split('?');
    // Azure status endpoint: use /jobs/{id} when endpoint ends with /jobs
    const root = baseUrl.replace(/\/(jobs|tasks)$/, '');
    const statusBase = `${root}/jobs`;
    const computedStatusUrl = `${statusBase}/${jobId}${queryParams ? '?' + queryParams : ''}`;
    const statusUrl = statusUrlOverride || computedStatusUrl;
    console.info('[VideoGen] Polling status URL:', statusUrl, 'jobId:', jobId);
    try { onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'GET', url: statusUrl, time: Date.now() })}`); } catch {}
    const response = await fetch(statusUrl, {
      headers: {
        'api-key': apiKey,
      },
    });
    try {
      const preview = await response.clone().text();
      onProgress?.(`log:${JSON.stringify({ type: 'response', method: 'GET', url: statusUrl, status: response.status, body: preview?.slice(0, 500), time: Date.now() })}`);
    } catch {}

    // Azure can return 404 for a few seconds until the job is ready; keep polling
    if (response.status === 404) {
      onProgress?.("Initializing job...");
      const delayMs = Math.min(15000, baseDelayMs + attempts * 1000);
      await new Promise((r) => setTimeout(r, delayMs));
      attempts++;
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to check job status: ${text || response.status}`);
    }

    const job: any = await response.json();
    console.info('[VideoGen] Status response:', job);
    try { onProgress?.(`log:${JSON.stringify({ type: 'meta', message: 'status', status: job.status, jobId, time: Date.now() })}`); } catch {}

    // Azure uses "succeeded" not "completed"
    if (job.status === 'succeeded') {
      onProgress?.("Video generated! Downloading...");
      
      // Fetch the actual video from the content endpoint
      let videoUrl = '';
      if (statusUrlOverride) {
        const parts = statusUrl.split('?');
        videoUrl = `${parts[0]}/content/video${parts[1] ? '?' + parts[1] : ''}`;
      } else {
        videoUrl = `${statusBase}/${jobId}/content/video${queryParams ? '?' + queryParams : ''}`;
      }
      console.info('[VideoGen] Computed video URL:', videoUrl, 'from statusBase:', statusBase);
      onProgress?.(`download_url:${videoUrl}`);
      console.info('[VideoGen] Video content URL:', videoUrl);
      try { onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'GET', url: videoUrl, time: Date.now() })}`); } catch {}
      const videoResponse = await fetch(videoUrl, {
        headers: {
          'api-key': apiKey,
        },
      });
      try { onProgress?.(`log:${JSON.stringify({ type: 'response', method: 'GET', url: videoUrl, status: videoResponse.status, time: Date.now() })}`); } catch {}

      if (!videoResponse.ok) {
        throw new Error('Failed to download generated video');
      }

      const videoBlob = await videoResponse.blob();
      return videoBlob;
    }

      if (job.status === 'failed') {
        try { onProgress?.(`log:${JSON.stringify({ type: 'meta', message: 'failed', error: job.error || null, jobId, time: Date.now() })}`); } catch {}
        throw new Error(job.error || 'Video generation failed');
      }

    // Update progress based on status
    const statusMessages: Record<string, string> = {
      'preprocessing': 'Preprocessing your request...',
      'running': 'Generating video...',
      'processing': 'Processing video...',
    };
    
    onProgress?.(statusMessages[job.status] || `Status: ${job.status}`);

    // Adaptive backoff before next poll
    const delayMs = Math.min(15000, baseDelayMs + attempts * 1000);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    attempts++;
  }

  onProgress?.(`log:${JSON.stringify({ type: 'meta', message: 'timeout', time: Date.now() })}`);
  throw new Error('Video generation timed out after 15 minutes');
}

// Legacy functions removed - using Appwrite storage now
