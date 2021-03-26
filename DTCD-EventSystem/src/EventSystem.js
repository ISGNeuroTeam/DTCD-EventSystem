import {CustomEvent} from './utils/CustomEvent';
import {CustomAction} from './utils/CustomAction';
import {SystemPlugin, LogSystemAdapter} from './../../DTCD-SDK/index';

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
		if (customEvent instanceof CustomEvent) {
			this.events.push(customEvent);
			return true;
		} else return false;
	}

	registerAction(action) {
		if (action instanceof CustomAction) {
			this.actions.push(action);
			return true;
		} else return false;
	}

	// Events methods
	createAndPublish(guid, eventName, args) {
		const customEvent = this.createEvent(guid, eventName, args);
		this.publishEvent(customEvent);
	}

	publishEvent(customEvent) {
		if (customEvent instanceof CustomEvent) {
			this.logSystem.info(`Publish event ${customEvent.id}`);
			PubSub.publish(customEvent, customEvent.id);
			return true;
		} else return false;
	}

	createEvent(guid, eventName, args = null) {
		return new CustomEvent(guid, eventName, args);
	}

	// Actions methods

	createAction(actionName, guid, args = null) {
		const instance = this.getSystem(guid);
		// Warning!: nextline is very important. It's bind "this" of instance to callback
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
