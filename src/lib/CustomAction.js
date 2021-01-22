export class CustomAction {
  constructor(actionName, guid, callback, args = null) {
    this.guid = guid;
    this.name = actionName;
    this.args = args;
    this.id = `${guid}[${actionName}]`;
    this.callback = callback;
  }
  toString() {
    return this.id;
  }
}
