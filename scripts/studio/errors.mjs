export class StudioError extends Error {
  constructor(code, message, { status = 400, details } = {}) {
    super(message);
    this.name = "StudioError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function assertStudio(condition, code, message, options) {
  if (!condition) throw new StudioError(code, message, options);
}

export function publicError(error) {
  if (error instanceof StudioError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "El servicio local encontró un error inesperado.",
      },
    },
  };
}
