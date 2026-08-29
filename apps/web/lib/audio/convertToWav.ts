// Convierte cualquier archivo/blob de audio que el navegador pueda decodificar (mp3,
// m4a, ogg, webm, wav, etc.) a WAV PCM 16-bit — formato único que se manda al backend,
// sin depender de ffmpeg ni ninguna librería externa (Convex no puede correr binarios
// nativos, así que la conversión tiene que pasar por acá, del lado del cliente).
//
// Uso: cuando el usuario sube un archivo de audio (input file) o graba con
// MediaRecorder, pasar el Blob/File por convertirAWav() antes de mandarlo a
// evaluarAudioAction / analizarContenidoAction.

export interface AudioWavConvertido {
  buffer: ArrayBuffer;
  mimeType: "audio/wav";
}

// Decodifica el archivo con la Web Audio API nativa del navegador — soporta todos los
// formatos que el propio navegador sepa reproducir, sin código de decodificación propio.
async function decodificarAudio(archivo: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await archivo.arrayBuffer();
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const contexto = new AudioContextCtor();
  try {
    return await contexto.decodeAudioData(arrayBuffer);
  } finally {
    await contexto.close();
  }
}

// Codifica un AudioBuffer decodificado como WAV PCM 16-bit — header RIFF/WAVE manual,
// sin librerías (es un formato simple, no vale la pena una dependencia para esto).
function codificarWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numeroCanales = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPorMuestra = 16;
  const bytesPorMuestra = bitsPorMuestra / 8;
  const bloqueAlineado = numeroCanales * bytesPorMuestra;
  const tasaBytes = sampleRate * bloqueAlineado;
  const cantidadMuestras = audioBuffer.length;
  const tamañoDatos = cantidadMuestras * bloqueAlineado;

  const buffer = new ArrayBuffer(44 + tamañoDatos);
  const vista = new DataView(buffer);

  function escribirString(offset: number, texto: string) {
    for (let i = 0; i < texto.length; i++) {
      vista.setUint8(offset + i, texto.charCodeAt(i));
    }
  }

  // Header RIFF/WAVE estándar de 44 bytes.
  escribirString(0, "RIFF");
  vista.setUint32(4, 36 + tamañoDatos, true);
  escribirString(8, "WAVE");
  escribirString(12, "fmt ");
  vista.setUint32(16, 16, true); // tamaño del sub-chunk fmt
  vista.setUint16(20, 1, true); // PCM sin comprimir
  vista.setUint16(22, numeroCanales, true);
  vista.setUint32(24, sampleRate, true);
  vista.setUint32(28, tasaBytes, true);
  vista.setUint16(32, bloqueAlineado, true);
  vista.setUint16(34, bitsPorMuestra, true);
  escribirString(36, "data");
  vista.setUint32(40, tamañoDatos, true);

  // Entrelaza los canales y convierte cada muestra float32 (-1..1) a PCM int16.
  const canales: Float32Array[] = [];
  for (let canal = 0; canal < numeroCanales; canal++) {
    canales.push(audioBuffer.getChannelData(canal));
  }

  let offset = 44;
  for (let muestra = 0; muestra < cantidadMuestras; muestra++) {
    for (let canal = 0; canal < numeroCanales; canal++) {
      const valor = Math.max(-1, Math.min(1, canales[canal][muestra]));
      const entero = valor < 0 ? valor * 0x8000 : valor * 0x7fff;
      vista.setInt16(offset, entero, true);
      offset += 2;
    }
  }

  return buffer;
}

// Punto de entrada público: recibe cualquier archivo/blob de audio y devuelve el WAV
// equivalente listo para mandar al backend.
export async function convertirAWav(archivo: File | Blob): Promise<AudioWavConvertido> {
  const audioBuffer = await decodificarAudio(archivo);
  return { buffer: codificarWav(audioBuffer), mimeType: "audio/wav" };
}
