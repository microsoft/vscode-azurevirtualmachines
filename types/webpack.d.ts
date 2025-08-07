// Type compatibility for Symbol.dispose with ES6 target
declare global {
  interface SymbolConstructor {
    readonly dispose: unique symbol;
  }
}

export {};