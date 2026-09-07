/**
 * A violation of a domain rule. Every rule has its own subclass, declared next
 * to the rule it guards, carrying the facts of the violation and nothing about
 * how to word them: the presentation layer turns each error into the message
 * shown on screen, so the domain stays free of UI concerns.
 */
export abstract class DomainError extends Error {
  constructor() {
    super();
    this.name = new.target.name;
  }
}
