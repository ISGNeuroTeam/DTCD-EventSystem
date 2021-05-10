import { CustomEvent } from './utils/CustomEvent';
import { CustomAction } from './utils/CustomAction';
import { SystemPlugin, LogSystemAdapter } from './../../DTCD-SDK/index';

export class EventSystem extends SystemPlugin {
  static getRegistrationMeta() {
    return {
      type: 'core',
      title: 'Система cобытий',
      name: 'EventSystem',
      withDependencies: true,
      priority: 6,
      version: '0.2.0',
    };
  }

  constructor(guid) {
    super();
    // systemGUID needed for getting callback (function) of instances by guid
    this.guid = guid;
    this.logSystem = new LogSystemAdapter(this.guid, 'EventSystem');
    this.actions = [];
    this.events = [];
  }

  registerEvent(customEvent) {
    this.logSystem.debug(`Trying to register event '${customEvent.id}`);
    if (customEvent instanceof CustomEvent) {
      this.events.push(customEvent);
      this.logSystem.debug(`Registered event '${customEvent.id}'`);
      return true;
    } else {
      this.logSystem.debug(`Given event isn't istance of CustomEvent class`);
      return false;
    }
  }

  registerAction(action) {
    if (action instanceof CustomAction) {
      this.actions.push(action);
      this.logSystem.debug(`Registered action '${action.id}'`);
      return true;
    } else return false;
  }

  // Events methods
  createAndPublish(guid, eventName, args) {
    const customEvent = this.createEvent(guid, eventName, args);
    this.logSystem.debug(`Created event '${customEvent.id}'`);
    this.publishEvent(customEvent);
  }

  publishEvent(customEvent) {
    this.logSystem.debug(`Trying to publish event '${customEvent.id}`);
    if (customEvent instanceof CustomEvent) {
      PubSub.publish(customEvent, customEvent.id);
      this.logSystem.debug(`Published event '${customEvent.id}'`);
      return true;
    } else return false;
  }

  createEvent(guid, eventName, args = null) {
    this.logSystem.debug(`Creating event '${eventName}' to instance id '${guid}' with args:${args} `);
    return new CustomEvent(guid, eventName, args);
  }

  // Actions methods

  createAction(actionName, guid, args = null) {
    this.logSystem.debug(`Creating action:'${actionName}', guid:'${guid}', args:'${args}'`);
    const instance = this.getInstance(guid);
    // Warning!: nextline is very important. It's bind "this" of instance to callback
    this.logSystem.debug(`Binding callback '${actionName}' to plugin instance`);
    const callback = instance[actionName].bind(instance);
    const action = new CustomAction(actionName, guid, callback, args);
    this.logSystem.debug(`Created action '${action.id}'`);
    return action;
  }

  // Some API for comfortable action publishing
  createActionByCallback(actionName, guid, callback, args = null) {
    this.logSystem.debug(
      `Creating action:'${actionName}' by callback with 
			guid:'${guid}', callback:'${callback.name}', args:'${args}'`
    );
    const customAction = new CustomAction(actionName, guid, callback, args);
    this.actions.push(customAction);
    this.logSystem.debug(`Created action '${customAction.id}' by callback '${callback.name}'`);
    return customAction;
  }

  // Subscribing
  subscribeEventsByName(eventName, actionID) {
    this.logSystem.debug(`Subscribing eventName '${eventName}' to actionID '${actionID}'`);
    const events = this.findEventsByName(eventName);
    const action = this.findActionById(actionID);
    if (events?.length != 0 && action) {
      events.forEach(evt => {
        this.subscribe(evt, action);
        this.logSystem.debug(`Subscribed event '${evt.id}' to action '${action.id}'`);
      });
      return true;
    } else {
      return false;
    }
  }

  subscribeByNames(eventName, actionName) {
    this.logSystem.debug(`Subscribing eventName '${eventName}' to actionName '${actionName}'`);
    const events = this.findEventsByName(eventName);
    const actions = this.findActionsByName(actionName);
    for (let evt of events) {
      for (let action of actions) {
        this.subscribe(evt.id, action.id);
        this.logSystem.debug(`Subscribed event '${evt.id}' to action '${action.id}'`);
      }
    }
    return true;
  }

  subscribe(eventID, actionID) {
    this.logSystem.debug(`Subscribing event '${eventID}' to action '${actionID}'`);
    const customAction = this.findActionById(actionID);
    if (customAction) {
      PubSub.subscribe(eventID, customAction.callback);
      this.logSystem.debug(`Subscribed event '${eventID}' to action '${customAction.id}'`);
      return true;
    } else {
      return false;
    }
  }

  subscribeEventNameByCallback(eventName, callback) {
    this.logSystem.debug(`Subscribing event '${eventName}' to callback '${callback.name}'`);
    const events = this.findEventsByName(eventName);
    for (let evt of events) {
      PubSub.subscribe(evt, callback);
      this.logSystem.debug(`Subscribed event '${evt.id}' to callback:${callback.name}`);
    }
  }

  // Searching in actions/events
  findActionById(actionID) {
    this.logSystem.debug(`Finding action with the given actionID: '${actionID}'`);
    const action = this.actions.find(action => action.id == actionID);
    if (action) {
      this.logSystem.debug(`Successfully found actions with id: '${actionID}'`);
      return action;
    } else {
      this.logSystem.debug(`No action found with the given id: '${actionIDs}'`);
      return;
    }
  }

  findEventById(eventID) {
    this.logSystem.debug(`Finding event with the given eventID: '${eventID}'`);
    const event = this.events.find(evt => evt.id == eventID);
    if (event) {
      this.logSystem.debug(`Successfully found event with id: '${eventID}'`);
      return event;
    } else {
      this.logSystem.debug(`No event found with the given id: '${eventID}'`);
      return;
    }
  }

  findEventsByName(eventName) {
    this.logSystem.debug(`Finding events with the given event name: '${eventName}'`);
    const events = this.events.filter(evt => evt.name == eventName);
    if (events?.length != 0) {
      this.logSystem.debug(`Successfully found events with name: '${eventName}'`);
      return events;
    } else {
      this.logSystem.debug(`No events found with the given name: '${eventName}'`);
      return;
    }
  }

  findActionsByName(actionName) {
    this.logSystem.debug(`Finding actions with the given event name: '${actionName}'`);
    const actions = this.actions.filter(action => action.name == actionName);
    if (actions?.length != 0) {
      this.logSystem.debug(`Successfully found actions with name: '${actionName}'`);
      return actions;
    } else {
      this.logSystem.debug(`No actions found with the given name: '${actionName}'`);
      return;
    }
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
