import 'dotenv/config';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'events';
import fetch from 'node-fetch';

// Interfaz para las respuestas parciales de GPT
interface GptReply {
  partialResponseIndex: number | null;
  partialResponse: string;
}

export class TextToSpeechService extends EventEmitter {
  private nextExpectedIndex: number;
  private speechBuffer: Record<number, string>;

  constructor() {
    super();
    this.nextExpectedIndex = 0;      // Rastrea el orden de los fragmentos de voz
    this.speechBuffer = {};          // Almacena piezas de voz
  }

  // Convierte texto a voz usando la API de Deepgram
  async generate(gptReply: GptReply, interactionCount: number): Promise<void> {
    const { partialResponseIndex, partialResponse } = gptReply;

    // Omite si no hay texto para convertir
    if (!partialResponse) { return; }

    try {
      // Llama a la API de texto a voz de Deepgram
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${process.env.VOICE_MODEL}&encoding=mulaw&sample_rate=8000&container=none`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: partialResponse,
          }),
        }
      );

      // Maneja la respuesta exitosa
      if (response.status === 200) {
        try {
          // Convierte la respuesta de audio al formato base64
          const blob = await response.blob();
          const audioArrayBuffer = await blob.arrayBuffer();
          const base64String = Buffer.from(audioArrayBuffer).toString('base64');

          // Envía el audio para ser reproducido
          this.emit('speech', partialResponseIndex, base64String, partialResponse, interactionCount);
        } catch (err) {
          console.log(err);
        }
      } else {
        console.log('Deepgram TTS error:');
        console.log(response);
      }
    } catch (err) {
      console.error('Error occurred in TextToSpeech service');
      console.error(err);
    }
  }
}