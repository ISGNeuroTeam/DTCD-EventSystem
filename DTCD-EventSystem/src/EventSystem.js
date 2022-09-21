import { CustomEvent } from './utils/CustomEvent';
import { CustomAction } from './utils/CustomAction';
import { SystemPlugin, LogSystemAdapter } from './../../DTCD-SDK/index';
import deepEqual from './utils/deepEqual';

import { version } from './../package.json';

export class EventSystem extends SystemPlugin {
  static getRegistrationMeta() {
    return {
      type: 'core',
      title: 'Система cобытий',
      name: 'EventSystem',
      priority: 6,
      version,
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
    this.#logSystem = new LogSystemAdapter('0.5.0', this.#guid, 'EventSystem');
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
    return action;
  }

  // ---- events ----
  #findEvent(guid, eventName, args) {
    this.#logSystem.debug(`Finding event with guid '${guid}' and name '${eventName}' `);
    const event = this.#events.find(evt => {
      const equal = this.#compareEventArgs(args, evt.args);
      return evt.guid == guid && evt.name === eventName && equal;
    });
    return event;
  }

  #compareEventArgs(firstEventArgs, secondEventArgs) {
    if (firstEventArgs.length !== secondEventArgs.length) return false;
    for (let i = 0; i < firstEventArgs.length; i++) {
      if (typeof firstEventArgs[i] === 'object') {
        const result = deepEqual(firstEventArgs[i], secondEventArgs[i]);
        if (!result) return false;
      } else if (typeof firstEventArgs[i] === 'function') {
        return false;
      } else if (firstEventArgs[i] !== secondEventArgs[i]) {
        return false;
      }
    }
    return true;
  }

  resetSystem() {
    const systemGUIDs = this.getGUIDList().filter(
      guid => this.getInstance(guid).__proto__.constructor.getRegistrationMeta().type === 'core'
    );
    this.#subscriptions = this.#subscriptions.filter(
      subscription =>
        systemGUIDs.includes(subscription.event.guid) &&
        systemGUIDs.includes(subscription.action.guid)
    );
    this.#events = this.#events.filter(event => systemGUIDs.includes(event.guid));
    this.#actions = this.#actions.filter(action => systemGUIDs.includes(action.guid));
  }

  setPluginConfig(conf = {}) {
    const { subscriptions = [], actions = [] } = conf;

    actions.forEach(action => {
      let { guid, name, callback } = action;
      try {
        callback = new Function('return ' + callback)();
        this.registerAction(guid, name, callback);
      } catch (err) {}
    });

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
    const customActions = this.#actions
      .filter(action => !action.guid)
      .map(action => ({ ...action, callback: action.callback.toString() }));
    return { subscriptions: this.#subscriptions, actions: customActions };
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

  registerAction(guid, actionName, callback) {
    const action = this.#createAction(guid, actionName, callback);
    this.#actions.push(action);
    this.#logSystem.debug(`Registered action '${action.id}'`);
    return true;
  }

  registerCustomAction(actionName, callback) {
    return this.registerAction(undefined, actionName, callback);
  }

  removeCustomAction(customActionName) {
    const index = this.#actions.findIndex(
      action => !action.guid && action.name === customActionName
    );
    if (index !== -1) {
      this.#actions.splice(index, 1);
      this.#logSystem.info(`Removed custom action '${customActionName}'`);
    } else {
      this.#logSystem.warn(`Custom action '${customActionName}' not found`);
    }
    return true;
  }

  publishEvent(guid, eventName, ...args) {
    this.#logSystem.debug(`Trying to publish event with guid '${guid}' and name '${eventName}' `);
    const customEventID = CustomEvent.generateID(guid, eventName);
    this.#publish(customEventID, args);
    return true;
  }

  #publish(eventID, args) {
    const subscriptions = this.#subscriptions.filter(subscripton => {
      if (subscripton.event.args.length === 0) return subscripton.event.id === eventID;
      if (subscripton.event.id === eventID) {
        return this.#compareEventArgs(args, subscripton.event.args);
      }
      return false;
    });
    if (subscriptions.length > 0) {
      subscriptions.forEach(subscripton => subscripton.action.callback(...args));
    }
  }

  subscribe(eventGUID, eventName, actionGUID, actionName, ...args) {
    this.#logSystem.debug(
      `Trying to subscribe: ${eventGUID}, ${eventName}, to ${actionGUID}, ${actionName}`
    );

    let event = this.#findEvent(eventGUID, eventName, args);
    let action;
    if (actionGUID === '-') {
      action = this.#findAction(undefined, actionName);
    } else {
      action = this.#findAction(actionGUID, actionName);
    }

    if (!event && !action) {
      this.#logSystem.error(
        `Event (${eventGUID}, ${eventName}) and action (${actionGUID}, ${actionName}) not found`
      );
      return false;
    }

    if (!action) {
      this.#logSystem.error(`Action (${actionGUID}, ${actionName}) not found!`);
      return false;
    }

    if (!event) {
      this.#logSystem.warn(`Event (${eventGUID}, ${eventName}) not found. Creating a new one.`);
      event = this.#createEvent(eventGUID, eventName, args);
      this.#events.push(event);
    }

    // a temporary decision
    if (this.#subscriptions.find(sub => sub.event === event && sub.action === action)) {
      this.#logSystem.warn(
        `Subscripion (${eventGUID}, ${eventName}) to (${actionGUID}, ${actionName}) already exists!`
      );
      return true;
    }

    this.#subscriptions.push({ event, action });
    this.#logSystem.debug(`Subscribed event '${event.id}' to action '${action.id}'`);
    return true;
  }

  unsubscribe(eventGUID, eventName, actionGUID, actionName, ...args) {
    this.#logSystem.debug(
      `Trying to unsubscribe: ${eventGUID}, ${eventName}, to ${actionGUID}, ${actionName}`
    );

    const event = this.#findEvent(eventGUID, eventName, args);
    const action = this.#findAction(actionGUID, actionName);

    const index = this.#subscriptions.findIndex(
      sub => sub.event === event && sub.action === action
    );

    if (index !== -1) {
      this.#subscriptions.splice(index, 1);
    }
    return true;
  }

  // #findActionsByName(actionName) {
  //   this.#logSystem.debug(`Finding actions with the given event name: '${actionName}'`);
  //   const actions = this.#actions.filter(action => action.name == actionName);
  //   return actions;
  // }

  // #findEventsByName(eventName) {
  //   this.#logSystem.debug(`Finding events with the given event name: '${eventName}'`);
  //   const events = this.#events.filter(evt => evt.name == eventName);
  //   return events;
  // }
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
