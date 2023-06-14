import {
  SystemPlugin,
  LogSystemAdapter,
} from './../../DTCD-SDK/index';
import { version } from './../package.json';

import { CustomEvent } from './utils/CustomEvent';
import { CustomAction } from './utils/CustomAction';
import deepEqual from './utils/deepEqual';


const CUSTOM_USER_ACTION = 'customUserActions'

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
    this.#actions = new Map();
    this.#events = new Map();
    this.#subscriptions = [];
  }

  #createEvent(pluginID, eventName, args = null) {
    this.#logSystem.debug(
      `Creating event '${eventName}' to instance id '${pluginID}' with args:${args} `
    );
    return new CustomEvent(pluginID, eventName, args);
  }

  #createAction(pluginID, actionName, cb) {
    this.#logSystem.debug(`Creating action:'${actionName}', id:'${pluginID}'`);
    return new CustomAction(pluginID, actionName, cb);
  }

  findAction(pluginID, actionName) {
    this.#logSystem.debug(`Finding action with id '${pluginID}' and name '${actionName}'`);
    return this.#actions.get(pluginID)?.get(actionName);
  }

  findEvent(pluginID, eventName, payload) {
    this.#logSystem.debug(`Finding event with id '${pluginID}' and name '${eventName}' `);

    const eventList = this.#events.get(pluginID)?.get(eventName)

    const event = eventList?.find(evt => {
      const equal = deepEqual(payload, evt.payload);
      return equal;
    });
    return event;
  }

  resetSystem() {
    const systemGUIDs = new Set(this.getGUIDList().filter(
      pluginID => this.getInstance(pluginID).__proto__.constructor.getRegistrationMeta().type === 'core'
    ));

    this.#subscriptions = this.#subscriptions.filter(
      subscription =>
        systemGUIDs.has(subscription.event.guid) &&
        systemGUIDs.has(subscription.action.guid)
    );

    [...this.#actions.keys()].forEach(pluginID => {
      if(!systemGUIDs.has(pluginID)) this.#actions.delete(pluginID)
    });

    [...this.#events.keys()].forEach(pluginID => {
      if(!systemGUIDs.has(pluginID)) this.#events.delete(pluginID)
    });
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
        event: { guid: eventGUID, name: eventName },
        action: { guid: actionGUID, name: actionName },
        subscriptionName,
      } = subscription;

      // if (!subscription.event.payload) subscription.event.payload = [];

      this.subscribe(
        {
          eventGUID,
          eventName,
          actionGUID,
          actionName,
          subscriptionName,
        },
        subscription.event.payload
      );
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
    if (Array.isArray(eventList))
      eventList.forEach(eventName => this.registerEvent(guid, eventName));
    return true;
  }

  registerEvent(pluginID, eventName, payload) {
    if (Array.isArray(payload) && payload.length === 0) payload = undefined; // for backward compability
    this.#logSystem.debug(`Registrating event with pluginID '${pluginID}' and name '${eventName}' with payload ${JSON.stringify(payload)}.`);

    if (!this.#events.has(pluginID))
      this.#events.set(pluginID, new Map())

    const pluginEvents = this.#events.get(pluginID)
    if (!pluginEvents.has(eventName))
      pluginEvents.set(eventName, [])

    const eventList = pluginEvents.get(eventName)

    for(const event of eventList) {
      if (deepEqual(payload, event.payload)) {
        this.#logSystem.debug(`Event '${pluginID}' '${eventName}' already exists.`);
        return event;
      }
    }

    const customEvent = this.#createEvent(pluginID, eventName, payload);
    eventList.push(customEvent)

    this.#logSystem.debug(`Registered event '${customEvent.id}'`);
    return customEvent;
  }

  registerAction(pluginID, actionName, callback) {
    if (!this.#actions.has(pluginID))
      this.#actions.set(pluginID, new Map())

    const pluginActions = this.#actions.get(pluginID)
    if (pluginActions.has(actionName)) {
      this.#logSystem.debug(`Action with name:'${actionName}' for plugin:'${pluginID}' already exists!`);
      return pluginActions.get(actionName)
    }

    const action = this.#createAction(pluginID, actionName, callback);
    pluginActions.set(actionName, action)

    this.#logSystem.debug(`Registered action '${action.id}'`);
    return action;
  }

  registerCustomAction(actionName, callback) {
    return this.registerAction(CUSTOM_USER_ACTION, actionName, callback);
  }

  removeCustomAction(customActionName) {
    const action = this.#actions.has(CUSTOM_USER_ACTION)?.has(customActionName)
    if (action) {
      this.#actions.get(CUSTOM_USER_ACTION).delete(customActionName)
      this.#logSystem.info(`Removed custom action '${customActionName}'`);
      return true;
    }
    this.#logSystem.warn(`Custom action '${customActionName}' not found`);
    return false;
  }

  publishEvent(guid, eventName, payload) {
    this.#logSystem.debug(`Trying to publish event with guid '${guid}' and name '${eventName}' `);
    const customEventID = CustomEvent.generateID(guid, eventName);
    this.#publish(customEventID, payload);
    return true;
  }

  #publish(eventID, payload) {
    const subscriptions = this.#subscriptions.filter(subscripton => {
      if (!subscripton.event.payload) return subscripton.event.id === eventID;
      if (subscripton.event.id === eventID) {
        return deepEqual(payload, subscripton.event.payload);
      }
      return false;
    });
    if (subscriptions.length > 0) {
      subscriptions.forEach((subscripton) => {
        try {
          return subscripton.action.callback(payload);
        } catch (error) {
          console.error(
            `Ошибка в подписке. ` +
            `Событие: ${subscripton.event.id}. ` +
            `Действие: ${subscripton.action.id}.\n`,
            error
          );
          this.#logSystem.error(
            `Ошибка в подписке. ` +
            `Событие: ${subscripton.event.id}. ` +
            `Действие: ${subscripton.action.id}.\n`,
            error
          ); 
        }
      });
    }
  }

  subscribe(subscriptionData, ...args) {
    let eventGUID, eventName, actionGUID, actionName, eventArgs, subscriptionName;

    if (subscriptionData instanceof Object) {
      // new API
      eventGUID = subscriptionData.eventGUID;
      eventName = subscriptionData.eventName;
      actionGUID = subscriptionData.actionGUID;
      actionName = subscriptionData.actionName;
      eventArgs = args[0] ? args : []; // костыль
      subscriptionName = subscriptionData.subscriptionName;
    } else {
      // old API
      eventGUID = subscriptionData;
      eventName = args[0];
      actionGUID = args[1];
      actionName = args[2];
      eventArgs = args.slice(3);
    }

    this.#logSystem.debug(
      `Trying to subscribe: ${eventGUID}, ${eventName}, to ${actionGUID}, ${actionName}`
    );

    let event = this.findEvent(eventGUID, eventName, eventArgs);

    let action = this.findAction(actionGUID, actionName);

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
      event = this.registerEvent(eventGUID, eventName, eventArgs);
    }

    // a temporary decision
    if (this.#subscriptions.find(sub => sub.event === event && sub.action === action)) {
      this.#logSystem.warn(
        `Subscripion (${eventGUID}, ${eventName}) to (${actionGUID}, ${actionName}) already exists!`
      );
      return true;
    }

    if (!subscriptionName) 
      subscriptionName = `${event.toString()}_${action.toString()}`

    this.#subscriptions.push({
      event,
      action,
      subscriptionName,
    });

    return true;
  }

  unsubscribe(eventGUID, eventName, actionGUID, actionName, ...args) {
    this.#logSystem.debug(
      `Trying to unsubscribe: ${eventGUID}, ${eventName}, to ${actionGUID}, ${actionName}`
    );

    // ищем индекс подписки по subscriptionID
    let index = this.#subscriptions.findIndex(
      sub => sub.subscriptionID === eventGUID
    );

    // ... иначе ищем индекс по событию и действию
    if (index === -1) {
      const event = this.findEvent(eventGUID, eventName, args);
      const action = this.findAction(actionGUID, actionName);

      index = this.#subscriptions.findIndex(
        sub => sub.event === event && sub.action === action
      );
    }

    if (index !== -1) {
      this.#subscriptions.splice(index, 1);
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
