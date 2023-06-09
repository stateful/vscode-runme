class RunmeServerError extends Error {
  constructor(message: string, err?: Error) {
    if (err) {
      message += `\nCaused by: ${err?.message}`
    }
    super(message)
    this.name = 'RunmeServerError'
  }
}

export default RunmeServerError
