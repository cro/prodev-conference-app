export function trimProperty(o, name) {
  if (o && o[name] && typeof o[name] === 'string') {
    o[name] = o[name].trim();
  }
}
