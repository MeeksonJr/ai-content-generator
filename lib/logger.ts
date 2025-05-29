type LogLevel = "info" | "warn" | "error" | "debug"

interface LogData {
  context?: string
  data?: any
}

class Logger {
  private log(level: LogLevel, message: string, logData?: LogData) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...logData,
    }

    // In development, use console methods
    if (process.env.NODE_ENV === "development") {
      switch (level) {
        case "error":
          console.error(JSON.stringify(logEntry, null, 2))
          break
        case "warn":
          console.warn(JSON.stringify(logEntry, null, 2))
          break
        case "debug":
          console.debug(JSON.stringify(logEntry, null, 2))
          break
        default:
          console.log(JSON.stringify(logEntry, null, 2))
      }
    } else {
      // In production, just use console.log with JSON
      console.log(JSON.stringify(logEntry))
    }
  }

  info(message: string, data?: LogData) {
    this.log("info", message, data)
  }

  warn(message: string, data?: LogData) {
    this.log("warn", message, data)
  }

  error(message: string, data?: LogData) {
    this.log("error", message, data)
  }

  debug(message: string, data?: LogData) {
    this.log("debug", message, data)
  }
}

export const logger = new Logger()
