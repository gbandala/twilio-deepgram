import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

export class StreamService extends EventEmitter {
  private ws: WebSocket;
  private expectedAudioIndex: number;
  private audioBuffer: Record<number, string>;
  private streamSid: string;

  // Inicializa la conexión websocket y el seguimiento de audio
  constructor(websocket: WebSocket) {
    super();
    this.ws = websocket;
    this.expectedAudioIndex = 0;    // Rastrea qué pieza de audio debe reproducirse a continuación
    this.audioBuffer = {};          // Almacena piezas de audio que llegan fuera de orden
    this.streamSid = '';           // ID único para el flujo de medios de esta llamada
  }

  setStreamSid(streamSid: string): void {
    this.streamSid = streamSid;
  }

  // Gestiona el orden de reproducción de audio
  buffer(index: number | null, audio: string): void {
    // El mensaje de bienvenida no tiene índice, se reproduce inmediatamente
    if(index === null) {
      this.sendAudio(audio);
    } 
    // Si esta es la siguiente pieza esperada, reproducirla y verificar si hay más
    else if(index === this.expectedAudioIndex) {
      this.sendAudio(audio);
      this.expectedAudioIndex++;

      // Reproduce cualquier pieza almacenada que ahora esté lista en secuencia
      while(Object.prototype.hasOwnProperty.call(this.audioBuffer, this.expectedAudioIndex)) {
        const bufferedAudio = this.audioBuffer[this.expectedAudioIndex];
        this.sendAudio(bufferedAudio);
        this.expectedAudioIndex++;
      }
    } 
    // Almacena piezas futuras hasta su turno
    else {
      this.audioBuffer[index] = audio;
    }
  }

  // Realmente envía audio al llamante a través de websocket
  sendAudio(audio: string): void {
    // Envía los datos de audio
    this.ws.send(
      JSON.stringify({
        streamSid: this.streamSid,
        event: 'media',
        media: {
          payload: audio,
        },
      })
    );

    // Crea y envía un marcador único para rastrear cuándo termina de reproducirse el audio
    const markLabel = uuidv4();
    this.ws.send(
      JSON.stringify({
        streamSid: this.streamSid,
        event: 'mark',
        mark: {
          name: markLabel
        }
      })
    );

    // Informa a otras partes del sistema que se envió el audio
    this.emit('audiosent', markLabel);
  }
}