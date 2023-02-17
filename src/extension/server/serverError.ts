class ServerError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'runme server error'
    }
}

export default ServerError