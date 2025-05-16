// Agrega las declaraciones de módulos faltantes
// Crea este archivo en la raíz de src

declare module 'express-ws' {
  import * as express from 'express';
  import * as http from 'http';
  import * as ws from 'ws';

  interface Router extends express.Router {
    ws: (route: string, callback: (ws: ws.WebSocket, req: express.Request) => void) => void;
  }

  interface Application extends express.Application {
    ws: (route: string, callback: (ws: ws.WebSocket, req: express.Request) => void) => void;
  }

  interface ExpressWs {
    app: Application;
    getWss: () => ws.Server;
    applyTo: (server: http.Server) => void;
  }

  interface Options {
    leaveRouterUntouched?: boolean;
    wsOptions?: ws.ServerOptions;
  }

  function expressWs(
    app: express.Application,
    server?: http.Server,
    options?: Options
  ): ExpressWs;

  namespace expressWs {
    function instance(
      app: express.Application,
      server?: http.Server,
      options?: Options
    ): ExpressWs;
  }

  export = expressWs;
}
