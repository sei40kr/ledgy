import { ApplicationError } from "../errors";

export class TagNameRequiredError extends ApplicationError {}

export class TagNotFoundError extends ApplicationError {}
