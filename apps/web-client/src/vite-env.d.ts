/// <reference types="vite/client" />

// CSS module declarations
declare module '*.css' { }

// Image assets
declare module '*.png' {
    const src: string
    export default src
}
declare module '*.jpg' {
    const src: string
    export default src
}
declare module '*.svg' {
    const src: string
    export default src
}
