import { ulid } from 'ulidx'

// SessionManager is responsible for managing sessions of the AI requests.
// A session consists of multiple requests/operations that are all related.
// Currently, a session corresponds to a user setting the focus on a cell and
// editing that cell. The purpose of the session manager is to assign a unique
// id to a session and keep track of the current session. This way we can use
// the session id to correlate requests. In particular, for each session we only
// need to send the entire notebook once and then on subsequent events just send
// diffs.
//
// There is a single instance of the SessionManager that is accessed by the getManager
// function. This is because we need a single global session id that multiple callers
// can access.
export class SessionManager {
  static instance: SessionManager

  sessionID: string

  constructor() {
    this.sessionID = ulid()
  }

  public static getManager(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }

    return SessionManager.instance
  }

  // getID returns the current session id
  public getID(): string {
    return this.sessionID
  }

  // newID generates a new session id and returns it
  public newID(): string {
    this.sessionID = ulid()
    return this.sessionID
  }
}
