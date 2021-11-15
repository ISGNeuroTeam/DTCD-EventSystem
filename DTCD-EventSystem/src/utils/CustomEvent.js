export class CustomEvent {
  static generateID(guid, eventName) {
    return `${eventName}[${guid}]`;
  }
  constructor(guid, eventName, args = null) {
    this.guid = guid;
    this.name = eventName;
    this.args = args;
    this.id = CustomEvent.generateID(guid, eventName);
  }

  toString() {
    return this.id;
  }
}
