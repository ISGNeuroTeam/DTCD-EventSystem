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

  #guid;
  #logSystem;
  #actions;
  #events;
  #subscriptions;

  constructor(guid) {
    super();
    // systemGUID needed for getting callback (function) of instances by guid
    this.#guid = guid;
    this.#logSystem = new LogSystemAdapter(this.#guid, 'EventSystem');
    this.#actions = [];
    this.#events = [];
    this.#subscriptions = [];
  }

  #createEvent(guid, eventName, args = null) {
    this.#logSystem.debug(
      `Creating event '${eventName}' to instance id '${guid}' with args:${args} `
    );
    return new CustomEvent(guid, eventName, args);
  }

  #createAction(guid, actionName, cb) {
    this.#logSystem.debug(`Creating action:'${actionName}', guid:'${guid}'`);
    return new CustomAction(actionName, guid, cb);
  }

  #subscribe(customEvent, customAction) {
    this.#logSystem.debug(`Subscribing event '${customEvent.id}' to action '${customAction.id}'`);

    // ---- MAIN SUBSCRIBE ----
    PubSub.subscribe(customEvent, customAction.callback);
    this.#subscriptions.push({ event: customEvent, action: customAction });

    this.#logSystem.debug(`Subscribed event '${customEvent.id}' to action '${customAction.id}'`);
    return true;
  }

  // ---- FINDING ACTION/EVENT METHODS ----
  // ---- actions ----
  #findAction(guid, actionName) {
    this.#logSystem.debug(`Finding action with the given actionID: '${actionID}'`);
    const action = this.#actions.find(action => action.name == actionName && action.guid === guid);
    if (action) {
      this.#logSystem.debug(`Successfully found actions with id: '${actionID}'`);
      return action;
    } else {
      this.#logSystem.debug(`No action found with the given id: '${actionID}'`);
      return -1;
    }
  }

  #findActionsByName(actionName) {
    this.#logSystem.debug(`Finding actions with the given event name: '${actionName}'`);
    const actions = this.#actions.filter(action => action.name == actionName);
    return actions;
  }

  // ---- events ----
  #findEvent(guid, eventName) {
    this.#logSystem.debug(`Finding event with the given eventID: '${eventID}'`);
    const event = this.#events.find(evt => evt.guid == guid && evt.name === eventName);
    this.#logSystem.debug(`Successfully found event with id: '${eventID}'`);
    return event ? event : -1;
  }

  #findEventsByName(eventName) {
    this.#logSystem.debug(`Finding events with the given event name: '${eventName}'`);
    const events = this.#events.filter(evt => evt.name == eventName);
    return events;
  }

  setPluginConfig(conf) {
    const { subscriptions, actions, events } = conf;
    this.#subscriptions = subscriptions;
    this.#actions = actions;
    this.#events = events;
    return true;
  }

  getPluginConfig() {
    return { subscriptions: this.#subscriptions, actions: this.#actions, events: this.#events };
  }

  // ---- REGISTER METHODS ----
  registerPluginInstance(guid, object, eventList) {
    this.#logSystem.debug(`Register object in eventSystem.\nguid:${guid}\n eventList:${eventList}`);
    const methodList = Object.keys(object).filter(prop => typeof object[prop] === 'function');
    for (let methodName of methodList) {
      this.registerAction(guid, methodName, object[methodName].bind(object));
    }
    if (typeof eventList !== 'undefined')
      eventList.forEach(eventName => this.registerEvent(guid, eventName));
    return true;
  }

  registerEvent(guid, eventName, args) {
    this.#logSystem.debug(`Trying to register event with guid '${guid}' and name '${eventName}'.`);
    const customEvent = this.#createEvent(guid, eventName, args);
    this.#events.push(customEvent);
    this.#logSystem.debug(`Registered event '${customEvent.id}'`);
    return true;
  }

  registerAction(guid, actionName, cb) {
    const action = this.#createAction(guid, actionName, cb);
    this.#actions.push(action);
    this.#logSystem.debug(`Registered action '${action.id}'`);
    return true;
  }

  // ---- Pub/Sub METHODS ----
  // ---- PUB ----
  publishEvent(guid, eventName, args) {
    this.#logSystem.debug(`Trying to publish event '${customEvent.id}`);
    const customEvent = this.createEvent(guid, eventName);
    customEvent.args = args;
    PubSub.publish(customEvent.id, customEvent);
    return true;
  }

  // ---- SUB ----
  subscribe(eventGUID, eventName, actionGUID, actionName) {
    this.#logSystem.debug(`Subscribe: ${eventGUID}, ${eventName}, ${actionGUID}, ${actionName}`);
    const evt = this.#findEvent(eventGUID, eventName);
    const action = this.#findAction(actionGUID, actionName);
    return this.#subscribe(evt, action);
  }

  subscribeActionOnEventName(actionGUID, actionName, eventName) {
    this.#logSystem.debug(
      `Subscribe action with guid ${actionGUID} and name '${actionName}' on events with name '${eventName}'`
    );
    const events = this.#findEventsByName(eventName);
    const action = this.#findAction(actionGUID, actionName);
    events.forEach(evt => {
      this.#subscribe(evt, action);
    });
    return true;
  }

  subscribeEventOnActionName(eventGUID, eventName, actionName) {
    this.#logSystem.debug(
      `Subscribe event with guid '${eventGUID}' and name '${eventName}' to actions with name '${actionName}'`
    );
    const event = this.#findEvent(eventGUID, eventName);
    const actions = this.#findActionsByName(actionName);
    actions.forEach(action => {
      this.#subscribe(event, action);
    });
  }

  subscribeByNames(eventName, actionName) {
    this.#logSystem.debug(`Subscribing eventName '${eventName}' to actionName '${actionName}'`);
    const events = this.#findEventsByName(eventName);
    const actions = this.#findActionsByName(actionName);
    for (let evt of events) {
      for (let action of actions) {
        this.#subscribe(evt, action);
      }
    }
    return true;
  }

  // ---- getters ----
  get events() {
    return this.#events;
  }

  get actions() {
    return this.#actions;
  }

  get subscriptions() {
    return this.#subscriptions;
  }
}
