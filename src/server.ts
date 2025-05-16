import app from './app';
import 'dotenv/config';
import 'colors';
import logger from './utils/logger';
// Obtener puerto de .env o usar 8000 como predeterminado
const PORT = +(process.env.PORT || '8000');

// Función para iniciar el servidor
const startServer = () => {
  try {
    // Inicia el servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Servidor ejecutándose en puerto ${PORT}`);
    });

    // Configurar manejo de cierre correcto
    process.on('SIGINT', () => handleShutdown(server));
    process.on('SIGTERM', () => handleShutdown(server));
    
    return server;
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Función para manejar el cierre correcto del servidor
const handleShutdown = (server: any) => {
  console.log('\nCerrando servidor...'.yellow);
  server.close(() => {
    console.log('Servidor cerrado correctamente'.green);
    process.exit(0);
  });

  // Si no se cierra después de 10 segundos, forzar cierre
  setTimeout(() => {
    console.error('No se pudo cerrar correctamente, forzando cierre'.red);
    process.exit(1);
  }, 10000);
};

// Manejo global de excepciones no controladas
process.on('uncaughtException', (error) => {
  console.error(`Excepción no controlada: ${error.message}`.red);
  console.error(error.stack || '');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Promesa rechazada no manejada: ${reason}`.red);
  process.exit(1);
});

// Iniciar el servidor
const server = startServer();

export default server;