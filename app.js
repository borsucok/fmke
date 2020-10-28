const fs = require('fs');
const jsyaml = require('js-yaml');
const Koa = require('koa');
const KOAS3 = require('koas3').default;
const http = require('http');
const URL = require('url');
const { join } = require('path');

const createApp = async (openapiPath, options) => {
  // create openapi object
  const openapiFile = fs.readFileSync(openapiPath, 'utf8');
  const openapi = jsyaml.safeLoad(openapiFile);

  // create Koa app
  const app = new Koa();

  // optionally setup app as proxy
  app.proxy = true;

  // optionaly use default error handler
  app.use(async (ctx, next) => {
    try {
      await next();
      if ([404, 405].includes(ctx.status)) {
        ctx.throw(ctx.status, `Path ${ctx.path} not found`);
      }
    } catch (err) {
      // example of error handling
      if (err.message === 'RequestValidationError') {
        const { status, name, message, ...payload } = err;
        ctx.status = typeof err.status === 'number' ? err.status : 500;
        ctx.body = {
          statusCode: ctx.status,
          name: 'INVALID_SCHEMA',
          description: err.message,
          payload,
        };
      } else {
        // application
        ctx.app.emit('error', err, ctx);
        ctx.status = typeof err.status === 'number' ? err.status : 500;
        ctx.body = {
          statusCode: ctx.status,
          name: err.name,
          description: err.message,
          payload: { error: err.message, stack: err.stack, originalError: err },
        };
      }
    }
  });

  // koas3 openapi magic
  const router = await KOAS3(openapi, options);

  // this is important - setup router prefix based on openapi servers
  // depends on your app logic, this just takes the first
  if (openapi.servers && openapi.servers.length) {
    const [serverDefinition] = openapi.servers;
    const url = URL.parse(serverDefinition.url);
    let routePrefix = url.pathname.replace(/\/$/, '') + '/';
    if (serverDefinition.variables) {
      Object.keys(serverDefinition.variables).forEach((k) => {
        routePrefix = routePrefix.replace(new RegExp(`{${k}}`, 'g'), serverDefinition.variables[k].default);
      });
    }

    router.prefix(routePrefix);
  }

  // resup KOAS3 router to the app
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.on('error', (err) => {
    // this is any other error handler
    console.error('AppError:', err);
  });

  return app;
};

// run the server
createApp('./openapi.yaml', {
  controllersPath: join(__dirname, 'controllers'),
})
  .then(async (app) => {
    // make optional database connections
    await require('./database').connect();

    http
      .createServer(app.callback())
      .listen({ port: 9000 }, () => {
        console.log('API is listening on port 9000');
      })
      .on('error', (e) => {
        console.error(`Error starting server: ${e}`);
      });
  })
  .catch(async (e) => {
    console.error('ApiError:', e);
    // stop database connections
    require('./database').disconnect();
  });
