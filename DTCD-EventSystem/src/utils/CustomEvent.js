export class CustomEvent {
  static generateID(guid, eventName) {
    return `${eventName}[${guid}]`;
  }
  constructor(guid, eventName, payload = null) {
    this.guid = guid;
    this.name = eventName;
    this.payload = payload;
    this.id = CustomEvent.generateID(guid, eventName);
    this.args = payload ? [payload] : []; // for backward compability with eventSystemPanel
  }

  toString() {
    return this.id;
  }
}
