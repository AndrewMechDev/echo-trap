// El worklet se carga como Blob desde el cliente porque Next no sirve un
// archivo TypeScript directamente al AudioWorkletGlobalScope.
export const AUDIO_WORKLET_SOURCE = `
  class EchoTrapVadProcessor extends AudioWorkletProcessor {
    process(inputs) {
      const input = inputs[0];
      if (input && input[0] && input[0].length) {
        this.port.postMessage(new Float32Array(input[0]));
      }
      return true;
    }
  }
  registerProcessor("echo-trap-vad", EchoTrapVadProcessor);
`;
