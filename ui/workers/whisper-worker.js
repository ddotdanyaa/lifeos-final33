// П-B WHISPER_LOCAL_STT: dedicated module worker so the model download and CPU-bound
// inference never block the UI thread. Speaks a tiny postMessage protocol to app.js:
//   in:  {type:"prepare"} | {type:"transcribe", requestId, audio:Float32Array, language}
//   out: {type:"progress", info} | {type:"ready"} | {type:"result", requestId, text}
//        | {type:"error", requestId?, message}

let pipelinePromise = null;

function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = import("../../node_modules/@huggingface/transformers/dist/transformers.min.js").then((mod) => {
      mod.env.allowLocalModels = false;
      return mod.pipeline("automatic-speech-recognition", "Xenova/whisper-base", {
        progress_callback: (info) => postMessage({ type: "progress", info })
      });
    });
  }
  return pipelinePromise;
}

self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type === "prepare") {
    try {
      await getPipeline();
      postMessage({ type: "ready" });
    } catch (error) {
      postMessage({ type: "error", message: String((error && error.message) || error) });
    }
    return;
  }
  if (data.type === "transcribe") {
    const { requestId, audio, language } = data;
    try {
      const transcriber = await getPipeline();
      const result = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: language || undefined,
        task: "transcribe",
        return_timestamps: true
      });
      postMessage({ type: "result", requestId, text: (result && result.text) || "" });
    } catch (error) {
      postMessage({ type: "error", requestId, message: String((error && error.message) || error) });
    }
  }
};
