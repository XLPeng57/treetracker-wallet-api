/*
 * Some utils for router/express
 */
const log = require("loglevel");
const HttpError = require("../utils/HttpError");
const ApiKeyService = require("../services/ApiKeyService");
const JWTService = require("../services/JWTService.js");
const {ValidationError} = require("joi");

/*
 * This is from the library https://github.com/Abazhenov/express-async-handler
 * Made some customization for our project. With this, we can throw Error from
 * the handler function or internal function call stack, and parse the error, 
 * send to the client with appropriate response (http error code & json body)
 *
 * USAGE: wrap the express handler with this function:
 *
 *  router.get("/xxx", handlerWrap(async (res, rep, next) => {
 *    ...
 *  }));
 *
 *  Then, add the errorHandler below to the express global error handler.
 *
 */
exports.handlerWrapper = fn =>
  function wrap(...args) {
    const fnReturn = fn(...args)
    const next = args[args.length-1]
    return Promise.resolve(fnReturn).catch(e => {
      next(e);
    })
  }

exports.errorHandler = (err, req, res, next) => {
  log.debug("catch error:", err);
  if(err instanceof HttpError){
    res.status(err.code).send({
      code: err.code,
      message: err.message,
    });
  }else if(err instanceof ValidationError){
    res.status(422).send({
      message: err.details,
    });
  }else{
    res.status(500).send("Unknown error");
  }
};

exports.apiKeyHandler = exports.handlerWrapper(async (req, res, next) => {
  const apiKey = new ApiKeyService();
  await apiKey.check(req.headers['treetracker-api-key']);
  log.debug('Valid Access');
  next();
});

exports.verifyJWTHandler = exports.handlerWrapper(async (req, res, next) => {
  const jwtService = new JWTService();
  const decode = jwtService.verify(req.headers.authorization);
  res.locals.wallet_id = decode.id;
  next();
});

