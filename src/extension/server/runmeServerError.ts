class RunmeServerError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'RunmeServerError'
    }
}

export default RunmeServerError