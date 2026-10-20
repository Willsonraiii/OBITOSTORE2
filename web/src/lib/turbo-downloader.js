/**
 * High-Speed Parallel Turbo Downloader for Obito Studio
 *
 * Accelerates downloads across high-latency WAN / mobile connections by splitting
 * the video file into 4 parallel HTTP Range byte slices over HTTP/2.
 *
 * In supported desktop browsers (Chrome, Edge, Brave), chunks are written directly
 * to disk at their respective byte offsets using the File System Access API
 * (showSaveFilePicker) with ZERO memory consumption.
 *
 * In unsupported environments or small files, it uses stream assembly or falls back
 * smoothly to direct browser streaming.
 */

export function isTurboDownloadSupported() {
  if (typeof window === 'undefined') return false;
  // File System Access API for true 0-RAM disk streaming
  return typeof window.showSaveFilePicker === 'function';
}

export function formatDownloadSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

/**
 * Executes a 4-thread parallel chunked download directly to disk.
 */
export async function downloadWithTurbo({
  url,
  fileName,
  totalBytes,
  headers = {},
  concurrency = 4,
  onProgress,
  signal,
}) {
  if (!totalBytes || totalBytes <= 0) {
    throw new Error('Total bytes required for parallel slice calculation.');
  }

  // 1. Prompt user for save destination via native file picker
  let fileHandle = null;
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: 'Master Video (MP4)',
          accept: { 'video/mp4': ['.mp4'] },
        },
      ],
    });
  } catch (err) {
    // User cancelled file picker
    if (err.name === 'AbortError') {
      const abortErr = new Error('Download cancelled by user.');
      abortErr.isCancelled = true;
      throw abortErr;
    }
    throw err;
  }

  const writable = await fileHandle.createWritable({ keepExistingData: false });

  // 2. Compute range slices
  const numWorkers = Math.min(concurrency, Math.max(1, Math.floor(totalBytes / (2 * 1024 * 1024))));
  const sliceSize = Math.floor(totalBytes / numWorkers);
  const slices = [];

  for (let i = 0; i < numWorkers; i++) {
    const start = i * sliceSize;
    const end = i === numWorkers - 1 ? totalBytes - 1 : (i + 1) * sliceSize - 1;
    slices.push({ id: i, start, end, total: end - start + 1, loaded: 0 });
  }

  let totalLoaded = 0;
  let lastSampleTime = performance.now();
  let lastSampleBytes = 0;
  let currentSpeedBps = 0;

  const updateProgress = (bytesAdded = 0) => {
    totalLoaded += bytesAdded;
    const now = performance.now();
    const elapsed = (now - lastSampleTime) / 1000;

    if (elapsed >= 0.25) {
      const deltaBytes = totalLoaded - lastSampleBytes;
      const instantSpeed = deltaBytes / elapsed;
      currentSpeedBps = currentSpeedBps === 0 ? instantSpeed : currentSpeedBps * 0.7 + instantSpeed * 0.3;
      lastSampleTime = now;
      lastSampleBytes = totalLoaded;
    }

    if (onProgress) {
      const pct = Math.min(100, Math.round((totalLoaded / totalBytes) * 100));
      onProgress({
        loaded: totalLoaded,
        total: totalBytes,
        percent: pct,
        speedBps: currentSpeedBps,
        speedFormatted: formatDownloadSpeed(currentSpeedBps),
      });
    }
  };

  updateProgress(0);

  // 3. Worker task to stream a byte range slice directly into its file position
  const fetchAndWriteSlice = async (slice) => {
    const rangeHeader = `bytes=${slice.start}-${slice.end}`;
    const reqHeaders = {
      ...headers,
      Range: rangeHeader,
    };

    const res = await fetch(url, {
      headers: reqHeaders,
      signal,
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`Server returned HTTP ${res.status} for range ${rangeHeader}`);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = res.body.getReader();
    let currentPosition = slice.start;

    while (true) {
      if (signal?.aborted) {
        throw new Error('Download aborted');
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunkLength = value.byteLength;
      // Write chunk at exact disk position
      await writable.write({
        type: 'write',
        position: currentPosition,
        data: value,
      });

      currentPosition += chunkLength;
      slice.loaded += chunkLength;
      updateProgress(chunkLength);
    }
  };

  try {
    // Run parallel slice workers concurrently
    await Promise.all(slices.map((slice) => fetchAndWriteSlice(slice)));
    // Close & flush writable file stream
    await writable.close();

    if (onProgress) {
      onProgress({
        loaded: totalBytes,
        total: totalBytes,
        percent: 100,
        speedBps: currentSpeedBps,
        speedFormatted: formatDownloadSpeed(currentSpeedBps),
      });
    }
  } catch (error) {
    try {
      await writable.abort();
    } catch {}
    throw error;
  }
}
