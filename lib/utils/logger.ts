type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  context?: string
  userId?: string
  data?: Record<string, any>
}

class Logger {
  private isDev: boolean

  constructor() {
    this.isDev = process.env.NODE_ENV !== "production"
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const timestamp = new Date().toISOString()
    const logObject = {
      timestamp,
      level,
      message,
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
        },
      }),
    }

    switch (level) {
      case "info":
        console.log(JSON.stringify(logObject))
        break
      case "warn":
        console.warn(JSON.stringify(logObject))
        break
      case "error":
        console.error(JSON.stringify(logObject))
        break
      case "debug":
        if (this.isDev) {
          console.debug(JSON.stringify(logObject))
        }
        break
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context)
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log("error", message, context, error)
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context)
  }
}

export const logger = new Logger()
