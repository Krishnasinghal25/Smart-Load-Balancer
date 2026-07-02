// Tiny colorized logger — no external dependency.
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m',
  cyan: '\x1b[36m', magenta: '\x1b[35m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m',
};

const stamp = () => new Date().toISOString().slice(11, 23);

function log(color, tag, ...args) {
  console.log(`${C.dim}${stamp()}${C.reset} ${color}${tag}${C.reset}`, ...args);
}

export const logger = {
  info:  (...a) => log(C.cyan,    'INFO ', ...a),
  agent: (...a) => log(C.magenta, 'AGENT', ...a),
  ok:    (...a) => log(C.green,   'OK   ', ...a),
  warn:  (...a) => log(C.yellow,  'WARN ', ...a),
  error: (...a) => log(C.red,     'ERROR', ...a),
  route: (...a) => log(C.blue,    'ROUTE', ...a),
};

export default logger;
