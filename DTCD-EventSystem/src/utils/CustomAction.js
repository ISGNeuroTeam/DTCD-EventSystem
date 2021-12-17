export class CustomAction {
  static generateID(guid, actionName) {
    return `${guid}[${actionName}]`;
  }

  constructor(guid, actionName, callback, args = null) {
    this.guid = guid;
    this.name = actionName;
    this.args = args;
    this.id = CustomAction.generateID(guid, actionName);
    this.callback = callback;
  }

  toString() {
    return this.id;
  }
}
