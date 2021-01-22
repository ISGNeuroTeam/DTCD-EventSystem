import { CustomEvent } from './libs/CustomEvent';
import { CustomAction } from './libs/CustomAction';
import { SystemPlugin } from '../SystemPlugin';

export class DataCADPlugin extends SystemPlugin {
  static getRegistrationMeta() {
    return {
      type: 'core',
      title: 'Система Событий',
      name: 'EventSystem',
      events: [],
      actions: [],
      relations: [],
      requirements: ['SystemGUID', 'pubsub.js'],
    };
  }

  static register(connector) {
    connector.register(DataCADPlugin.getRegistrationMeta());
  }

  constructor(systemGUID) {
    this.getRegistrationMeta = DataCADPlugin.getRegistrationMeta;
    this.type = DataCADPlugin.getRegistrationMeta().type;
    // systemGUID needed for getting callback (function) of instances by guid
    this.systemGUID = systemGUID;
    this.actions = [];
    this.events = [];
  }

  registerInstance(instance, guid) {
    const { actions, events } = instance.getRegistrationMeta();

    actions.forEach(actionName => {
      if (instance[actionName]) {
        const action = this.createAction(actionName, guid);
        this.actions.push(action);
      } else {
        console.warn(`Warning: method "${actionName}" not found in DataCADPlugin class.`);
      }
    });

    events.forEach(eventName => {
      const event = this.createEvent(guid, eventName);
      this.events.push(event);
    });
    return true;
  }

  registerAction(action) {
    this.actions.push(action);
    return true;
  }

  // Events methods
  createAndPublish(guid, eventName, args) {
    const customEvent = this.createEvent(guid, eventName, args);
    this.publishEvent(customEvent);
  }

  publishEvent(customEvent) {
    PubSub.publish(customEvent, customEvent.id);
  }

  createEvent(guid, eventName, args = null) {
    return new CustomEvent(guid, eventName, args);
  }

  // Actions methods

  createAction(actionName, guid, args = null) {
    const instance = this.systemGUID.guids[guid];
    // Warning!: nextline is very important. It's getting method of DataCADPlugin by actionName
    const callback = instance[actionName].bind(instance);
    return new CustomAction(actionName, guid, callback, args);
  }

  // Some API for comfortable action publishing
  createActionByCallback(actionName, guid, callback, args = null) {
    const customAction = new CustomAction(actionName, guid, callback, args);
    this.actions.push(customAction);
    return customAction;
  }

  // Subscribing
  subscribeEventsByName(eventName, actionID) {
    const events = this.findEventsByName(eventName);
    const action = this.findActionById(actionID);
    events.forEach(evt => this.subscribe(evt, action));
    return true;
  }

  subscribeByNames(eventName, actionName) {
    const events = this.findEventsByName(eventName);
    const actions = this.findActionsByName(actionName);
    for (let evt of events) {
      for (let action of actions) {
        this.subscribe(evt.id, action.id);
      }
    }
    return true;
  }

  subscribe(eventID, actionID) {
    const customAction = this.findActionById(actionID);
    PubSub.subscribe(eventID, customAction.callback);
    return true;
  }

  subscribeEventNameByCallback(eventName, callback) {
    const events = this.findEventsByName(eventName);
    for (let evt of events) {
      PubSub.subscribe(evt, callback);
    }
  }

  // Searching in actions/events
  findActionById(actionID) {
    return this.actions.find(action => action.id == actionID);
  }

  findEventById(eventID) {
    return this.events.find(evt => evt.id == eventID);
  }

  findEventsByName(eventName) {
    return this.events.filter(evt => evt.name == eventName);
  }

  findActionsByName(actionName) {
    return this.actions.filter(action => action.name == actionName);
  }

  showAvailableEvents() {
    //TODO: prettify returned object (grouping etc)
    return this.events;
  }

  showAvailableActions() {
    //TODO: prettify returned object (grouping etc)
    return this.actions;
  }
}
