export interface Gist {
  files: GistFiles
  description?: string | undefined
  isPublic: boolean
}

export interface GistFiles {
  [key: string]: {
    content: string
  }
}

export interface GistResponse {
  data: {
    html_url: string | undefined
  }
}
