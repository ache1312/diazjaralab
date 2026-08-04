export class MediaImportError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'MediaImportError';
    this.code = code;
    this.details = details;
  }
}

export function mediaError(code, message, details = undefined) {
  return new MediaImportError(code, message, details);
}

