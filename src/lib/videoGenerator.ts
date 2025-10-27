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
  audio?: boolean;
  inputReference?: File;
  remixVideoId?: string;
}

// Resize image to match the requested dimensions
async function resizeImage(file: File, targetWidth: number, targetHeight: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name, { type: file.type });
          resolve(resizedFile);
        } else {
          reject(new Error('Failed to create resized image blob'));
        }
      }, file.type);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export async function generateVideo(params: VideoGenerationParams, controller?: AbortController): Promise<{ blob: Blob; videoId?: string }> {
  const { 
    prompt, 
    duration = 12, 
    height = "720",
    width = "1280",
    variants = "1",
    endpoint, 
    apiKey, 
    deployment,
    onProgress,
    audio,
    inputReference,
    remixVideoId
  } = params;

  onProgress?.("Creating video generation job...");

  // Detect if using Sora 2 (OpenAI format) or Sora 1 (Azure format)
  const isSora2 = deployment.toLowerCase().includes('sora-2');

  // For Sora 2 remix, use different endpoint structure
  let requestEndpoint = endpoint;
  if (isSora2 && remixVideoId) {
    // Sora 2 remix uses: POST .../videos/{video_id}/remix
    const [baseUrl, queryParams] = endpoint.split('?');
    const root = baseUrl.replace(/\/videos$/, '');
    requestEndpoint = `${root}/videos/${remixVideoId}/remix${queryParams ? '?' + queryParams : ''}`;
  }

  // For Sora 2 with file uploads, use FormData; otherwise use JSON
  const needsFormData = isSora2 && inputReference;
  
  let requestBody: any;
  let fetchOptions: RequestInit;

  if (needsFormData) {
    // Use FormData for image-to-video mode
    const formData = new FormData();
    formData.append('model', deployment);
    formData.append('prompt', prompt);
    formData.append('size', `${width}x${height}`);
    formData.append('seconds', duration.toString());
    
    if (inputReference) {
      // Resize the image to match the requested dimensions
      onProgress?.("Resizing image to match video dimensions...");
      const targetWidth = parseInt(width);
      const targetHeight = parseInt(height);
      const resizedImage = await resizeImage(inputReference, targetWidth, targetHeight);
      formData.append('input_reference', resizedImage);
    }
    
    // For Sora 2, remix_video_id is in the URL, not the body
    // For Sora 1, keep it in the body
    if (remixVideoId && !isSora2) {
      formData.append('remix_video_id', remixVideoId);
    }

    fetchOptions = {
      method: 'POST',
      headers: {
        'api-key': apiKey,
      },
      body: formData,
    };
    
    requestBody = { note: 'FormData with file upload' };
  } else {
    // Use JSON for text-only requests
    if (isSora2 && remixVideoId) {
      // Sora 2 remix: Only send prompt parameter
      requestBody = {
        prompt,
      };
    } else if (isSora2) {
      // Sora 2 regular generation
      requestBody = {
        model: deployment,
        prompt,
        size: `${width}x${height}`,
        seconds: duration.toString(),
      };
    } else {
      // Sora 1 format
      requestBody = {
        model: deployment,
        prompt,
        height,
        width,
        n_seconds: duration.toString(),
        n_variants: variants,
      };
      
      // Add remix_video_id if provided (for Sora 1 only)
      if (remixVideoId) {
        requestBody.remix_video_id = remixVideoId;
      }
    }

    fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    };
  }

  try {
    onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'POST', url: requestEndpoint, body: requestBody, time: Date.now() })}`);
  } catch {}

  const response = await fetch(requestEndpoint, fetchOptions);

  const opLoc = response.headers.get('operation-location') || response.headers.get('Operation-Location');

  try {
    const preview = await response.clone().text();
    onProgress?.(`log:${JSON.stringify({ type: 'response', method: 'POST', url: requestEndpoint, status: response.status, headers: { 'operation-location': opLoc || null }, body: preview?.slice(0, 500), time: Date.now() })}`);
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
  const videoBlob = await pollJobStatus(jobId, endpoint, apiKey, onProgress, opLoc || undefined, isSora2);
  return { blob: videoBlob, videoId: jobId };
}

async function pollJobStatus(
  jobId: string, 
  endpoint: string, 
  apiKey: string,
  onProgress?: (status: string) => void,
  statusUrlOverride?: string,
  isSora2: boolean = false,
  controller?: AbortController,
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
    
    // Different URL structure for Sora 2 (OpenAI format) vs Sora 1 (Azure format)
    let computedStatusUrl: string;
    if (isSora2) {
      // Sora 2: /videos/{video_id}
      const root = baseUrl.replace(/\/videos$/, '');
      computedStatusUrl = `${root}/videos/${jobId}${queryParams ? '?' + queryParams : ''}`;
    } else {
      // Sora 1: /jobs/{id}
      const root = baseUrl.replace(/\/(jobs|tasks)$/, '');
      const statusBase = `${root}/jobs`;
      computedStatusUrl = `${statusBase}/${jobId}${queryParams ? '?' + queryParams : ''}`;
    }
    
    const statusUrl = statusUrlOverride || computedStatusUrl;
    console.info('[VideoGen] Polling status URL:', statusUrl, 'jobId:', jobId);
    try { onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'GET', url: statusUrl, time: Date.now() })}`); } catch {}
    const response = await fetch(statusUrl, {
      headers: {
        'api-key': apiKey,
      },
      signal: controller?.signal,
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

    // Sora 2 uses "completed", Sora 1 uses "succeeded"
    const isCompleted = isSora2 ? job.status === 'completed' : job.status === 'succeeded';
    
    if (isCompleted) {
      onProgress?.("Video generated! Downloading...");

      let videoUrl = '';
      
      if (isSora2) {
        // Sora 2: /videos/{video_id}/content
        const [baseUrl, queryParams] = endpoint.split('?');
        const root = baseUrl.replace(/\/videos$/, '');
        videoUrl = `${root}/videos/${jobId}/content${queryParams ? '?' + queryParams : ''}`;
      } else {
        // Sora 1: /video/generations/{generation_id}/content/video
        const generations = Array.isArray(job.generations) ? job.generations : [];
        const genId = generations[0]?.id;
        if (!genId) {
          try { onProgress?.(`log:${JSON.stringify({ type: 'meta', message: 'no_generation_id', jobId, time: Date.now(), job })}`); } catch {}
          throw new Error('Generation ID missing in job response');
        }

        if (statusUrlOverride) {
          const parts = statusUrl.split('?');
          const base = parts[0].replace(/\/jobs\/[^/]+$/, '');
          videoUrl = `${base}/${genId}/content/video${parts[1] ? '?' + parts[1] : ''}`;
        } else {
          const [baseUrl, queryParams] = endpoint.split('?');
          const root = baseUrl.replace(/\/(jobs|tasks)$/, '');
          videoUrl = `${root}/${genId}/content/video${queryParams ? '?' + queryParams : ''}`;
        }
      }

      console.info('[VideoGen] Computed video URL:', videoUrl);
      onProgress?.(`download_url:${videoUrl}`);
      try { onProgress?.(`log:${JSON.stringify({ type: 'request', method: 'GET', url: videoUrl, time: Date.now() })}`); } catch {}

      // Retry a few times if content isn't immediately available after success
      let videoResponse: Response | null = null;
      for (let i = 0; i < 5; i++) {
        const resp = await fetch(videoUrl, {
          headers: { 'api-key': apiKey },
        });
        videoResponse = resp;
        try { onProgress?.(`log:${JSON.stringify({ type: 'response', method: 'GET', url: videoUrl, status: resp.status, time: Date.now(), attempt: i + 1 })}`); } catch {}
        if (resp.status === 404) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break;
      }

      if (!videoResponse || !videoResponse.ok) {
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
      'queued': 'Job queued...',
      'in_progress': 'Generating video...',
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

// Cancel a video generation job
export async function cancelVideoJob(
  endpoint: string,
  apiKey: string,
  jobId: string,
  soraVersion: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[VideoGenerator] Attempting to cancel job ${jobId} with ${soraVersion}`);
    
    let cancelUrl: string;
    if (soraVersion === 'sora-2') {
      // Sora 2: DELETE /video-generator/jobs/{jobId}
      cancelUrl = `${endpoint}/video-generator/jobs/${jobId}`;
    } else {
      // Sora 1: DELETE on the job endpoint
      cancelUrl = `${endpoint}/openai/deployments/sora/generations/${jobId}`;
    }

    const response = await fetch(cancelUrl, {
      method: 'DELETE',
      headers: {
        'api-key': apiKey,
      },
    });

    if (response.ok) {
      console.log(`[VideoGenerator] Job ${jobId} canceled successfully`);
      return { success: true, message: 'Job canceled successfully' };
    } else {
      const errorText = await response.text();
      console.warn(`[VideoGenerator] Cancel request returned ${response.status}: ${errorText}`);
      return { success: false, message: `Cancel failed: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[VideoGenerator] Cancel error:', error);
    return { success: false, message: error.message || 'Cancel failed' };
  }
}

// Fetch list of videos from Azure API
export async function listVideos(
  endpoint: string,
  apiKey: string,
  limit: number = 20
): Promise<Array<{ id: string; status: string; model: string }>> {
  try {
    const [baseUrl, queryParams] = endpoint.split('?');
    const root = baseUrl.replace(/\/videos$/, '');
    const listUrl = `${root}/videos${queryParams ? '?' + queryParams : ''}${queryParams ? '&' : '?'}limit=${limit}&order=desc`;

    const response = await fetch(listUrl, {
      headers: { 'api-key': apiKey },
    });

    if (!response.ok) {
      console.error("Failed to fetch video list:", response.status);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching video list:", error);
    return [];
  }
}

// Legacy functions removed - using Appwrite storage now
