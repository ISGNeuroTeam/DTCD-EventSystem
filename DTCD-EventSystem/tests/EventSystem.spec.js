import { EventSystem } from '../src/EventSystem';
import { CustomEvent } from '../src/utils/CustomEvent';
import { CustomAction } from '../src/utils/CustomAction';
require('./pubsub');

global.Application = {
  getSystem: sysName => {
    return {};
  },
  getSystem: guid => {
    return {
      testAction: () => {},
    };
  },
  logSystem: {
    logs: [],
    log: function (logString) {
      this.logs.push(logString);
    },
  },
};

let es = new EventSystem();

describe('EventSystem:getRegistrationMeta', () => {
  test('should be defined', () => {
    expect(EventSystem.getRegistrationMeta).toBeDefined();
  });

  test('should return proper data', () => {
    expect(EventSystem.getRegistrationMeta()).toEqual({
      type: 'core',
      title: 'Система cобытий',
      name: 'EventSystem',
    });
  });
});

/* 
  Tests on create methods of EventSystem
*/
describe('EventSystem:createEvent', () => {
  test('should be defined', () => {
    expect(es.createEvent).toBeDefined();
  });

  test('returns expected event instance', () => {
    const customEvent = new CustomEvent('guid1', 'testEvent');
    expect(es.createEvent('guid1', 'testEvent')).toEqual(customEvent);
  });
});

describe('EventSystem:createAction', () => {
  beforeEach(() => {
    es = new EventSystem();
  });
  test('should be defined', () => {
    expect(es.createAction).toBeDefined();
  });

  test('returns expected event instance', () => {
    const action = es.createAction('testAction', 'guid1');
    expect(action).toBeInstanceOf(CustomAction);
    expect(es.registerAction(action)).toEqual(true);
    expect(es.actions[0]).toEqual(action);
  });
});

describe('EventSystem:createActionByCallback', () => {
  beforeEach(() => {
    es = new EventSystem();
  });
  test('should be defined', () => {
    expect(es.createActionByCallback).toBeDefined();
  });

  test('should return proper data', () => {
    const callback = () => {};
    const customAction = new CustomAction('testAction', 'guid1', callback, null);
    expect(es.createActionByCallback('testAction', 'guid1', callback)).toEqual(customAction);
    expect(es.actions.length).toEqual(1);
    expect(es.actions[0]).toEqual(customAction);
  });
});
/* 
  Tests on register methods of EventSystem
*/
describe('EventSystem:registerEvent', () => {
  beforeEach(() => {
    es = new EventSystem();
  });
  test('should be defined', () => {
    expect(es.registerEvent).toBeDefined();
  });

  test('should return proper data', () => {
    const customEvent = new CustomEvent('guid1', 'testEvent');
    expect(es.registerEvent(customEvent)).toEqual(true);
    expect(es.events[0]).toEqual(customEvent);
  });
  test('should not accept not a CustomEvent instance', () => {
    expect(es.registerEvent({})).toEqual(false);
    expect(es.events.length).toEqual(0);
  });
});

describe('EventSystem:registerAction', () => {
  beforeEach(() => {
    es = new EventSystem();
  });
  test('should be defined', () => {
    expect(es.registerAction).toBeDefined();
  });

  test('should return proper data', () => {
    const customAction = new CustomAction('testAction', 'guid1', () => console.log(1), null);
    expect(es.registerAction(customAction)).toEqual(true);
    expect(es.actions[0]).toEqual(customAction);
  });

  test('should not accept not a CustomAction instance', () => {
    expect(es.registerAction({})).toEqual(false);
    expect(es.actions.length).toEqual(0);
  });
});

/* 
  Tests on publish methods of EventSystem
*/

describe('EventSystem:publishEvent', () => {
  // const customEvent = new CustomEvent('guid1', 'testEvent');
  // const callback = jest.fn().mockImplementationOnce((msg, data) => {
  // 	console.log(msg, data);
  // });
  // it('pubsub', () => {
  // 	PubSub.subscribe('MY TOPIC', console.log);
  // 	console.log(PubSub.countSubscriptions());
  // 	PubSub.publish('MY TOPIC', 'ITS ARGUMENT!');
  // });
  // it('FDSDSFDFSFDSFSDFDS', () => {
  // 	expect(callback).toHaveBeenCalled();
  // });
  // beforeEach(() => {
  // 	let es = new EventSystem();
  // 	es.logSystem = Application.logSystem;
  // });
  // test('should be defined', () => {
  // 	expect(es.publishEvent).toBeDefined();
  // });
  // test('should return proper data', () => {
  // 	expect(es.registerEvent(customEvent)).toEqual(true);
  // es.subscribeEventNameByCallback('testEvent', callback);
  // PubSub.publish('MY TOPIC', 'hello world!');
  // const customAction = new CustomAction('testAction', 'guid1', callback, null);
  // expect(es.registerAction(customAction)).toEqual(true);
  // PubSub.subscribe(customEvent.id, callback);
  // es.createAndPublish('guid1', 'testEvent');
  // console.log(PubSub.getSubscriptions());
  // expect(callback).toHaveBeenCalled();
  // });
  // test('should not accept not a CustomEvent instance', () => {
  // 	expect(es.publishEvent({})).toEqual(false);
  // });
});

/* 
  Tests on search methods of EventSystem
*/

describe('EventSystem:findActionById', () => {
  beforeEach(() => {
    es = new EventSystem();
  });
  test('should be defined', () => {
    expect(es.findActionById).toBeDefined();
  });

  test('should return proper data', () => {
    const customAction = new CustomAction('testAction', 'guid1', () => console.log(1), null);
    expect(es.registerAction(customAction)).toEqual(true);
    expect(es.findActionById('guid1[testAction]')).toEqual(customAction);
  });
});

describe('EventSystem:findEventById', () => {
  test('should be defined', () => {
    expect(es.findEventById).toBeDefined();
  });

  test('should return proper data', () => {
    const customEvent = new CustomEvent('guid1', 'testEvent');
    expect(es.registerEvent(customEvent)).toEqual(true);
    expect(es.findEventById('testEvent[guid1]')).toEqual(customEvent);
  });
});

describe('EventSystem:findEventsByName', () => {
  test('should be defined', () => {
    expect(es.findEventsByName).toBeDefined();
  });

  test('should return proper data', () => {
    expect(es.findEventsByName('testEvent')).toEqual(expect.any(Array));
  });
});

describe('EventSystem:findActionsByName', () => {
  test('should be defined', () => {
    expect(es.findActionsByName).toBeDefined();
  });

  test('should return proper data', () => {
    expect(es.findActionsByName('testAction')).toEqual(expect.any(Array));
  });
});

describe('EventSystem:showAvailableEvents', () => {
  test('should be defined', () => {
    expect(es.showAvailableEvents).toBeDefined();
  });

  test('should return proper data', () => {
    expect(es.showAvailableEvents()).toEqual(expect.any(Array));
  });
});

describe('EventSystem:showAvailableActions', () => {
  test('should be defined', () => {
    expect(es.showAvailableActions).toBeDefined();
  });

  test('should return proper data', () => {
    expect(es.showAvailableActions()).toEqual(expect.any(Array));
  });
});
