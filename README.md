# Asistente de Voz con IA usando OpenAI y Deepgram

Este proyecto implementa un asistente de voz para llamadas telefónicas utilizando las APIs de OpenAI para la inteligencia artificial conversacional y Deepgram para el procesamiento de voz (conversión de voz a texto y texto a voz).

## Características

- Recibe llamadas telefónicas a través de Twilio
- Transcribe el habla del usuario con Deepgram
- Procesa las consultas con OpenAI GPT
- Convierte las respuestas de texto a voz con Deepgram
- Maneja conversaciones naturales con interrupciones y pausas

## Tecnologías utilizadas

- TypeScript
- Node.js
- Express
- WebSockets
- OpenAI API
- Deepgram API
- Twilio

## Requisitos previos

- Node.js 14 o superior
- Cuenta de OpenAI con clave API
- Cuenta de Deepgram con clave API
- Cuenta de Twilio (para manejar llamadas telefónicas)
- ngrok o servicio similar para exponer puertos locales a Internet

## Configuración

1. Clona este repositorio
2. Instala las dependencias con `npm install`
3. Crea un archivo `.env` con las siguientes variables:

```
SERVER=tu-dominio-ngrok.ngrok-free.app
PORT=8000
OPENAI_API_KEY=tu-clave-api-openai
DEEPGRAM_API_KEY=tu-clave-api-deepgram
VOICE_MODEL=aura-asteria-en
```

4. Compila el código TypeScript con `npm run build`
5. Inicia el servidor con `npm start`

## Estructura del código

### `src/app.ts`

Archivo principal que:
- Configura el servidor Express con WebSockets
- Maneja las rutas para las llamadas entrantes de Twilio
- Coordina los servicios de IA, transcripción y síntesis de voz
- Gestiona el flujo de comunicación entre los diferentes componentes

### `src/services/gpt-service.ts`

Servicio que:
- Gestiona la comunicación con la API de OpenAI
- Mantiene el contexto de la conversación
- Procesa las respuestas del modelo GPT en fragmentos para habla natural
- Emite eventos con las respuestas para ser convertidas a voz

### `src/services/transcription-service.ts`

Servicio que:
- Conecta con la API de Deepgram para transcripción en tiempo real
- Procesa el audio entrante y lo convierte a texto
- Detecta pausas naturales en el habla para segmentar la transcripción
- Emite eventos con el texto transcrito

### `src/services/tts-service.ts`

Servicio que:
- Convierte texto a voz utilizando la API de Deepgram
- Gestiona los fragmentos de respuesta para una conversación natural
- Emite eventos con el audio generado para ser enviado al usuario

### `src/services/stream-service.ts`

Servicio que:
- Gestiona el envío de audio al usuario a través de WebSockets
- Maneja el orden correcto de los fragmentos de audio
- Controla los marcadores para detectar cuándo termina cada pieza de audio
- Permite manejo de interrupciones durante la conversación

## Funciones principales

| Archivo | Función | Descripción |
|---------|---------|-------------|
| gpt-service.ts | completion | Procesa mensajes del usuario y obtiene respuestas de GPT en streaming |
| transcription-service.ts | send | Envía audio a Deepgram para transcripción |
| tts-service.ts | generate | Convierte texto a voz utilizando Deepgram |
| stream-service.ts | buffer | Gestiona el orden de los fragmentos de audio |
| stream-service.ts | sendAudio | Envía audio al usuario y registra marcadores de finalización |
| app.ts | app.ws('/connection') | Maneja la conexión WebSocket para el audio de la llamada |

## Uso

1. Configura un número de Twilio para dirigir las llamadas a tu webhook (`https://tu-dominio.ngrok-free.app/incoming`)
2. Inicia el servidor y asegúrate de que ngrok esté exponiendo el puerto correcto
3. Realiza una llamada al número de Twilio configurado
4. Habla con el asistente, que está configurado como asistente para Bart's Automotive

## Personalización

El asistente viene configurado por defecto como un asistente para un taller automotriz, pero puede personalizarse modificando el mensaje del sistema en el constructor de `GptService`.