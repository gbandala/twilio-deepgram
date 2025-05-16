// Importa los paquetes y servicios requeridos
import 'dotenv/config';
import 'colors';
import express, { Application } from 'express';
import * as expressWsModule from 'express-ws';
import { twiml } from 'twilio';
import { WebSocket } from 'ws';
import { GptService } from './services/gpt-service';
import { StreamService } from './services/stream-service';
import { TranscriptionService } from './services/transcription-service';
import { TextToSpeechService } from './services/tts-service';

// Configura Express con soporte para WebSocket
const app: Application = express();
// Aplicar expressWs a la app y obtener la instancia que incluye ws
const expressWsInstance = expressWsModule.default(app);
// Obtener la aplicación con soporte WebSocket
const appWs = expressWsInstance.app;

// Interfaz para mensajes de Twilio
interface TwilioMessage {
  event: string;
  start?: {
    streamSid: string;
    callSid: string;
  };
  media?: {
    payload: string;
  };
  mark?: {
    name: string;
  };
  sequenceNumber?: number;
}

// Maneja las llamadas entrantes desde Twilio
app.post('/incoming', (req, res) => {
  try {
    const VoiceResponse = twiml.VoiceResponse;
    const response = new VoiceResponse();
    const connect = response.connect();
    // Indica a Twilio dónde conectar el flujo de medios de la llamada
    connect.stream({ url: `wss://${process.env.SERVER}/connection` });
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    console.log(err);
  }
});

// Maneja la conexión WebSocket para el audio de la llamada
appWs.ws('/connection', (ws: WebSocket) => {
  try {
    ws.on('error', console.error);

    // Variables para rastrear la llamada y su audio
    let streamSid: string;
    let callSid: string;
    const gptService = new GptService();
    const streamService = new StreamService(ws);
    const transcriptionService = new TranscriptionService();
    const ttsService = new TextToSpeechService();
    let marks: string[] = [];         // Rastrea marcadores de finalización de audio
    let interactionCount = 0;         // Cuenta intercambios de ida y vuelta

    // Maneja los mensajes entrantes de Twilio
    ws.on('message', function message(data: Buffer | ArrayBuffer | Buffer[]) {
      const msg: TwilioMessage = JSON.parse(data.toString());

      if (msg.event === 'start' && msg.start) {
        // Llamada iniciada - configura IDs y envía mensaje de bienvenida
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        streamService.setStreamSid(streamSid);
        gptService.setCallSid(callSid);
        console.log(`Twilio -> Starting Media Stream for ${streamSid}`.underline.red);
        ttsService.generate({partialResponseIndex: null, partialResponse: 'Welcome to Bart\'s Automotive. • How can I help you today?'}, 0);
      } 
      else if (msg.event === 'media' && msg.media) {
        // Recibió audio del llamante - envía a transcripción
        transcriptionService.send(msg.media.payload);
      } 
      else if (msg.event === 'mark' && msg.mark) {
        // Pieza de audio terminó de reproducirse
        const label = msg.mark.name;
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red);
        marks = marks.filter(m => m !== label);
      } 
      else if (msg.event === 'stop') {
        // Llamada finalizada
        console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
      }
    });

    // Maneja interrupciones (llamante hablando mientras el asistente está hablando)
    transcriptionService.on('utterance', async (text: string) => {
      if(marks.length > 0 && text?.length > 5) {
        console.log('Twilio -> Interruption, Clearing stream'.red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'clear',
          })
        );
      }
    });

    // Procesa texto transcrito a través de GPT
    transcriptionService.on('transcription', async (text: string) => {
      if (!text) { return; }
      console.log(`Interaction ${interactionCount} – STT -> GPT: ${text}`.yellow);
      gptService.completion(text, interactionCount);
      interactionCount += 1;
    });

    // Envía la respuesta de GPT a texto-a-voz
    gptService.on('gptreply', async (gptReply: any, icount: number) => {
      console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green );
      ttsService.generate(gptReply, icount);
    });

    // Envía el habla convertida al llamante
    ttsService.on('speech', (responseIndex: number | null, audio: string, label: string, icount: number) => {
      console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
      streamService.buffer(responseIndex, audio);
    });

    // Rastrea cuando se envían piezas de audio
    streamService.on('audiosent', (markLabel: string) => {
      marks.push(markLabel);
    });
  } catch (err) {
    console.log(err);
  }
});

export default app;