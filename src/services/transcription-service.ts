import 'colors';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'events';

// Tipo para la conexión de Deepgram
interface DeepgramConnection {
  on: (event: string, callback: (...args: any[]) => void) => void;
  send: (data: Buffer) => void;
  getReadyState: () => number;
}

export class TranscriptionService extends EventEmitter {
  private dgConnection: DeepgramConnection;
  private finalResult: string;
  private speechFinal: boolean;

  constructor() {
    super();
    // Configura la conexión a Deepgram con la clave API
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

    // Configura los ajustes de transcripción en vivo
    this.dgConnection = deepgram.listen.live({
      encoding: 'mulaw',             // Tipo de codificación de audio
      sample_rate: 8000,             // Calidad de llamada telefónica (como número)
      model: 'nova-2',               // Modelo Deepgram a utilizar
      punctuate: true,               // Añadir puntuación
      interim_results: true,         // Obtener resultados parciales
      endpointing: 200,              // Detectar finales de discurso
      utterance_end_ms: 1000         // Tiempo de espera para el final de la expresión
    }) as unknown as DeepgramConnection;

    this.finalResult = '';           // Almacena la transcripción completa
    this.speechFinal = false;        // Rastrea si el hablante ha terminado naturalmente

    // Cuando se abre la conexión, configura todos los manejadores de eventos
    this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
      // Maneja los fragmentos de transcripción entrantes
      this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent: any) => {
        const alternatives = transcriptionEvent.channel?.alternatives;
        let text = '';
        if (alternatives) {
          text = alternatives[0]?.transcript || '';
        }

        // Maneja el final de la expresión (el hablante dejó de hablar)
        if (transcriptionEvent.type === 'UtteranceEnd') {
          if (!this.speechFinal) {
            console.log(`UtteranceEnd received before speechFinal, emit the text collected so far: ${this.finalResult}`.yellow);
            this.emit('transcription', this.finalResult);
            return;
          } else {
            console.log('STT -> Speech was already final when UtteranceEnd recevied'.yellow);
            return;
          }
        }

        // Maneja las piezas de transcripción finales
        if (transcriptionEvent.is_final === true && text.trim().length > 0) {
          this.finalResult += ` ${text}`;

          // Si el hablante hizo una pausa natural, envía la transcripción
          if (transcriptionEvent.speech_final === true) {
            this.speechFinal = true;  // Previene envíos duplicados
            this.emit('transcription', this.finalResult);
            this.finalResult = '';
          } else {
            // Reinicia para la siguiente expresión
            this.speechFinal = false;
          }
        } else {
          // Emite resultados provisionales para retroalimentación en tiempo real
          this.emit('utterance', text);
        }
      });

      // Eventos de manejo de errores
      this.dgConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('STT -> deepgram error');
        console.error(error);
      });

      // Manejo de advertencias (usando string en lugar de enum que no existe)
      this.dgConnection.on('warning', (warning: any) => {
        console.error('STT -> deepgram warning');
        console.error(warning);
      });

      // Manejo de metadatos
      this.dgConnection.on(LiveTranscriptionEvents.Metadata, (metadata: any) => {
        console.error('STT -> deepgram metadata');
        console.error(metadata);
      });

      this.dgConnection.on(LiveTranscriptionEvents.Close, () => {
        console.log('STT -> Deepgram connection closed'.yellow);
      });
    });
  }

  // Envía datos de audio a Deepgram para transcripción
  send(payload: string): void {
    // Verifica si la conexión está abierta (1 = OPEN en WebSocket)
    if (this.dgConnection.getReadyState() === 1) {
      this.dgConnection.send(Buffer.from(payload, 'base64'));
    }
  }
}