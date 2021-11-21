import { CustomEvent } from './utils/CustomEvent';
import { CustomAction } from './utils/CustomAction';
import { SystemPlugin, LogSystemAdapter } from './../../DTCD-SDK/index';

export class EventSystem extends SystemPlugin {
  static getRegistrationMeta() {
    return {
      type: 'core',
      title: 'Система cобытий',
      name: 'EventSystem',
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
    return new CustomAction(guid, actionName, cb);
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
  #findEvent(guid, eventName, args) {
    this.#logSystem.debug(`Finding event with guid '${guid}' and name '${eventName}' `);
    const event = this.#events.find(evt => {
      const a1 = JSON.stringify(args);
      const a2 = JSON.stringify(evt.args);
      return evt.guid == guid && evt.name === eventName && a1 === a2;
    });
    if (!event) {
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

  resetSystem() {
    this.#subscriptions = [];
    this.getGUIDList().forEach(guid => {
      if (this.getInstance(guid).__proto__.constructor.getRegistrationMeta().type !== 'core') {
        this.#events = this.#events.filter(event => event.guid !== guid);
        this.#actions = this.#actions.filter(event => event.guid !== guid);
      }
    });
  }

  setPluginConfig(conf = {}) {
    const { subscriptions = [] } = conf;
    for (let subscription of subscriptions) {
      const {
        event: { guid: evtGUID, name: evtName },
        action: { guid: actGUID, name: actName },
      } = subscription;
      if (!subscription.event.args) subscription.event.args = [];
      this.subscribe(evtGUID, evtName, actGUID, actName, ...subscription.event.args);
    }
    return true;
  }

  getPluginConfig() {
    return { subscriptions: this.#subscriptions };
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

  registerEvent(guid, eventName, ...args) {
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
    this.#publish(customEventID, args);
    return true;
  }

  #publish(eventName, args) {
    const subscriptions = this.#subscriptions.filter(subscripton => {
      if (subscripton.event.args.length === 0) return subscripton.event.id === eventName;
      if (subscripton.event.id === eventName) {
        const a1 = JSON.stringify(args);
        const a2 = JSON.stringify(subscripton.event.args);
        return a1 === a2;
      }
      return false;
    });
    if (subscriptions.length > 0) {
      subscriptions.forEach(subscripton => subscripton.action.callback(...args));
    }
  }

  // ---- SUB ----
  subscribe(eventGUID, eventName, actionGUID, actionName, ...args) {
    this.#logSystem.debug(
      `Tryin to subscribe: ${eventGUID}, ${eventName}, to ${actionGUID}, ${actionName}`
    );
    const event = this.#findEvent(eventGUID, eventName, args);
    const action = this.#findAction(actionGUID, actionName);
    this.#subscriptions.push({ event, action });
    this.#logSystem.debug(`Subscribed event '${event.id}' to action '${action.id}'`);
  }

  // subscribeActionOnEventName(actionGUID, actionName, eventName) {
  //   this.#logSystem.debug(
  //     `Subscribe action with guid ${actionGUID} and name '${actionName}' on events with name '${eventName}'`
  //   );
  //   const events = this.#findEventsByName(eventName);
  //   const action = this.#findAction(actionGUID, actionName);
  //   events.forEach(evt => {
  //     this.#subscribe(evt, action);
  //   });
  //   return true;
  // }

  // subscribeEventOnActionName(eventGUID, eventName, actionName) {
  //   this.#logSystem.debug(
  //     `Subscribe event with guid '${eventGUID}' and name '${eventName}' to actions with name '${actionName}'`
  //   );
  //   const event = this.#findEvent(eventGUID, eventName);
  //   const actions = this.#findActionsByName(actionName);
  //   actions.forEach(action => {
  //     this.#subscribe(event, action);
  //   });
  // }

  // subscribeByNames(eventName, actionName) {
  //   this.#logSystem.debug(`Subscribing eventName '${eventName}' to actionName '${actionName}'`);
  //   const events = this.#findEventsByName(eventName);
  //   const actions = this.#findActionsByName(actionName);
  //   for (let evt of events) {
  //     for (let action of actions) {
  //       this.#subscribe(evt, action);
  //     }
  //   }
  //   return true;
  // }

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
