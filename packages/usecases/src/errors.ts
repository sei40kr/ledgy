/**
 * A usecase refusing to proceed, or a port implementation unable to honor its
 * contract. Every refusal has its own subclass, declared with the usecases or
 * the port it belongs to, carrying the facts and nothing about how to word
 * them: the presentation layer turns each error into the message shown on screen.
 */
export abstract class ApplicationError extends Error {
  constructor() {
    super();
    this.name = new.target.name;
  }
}
