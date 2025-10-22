interface VideoGenerationParams {
  prompt: string;
  duration?: number;
  size?: string;
  endpoint: string;
  apiKey: string;
  deployment: string;
}

interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export async function generateVideo(params: VideoGenerationParams): Promise<string> {
  const { prompt, duration = 12, size = '1280x720', endpoint, apiKey, deployment } = params;

  // Create video generation job
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model: deployment,
      prompt,
      height: size.split('x')[1] || "720",
      width: size.split('x')[0] || "1280",
      n_seconds: duration.toString(),
      n_variants: "1"
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Video generation failed: ${error}`);
  }

  const job = await response.json();
  const jobId = job.id;

  // Poll for completion
  return pollJobStatus(jobId, endpoint, apiKey);
}

async function pollJobStatus(jobId: string, endpoint: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Give Azure a moment to register the job before first status check
    if (attempts === 0) {
      await new Promise((r) => setTimeout(r, 3000));
    }

    const [baseUrl, queryParams] = endpoint.split('?');
    const statusUrl = `${baseUrl.replace('/jobs', '')}/${jobId}${queryParams ? '?' + queryParams : ''}`;

    const response = await fetch(statusUrl, {
      headers: {
        'api-key': apiKey,
      },
    });

    // Azure can return 404 for a few seconds until the job is ready; keep polling
    if (response.status === 404) {
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to check job status: ${text || response.status}`);
    }

    const job: any = await response.json();

    if (job.status === 'completed' && job.videoUrl) {
      return job.videoUrl;
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Video generation failed');
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Video generation timed out');
}

export function saveVideoToLocal(videoUrl: string, prompt: string): void {
  const videos = getLocalVideos();
  videos.push({
    id: Date.now().toString(),
    url: videoUrl,
    prompt,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem('lemongrab_videos', JSON.stringify(videos));
}

export function getLocalVideos(): Array<{ id: string; url: string; prompt: string; timestamp: string }> {
  const stored = localStorage.getItem('lemongrab_videos');
  return stored ? JSON.parse(stored) : [];
}

export function deleteLocalVideo(id: string): void {
  const videos = getLocalVideos();
  const filtered = videos.filter(v => v.id !== id);
  localStorage.setItem('lemongrab_videos', JSON.stringify(filtered));
}
