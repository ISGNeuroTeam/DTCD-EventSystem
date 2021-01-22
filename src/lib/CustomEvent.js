export class CustomEvent {
  constructor(guid, eventName, args = null) {
    this.guid = guid;
    this.name = eventName;
    this.args = args;
    this.id = `${this.name}[${this.guid}]`;
  }

  toString() {
    return this.id;
  }
}
