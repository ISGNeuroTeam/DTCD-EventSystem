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
    // WARNING: pubsub-js pass first argument in callback is eventID (not needed)
    const cbArgsWrap = (_, args) => {
      cb(...args);
    };
    return new CustomAction(guid, actionName, cbArgsWrap);
  }

  #subscribe(customEvent, customAction) {
    this.#logSystem.debug(`Subscribing event '${customEvent.id}' to action '${customAction.id}'`);

    // ---- MAIN SUBSCRIBE ----
    const token = PubSub.subscribe(customEvent.id, customAction.callback);
    this.#subscriptions.push({ event: customEvent, action: customAction, token });
    this.#logSystem.debug(`Subscribed event '${customEvent.id}' to action '${customAction.id}'`);
    return token;
  }

  // ---- FINDING ACTION/EVENT METHODS ----
  // ---- actions ----
  #findAction(guid, actionName) {
    this.#logSystem.debug(`Finding action with guid '${guid}' and name '${actionName}'`);
    const action = this.#actions.find(action => action.name == actionName && action.guid === guid);
    if (action === -1) {
      this.#logSystem.error(`Event (${guid}, ${actionName}) not found`);
      throw new Error(`Event (${guid}, ${actionName}) not found`);
    }
    return action;
  }

  #findActionsByName(actionName) {
    this.#logSystem.debug(`Finding actions with the given event name: '${actionName}'`);
    const actions = this.#actions.filter(action => action.name == actionName);
    return actions;
  }

  // ---- events ----
  #findEvent(guid, eventName) {
    this.#logSystem.debug(`Finding event with guid '${guid}' and name '${eventName}' `);
    const event = this.#events.find(evt => evt.guid == guid && evt.name === eventName);
    if (event === -1) {
      this.#logSystem.error(`Event (${guid}, ${eventName}) not found`);
      throw new Error(`Event (${guid}, ${eventName}) not found`);
    }
    return event;
  }

  #findEventsByName(eventName) {
    this.#logSystem.debug(`Finding events with the given event name: '${eventName}'`);
    const events = this.#events.filter(evt => evt.name == eventName);
    return events;
  }

  setPluginConfig(conf = {}) {
    const { subscriptions = [], actions = [], events = [] } = conf;

    this.#subscriptions = [];
    for (let subscription of subscriptions) {
      const {
        event: { guid: evtGUID, name: evtName },
        action: { guid: actGUID, name: actName },
      } = subscription;
      subscription.token = this.subscribe(evtGUID, evtName, actGUID, actName);
    }
    return true;
  }

  getPluginConfig() {
    return { subscriptions: this.#subscriptions, actions: this.#actions, events: this.#events };
  }

  // ---- REGISTER METHODS ----
  registerPluginInstance(guid, object, eventList) {
    this.#logSystem.debug(`Register object in eventSystem.\nguid:${guid}\n eventList:${eventList}`);

    const methodNotActionList = ['init', 'constructor'];
    const methodList = Object.getOwnPropertyNames(Object.getPrototypeOf(object)).filter(
      propName => typeof object[propName] === 'function'
    );
    for (let methodName of methodList) {
      if (!methodNotActionList.includes(methodName))
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
  publishEvent(guid, eventName, ...args) {
    this.#logSystem.debug(`Trying to publish event with guid '${guid}' and name '${eventName}' `);
    const customEventID = CustomEvent.generateID(guid, eventName);
    PubSub.publish(customEventID, args);
    return true;
  }

  // ---- SUB ----
  subscribe(eventGUID, eventName, actionGUID, actionName) {
    this.#logSystem.debug(`Subscribe: ${eventGUID}, ${eventName}, ${actionGUID}, ${actionName}`);
    const event = this.#findEvent(eventGUID, eventName);
    const action = this.#findAction(actionGUID, actionName);
    return this.#subscribe(event, action);
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
