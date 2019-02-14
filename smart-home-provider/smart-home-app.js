// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint require-jsdoc: "off" */
/* eslint valid-jsdoc: "off" */

const datastore = require('./cloud/datastore');
const authProvider = require('./cloud/auth-provider');
const FHEM = require('./cloud/fhem').FHEM;
let deviceList = [];

connection={
  name: "FHEM",
  server: "scrappy",
  port: "8083",
  webname: "fhem",
  filter: ""
 
}
var fhem = new FHEM(console.log, connection);

function registerAgent(app) {
  console.log('smart-home-app registerAgent');


console.log('FHEM QUEST', JSON.stringify(connection));
fhem.on('LONGPOLL STARTED', function (fhem1) {
  fhem.connect(function (fhem1, devices) {
    //console.log('sync devices', JSON.stringify(devices));
      for (var device of devices) {
        console.log('FHEM RESP', device.name);
       // console.log('FHEM RESP', JSON.stringify(device));
       // this.addDevice(device, fhem);
       device.id=device.name;
       key=device.name;
       deviceList[key]=device;
       
      }
    }.bind(this, fhem))
  }.bind(this, fhem));

  /**
   *
   * action: {
   *   initialTrigger: {
   *     intent: [
   *       "action.devices.SYNC",
   *       "action.devices.QUERY",
   *       "action.devices.EXECUTE"
   *     ]
   *   },
   *   httpExecution: "https://example.org/device/agent",
   *   accountLinking: {
   *     authenticationUrl: "https://example.org/device/auth"
   *   }
   * }
   */
  app.post('/smarthome', function(request, response) {
    console.log('post /smarthome', request.headers);
    let reqdata = request.body;
    console.log('post /smarthome', reqdata);

    let authToken = authProvider.getAccessToken(request);
    //let uid = datastore.Auth.tokens[authToken].uid;

    if (!reqdata.inputs) {
      response.status(401).set({
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'missing inputs'});
    }
    for (let i = 0; i < reqdata.inputs.length; i++) {
      let input = reqdata.inputs[i];
      let intent = input.intent;
      if (!intent) {
        response.status(401).set({
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }).json({error: 'missing inputs'});
        continue;
      }
      switch (intent) {
        case 'action.devices.SYNC':
          console.log('post /smarthome SYNC');
          console.log('ciao sono io');
          /**
           * request:
           * {
           *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
           *  "inputs": [{
           *      "intent": "action.devices.SYNC",
           *  }]
           * }
           */
          sync({
            uid: uid,
            auth: authToken,
            requestId: reqdata.requestId,
          }, response);
          break;
        case 'action.devices.QUERY':
          console.log('post /smarthome QUERY');
          /**
           * request:
           * {
           *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
           *   "inputs": [{
           *       "intent": "action.devices.QUERY",
           *       "payload": {
           *          "devices": [{
           *            "id": "123",
           *            "customData": {
           *              "fooValue": 12,
           *              "barValue": true,
           *              "bazValue": "alpaca sauce"
           *            }
           *          }, {
           *            "id": "234",
           *            "customData": {
           *              "fooValue": 74,
           *              "barValue": false,
           *              "bazValue": "sheep dip"
           *            }
           *          }]
           *       }
           *   }]
           * }
           */
          query({
            uid: "uid",
            auth: authToken,
            requestId: reqdata.requestId,
            devices: reqdata.inputs[0].payload.devices,
          }, response);

          break;
        case 'action.devices.EXECUTE':
          console.log('post /smarthome EXECUTE');
          /**
           * request:
           * {
           *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
           *   "inputs": [{
           *     "intent": "action.devices.EXECUTE",
           *     "payload": {
           *       "commands": [{
           *         "devices": [{
           *           "id": "123",
           *           "customData": {
           *             "fooValue": 12,
           *             "barValue": true,
           *             "bazValue": "alpaca sauce"
           *           }
           *         }, {
           *           "id": "234",
           *           "customData": {
           *              "fooValue": 74,
           *              "barValue": false,
           *              "bazValue": "sheep dip"
           *           }
           *         }],
           *         "execution": [{
           *           "command": "action.devices.commands.OnOff",
           *           "params": {
           *             "on": true
           *           }
           *         }]
           *       }]
           *     }
           *   }]
           * }
           */
          exec({
            uid: "uid",
            auth: authToken,
            requestId: reqdata.requestId,
            commands: reqdata.inputs[0].payload.commands,
          }, response);

          break;
        default:
          response.status(401).set({
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }).json({error: 'missing intent'});
          break;
      }
    }
  });
  /**
   * Enables prelight (OPTIONS) requests made cross-domain.
   */
  app.options('/smarthome', function(request, response) {
    response.status(200).set({
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }).send('null');
  });

  /**
   *
   * @param data
   * {
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf"
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": [{
   *         "id": "123",
   *         "type": "action.devices.types.Outlet",
   *         "traits": [
   *            "action.devices.traits.OnOff"
   *         ],
   *         "name": {
   *             "defaultNames": ["TP-Link Outlet C110"],
   *             "name": "Homer Simpson Light",
   *             "nicknames": ["wall plug"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *         // None defined for these traits yet.
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "tplink",
   *           "model": "c110",
   *           "hwVersion": "3.2",
   *           "swVersion": "11.4"
   *         },
   *         "customData": {
   *           "fooValue": 74,
   *           "barValue": true,
   *           "bazValue": "sheepdip"
   *         }
   *       }, {
   *         "id": "456",
   *         "type": "action.devices.types.Light",
   *         "traits": [
   *           "action.devices.traits.OnOff",
   *           "action.devices.traits.Brightness",
   *           "action.devices.traits.ColorTemperature",
   *           "action.devices.traits.ColorSpectrum"
   *         ],
   *         "name": {
   *           "defaultNames": ["OSRAM bulb A19 color hyperglow"],
   *           "name": "lamp1",
   *           "nicknames": ["reading lamp"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *           "TemperatureMinK": 2000,
   *           "TemperatureMaxK": 6500
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "osram",
   *           "model": "hg11",
   *           "hwVersion": "1.2",
   *           "swVersion": "5.4"
   *         },
   *         "customData": {
   *           "fooValue": 12,
   *           "barValue": false,
   *           "bazValue": "dancing alpaca"
   *         }
   *       }, {
   *         "id": "234"
   *         // ...
   *     }]
   *   }
   * }
   */
  function sync(data, response) {



    console.log('sync', JSON.stringify(data));
    let devices = app.smartHomePropertiesSync(data.uid);
    if (!devices) {
      response.status(500).set({
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'failed'});
      return;
    }
    /*
    Object.keys(devices).forEach(function(key) {
      if (devices.hasOwnProperty(key) && devices[key]) {
        console.log('Getting device information for id \'' + key + '\'');
        let device = devices[key];
        device.id = key;
        deviceList.push(device);
      }
    });*/

    let deviceProps = {
      requestId: data.requestId,
      payload: {
        agentUserId: data.uid,
        devices: [],
      },
    };
    for (let di in deviceList) {
      const device = deviceList[di];

      if (device.mappings.On
          || device.mappings.Modes
          || device.mappings.Toggles
          || device.mappings.Volumme
          || device.mappings.Brightness
          || device.mappings.HSVBrightness
          || device.mappings.Hue
          || device.mappings.RGB
          || device.mappings.Scene
          || device.mappings.TargetPosition
          || device.mappings.CurrentTemperature
          || device.mappings.TargetTemperature
          || device.mappings.StartStop
          || device.mappings.Dock
          || device.mappings.Locate) {
          //console.log(device);

          console.log("Start handling ", device.ghomeName);
          
          let d = {
              id: device.uuid_base.replace(/[^\w_\-=#;:?@&]/g, '_'),
              deviceInfo: {
                  manufacturer: 'FHEM_' + device.type,
                  model: (device.model ? device.model : '<unknown>')
              },
              name: {
                  name: device.ghomeName
              },
              traits: [],
              attributes: {},
              customData: {device: device.device},
          };
          
          d.willReportState = !device.mappings.Scene;

          //roomHint
          if (device.ghomeRoom)
              d.roomHint = device.ghomeRoom;

          //DEVICE TYPE
          if (device.service_name) {
              if (device.service_name === 'vacuum') {
                  d.type = 'action.devices.types.VACUUM';
              } else if (device.service_name === 'light' || device.service_name === 'blind') {
                  d.type = 'action.devices.types.LIGHT';
              } else if (device.service_name === 'switch' || device.service_name === 'contact') {
                  d.type = 'action.devices.types.SWITCH';
              } else if (device.service_name === 'outlet') {
                  d.type = 'action.devices.types.OUTLET';
              } else if (device.service_name === 'thermostat') {
                  d.type = 'action.devices.types.THERMOSTAT';
              } else if (device.service_name === 'coffeemaker') {
                  d.type = 'action.devices.types.COFFEE_MAKER';
              } else if (device.service_name === 'aircondition') {
                  d.type = 'action.devices.types.AC_UNIT';
              } else if (device.service_name === 'airpurifier') {
                  d.type = 'action.devices.types.AIRPURIFIER';
              } else if (device.service_name === 'camera') {
                  d.type = 'action.devices.types.CAMERA';
              } else if (device.service_name === 'dishwasher') {
                  d.type = 'action.devices.types.DISHWASHER';
              } else if (device.service_name === 'dryer') {
                  d.type = 'action.devices.types.DRYER';
              } else if (device.service_name === 'fan') {
                  d.type = 'action.devices.types.FAN';
              } else if (device.service_name === 'kettle') {
                  d.type = 'action.devices.types.KETTLE';
              } else if (device.service_name === 'oven') {
                  d.type = 'action.devices.types.OVEN';
              } else if (device.service_name === 'refrigerator') {
                  d.type = 'action.devices.types.REFRIGERATOR';
              } else if (device.service_name === 'scene') {
                  d.type = 'action.devices.types.SCENE';
              } else if (device.service_name === 'sprinkler') {
                  d.type = 'action.devices.types.SPRINKLER';
              } else if (device.service_name === 'washer') {
                  d.type = 'action.devices.types.WASHER';
              } else {
                  log.error("genericDeviceType " + device.service_name + " not supported in ghome-fhem");
                  continue;
              }
          } else {
              if (device.mappings.TargetTemperature || device.mappings.CurrentTemperature) {
                  d.type = 'action.devices.types.THERMOSTAT';
              } else if (device.mappings.Brightness || device.mappings.Hue ||
                         device.mappings.RGB || device.mappings.TargetPosition ||
                         device.mappings.HSVBrightness) {
                  d.type = 'action.devices.types.LIGHT';
              } else if (device.mappings.Scene) {
                  d.type = 'action.devices.types.SCENE';
              } else {
                  d.type = 'action.devices.types.SWITCH';
              }
          }

          //TRAITS
          if (device.mappings.On) {
              d.traits.push("action.devices.traits.OnOff");
          }

          //Toggles
          if (device.mappings.Toggles) {
              d.traits.push("action.devices.traits.Toggles");
              //Attributes
              let availableTogglesList = [];
              device.mappings.Toggles.forEach(function(toggle) {
                availableTogglesList.push(toggle.toggle_attributes);
              });
              
              d.attributes.availableToggles = availableTogglesList;
          }

          //Brightness
          if (device.mappings.Brightness || device.mappings.TargetPosition || device.mappings.Volume) {
              d.traits.push("action.devices.traits.Brightness");
          }

          //StartStop
          if (device.mappings.StartStop) {
              d.traits.push("action.devices.traits.StartStop");
              //Attributes
              d.attributes.pausable = true;
          }
          
          //FanSpeed
          if (device.mappings.FanSpeed) {
              d.traits.push("action.devices.traits.FanSpeed");
              //Attributes
              d.attributes.availableFanSpeed = device.mappings.FanSpeed.speed_attributes;
              d.attributes.reversible = device.mappings.FanSpeed.reversible;
          }

          //Dock
          if (device.mappings.Dock) {
              d.traits.push("action.devices.traits.Dock");
          }
          
          //Locate
          if (device.mappings.Locate) {
              d.traits.push("action.devices.traits.Locator");
          }

          //Modes
          if (device.mappings.Modes) {
              d.traits.push("action.devices.traits.Modes");
              //Attributes
              addAttributesModes(device, d);
          }

          //TemperatureSetting
          if (device.mappings.TargetTemperature) {
              d.attributes = {
                  //FIXME: do not define anything in server.js
                  thermostatTemperatureUnit: 'C',
                  availableThermostatModes: 'off,heat,on'
              };
              d.traits.push("action.devices.traits.TemperatureSetting");
          } else if (device.mappings.CurrentTemperature) {
              d.attributes = {
                  //FIXME: do not define anything in server.js
                  thermostatTemperatureUnit: 'C',
                  availableThermostatModes: 'off'
              };
              d.traits.push("action.devices.traits.TemperatureSetting");
          }

          //ColorSetting / ColorTemperature
          if (device.mappings.RGB) {
              d.attributes.colorModel = 'rgb';
              if (device.mappings.ColorTemperature) {
                  d.attributes.colorTemperatureRange = {
                      //FIXME get values from device mapping
                      temperatureMinK: 2000,
                      temperatureMaxK: 9000
                  };
              }
              if (device.mappings.RGB.commandOnlyColorSetting)
                  d.attributes.commandOnlyColorSetting = true;
              d.traits.push("action.devices.traits.ColorSetting");
          } else if (device.mappings.Hue) {
              d.attributes.colorModel = 'hsv';
              if (device.mappings.ColorTemperature) {
                  d.attributes.colorTemperatureRange = {
                      //FIXME get values from device mapping
                      temperatureMinK: 2000,
                      temperatureMaxK: 9000
                  };
              }
              if (device.mappings.Hue.commandOnlyColorSetting)
                  d.attributes.commandOnlyColorSetting = true;
              d.traits.push("action.devices.traits.ColorSetting");
          }

          //Scene
          if (device.mappings.Scene) {
              d.traits.push("action.devices.traits.Scene");

              //create separate device for each scene
              if (Array.isArray(device.mappings.Scene)) {
                  device.mappings.Scene.forEach(function(scene) {
                      //Attributes
                      if (scene.cmdOff) {
                          d.attributes.sceneReversible = true;
                      } else {
                          d.attributes.sceneReversible = false;
                      }
                      let d2 = {
                          id: device.uuid_base.replace(/[^\w_\-=#;:?@&]/g, '_') + '-' + scene.scenename,
                          type: 'action.devices.types.SCENE',
                          deviceInfo: {
                              manufacturer: 'FHEM_' + device.type,
                              model: (device.model ? device.model : '<unknown>')
                          },
                          name: {
                              name: scene.scenename
                          },
                          traits: ['action.devices.traits.Scene'],
                          attributes: {
                              sceneReversible: false
                          },
                          customData: {
                            device: device.device,
                            scenename: scene.scenename
                          }
                      };
                      console.log("End handling scene device: ", d2);
                      deviceProps.payload.devices.push(d2);
                  });
              }
          } else {
            console.log("End handling device: ", d);
            deviceProps.payload.devices.push(d);
          }
      }
  }

  

    console.log('sync response asdf', JSON.stringify(deviceProps));
    response.status(200).json(deviceProps);
    return deviceProps;
  }

  /**
   *
   * @param data
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "devices": [{
   *     "id": "123",
   *       "customData": {
   *         "fooValue": 12,
   *         "barValue": true,
   *         "bazValue": "alpaca sauce"
   *       }
   *   }, {
   *     "id": "234"
   *   }]
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true ,
   *         "online": true
   *       },
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulian",
   *           "spectrumRGB": 31655
   *         }
   *       },
   *       ...
   *     }
   *   }
   * }
   */
  async function query(data, response) {
    console.log('query', JSON.stringify(data));
    //let deviceIds = getDeviceIds(data.devices);

    devices= {}
    //let devices = app.smartHomeQueryStates(data.uid, deviceIds);
    for (let k = 0; k < data.devices.length; k++) {
      let device=deviceList[data.devices[k].customData.device];
      //console.log('query', JSON.stringify(device));
      let mappings={
        device:device.device,
        reading:"state"

      };
      
      await device.query(mappings,function(ret, value){
        devices[device.device]={"on":value=="on","online": true}
      });
      
      
      
    }
    


    if (!devices) {
      response.status(500).set({
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'failed'});
      return;
    }
    let deviceStates = {
      requestId: data.requestId,
      payload: {
        devices: devices,
      },
    };
    console.log('query response', JSON.stringify(deviceStates));
    response.status(200).json(deviceStates);
    return deviceStates;
  }

  /**
   *
   * @param devices
   * [{
   *   "id": "123"
   * }, {
   *   "id": "234"
   * }]
   * @return {Array} ["123", "234"]
   */
  function getDeviceIds(devices) {
    let deviceIds = [];
    for (let i = 0; i < devices.length; i++) {
      if (devices[i] && devices[i].id) {
        deviceIds.push(devices[i].id);
      }
    }
    return deviceIds;
  }

  /**
   * @param data:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *          "fooValue": 74,
   *          "barValue": false
   *       }
   *     }, {
   *       "id": "456",
   *       "customData": {
   *          "fooValue": 12,
   *          "barValue": true
   *       }
   *     }, {
   *       "id": "987",
   *       "customData": {
   *          "fooValue": 35,
   *          "barValue": false,
   *          "bazValue": "sheep dip"
   *       }
   *     }],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *           "on": true
   *       }
   *     }]
   *  }
   *
   * @param response
   * @return {{}}
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "commands": [{
   *       "ids": ["123"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["456"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["987"],
   *       "status": "OFFLINE",
   *       "states": {
   *         "online": false
   *       }
   *     }]
   *   }
   * }
   */
  function exec(data, response) {
    console.log('exec', JSON.stringify(data));
    let respCommands = [];
    for (let i = 0; i < data.commands.length; i++) {
      let curCommand = data.commands[i];
      for (let j = 0; j < curCommand.execution.length; j++) {
        let curExec = curCommand.execution[j];
        let devices = curCommand.devices;
        for (let k = 0; k < devices.length; k++) {
          let executionResponse = execDevice(data.uid, curExec, devices[k]);
          console.log('Device exec response',
              JSON.stringify(executionResponse));
          const execState = {};
          if (executionResponse.executionStates) {
            executionResponse.executionStates.map((key) => {
              execState[key] = executionResponse.states[key];
            });
          } else {
            console.warn('No execution states were found for this device');
          }
          respCommands.push({
            ids: [devices[k].id],
            status: executionResponse.status,
            errorCode: executionResponse.errorCode
                ? executionResponse.errorCode : undefined,
            states: execState,
          });
        }
      }
    }
    let resBody = {
      requestId: data.requestId,
      payload: {
        commands: respCommands,
      },
    };
    console.log('exec response', JSON.stringify(resBody));
    response.status(200).json(resBody);
    return resBody;
  }

  registerAgent.exec = exec;

  /**
   *
   * @param uid
   * @param command
   * {
   *   "command": "action.devices.commands.OnOff",
   *   "params": {
   *       "on": true
   *   }
   * }
   * @param device
   * {
   *   "id": "123",
   *   "customData": {
   *      "fooValue": 74,
   *      "barValue": false
   *   }
   * }
   * @return {{}}
   * {
   *   "ids": ["123"],
   *   "status": "SUCCESS"
   *   "states": {
   *     "on": true,
   *     "online": true
   *   }
   * }
   */
  function execDevice(uid, command, device) {
    let curDevice = {
      id: device.id,
      states: {},
    };
    Object.keys(command.params).forEach(function(key) {
      if (command.params.hasOwnProperty(key)) {
        curDevice.states[key] = command.params[key];
      }
    });
    let payLoadDevice = {
      ids: [curDevice.id],
      status: 'SUCCESS',
      states: {},
    };
    console.info('execDevice', JSON.stringify(device));
    console.info('execCommand', JSON.stringify(command));

    const REQUEST_SET_BRIGHTNESSABSOLUTE = "action.devices.commands.BrightnessAbsolute";
    const REQUEST_SET_MODES = "action.devices.commands.SetModes";
    const REQUEST_ON_OFF = "action.devices.commands.OnOff";
    const REQUEST_SET_TARGET_TEMPERATURE = "action.devices.commands.ThermostatTemperatureSetpoint";
    const REQUEST_SET_THERMOSTAT_MODE = "action.devices.commands.ThermostatSetMode";
    const REQUEST_DOCK = "action.devices.commands.Dock";
    const REQUEST_LOCATE = "action.devices.commands.Locate";
    const REQUEST_STARTSTOP = "action.devices.commands.StartStop";
    const REQUEST_PAUSEUNPAUSE = "action.devices.commands.PauseUnpause";
    const REQUEST_FANSPEED = "action.devices.commands.SetFanSpeed";
    const REQUEST_FANSPEEDREVERSE = "action.devices.commands.Reverse";
    const REQUEST_COLORABSOLUTE = "action.devices.commands.ColorAbsolute";
    const REQUEST_SET_TOGGLES = "action.devices.commands.SetToggles";
    const REQUEST_ACTIVATE_SCENE = "action.devices.commands.ActivateScene";

        let dev=deviceList[device.customData.device];
    switch (command.command) {

      case REQUEST_ON_OFF :
        console.info('execCommand',device.customData.device, command.params.on ? 1 : 0);
        //let dev=deviceList[device.customData.device];
        dev.command( dev.mappings.On, command.params.on ? 1 : 0);

          break;

      case REQUEST_SET_BRIGHTNESSABSOLUTE :
         dev.command( dev.mappings.On, command.params.brightness);;
        // responses.push(...handleEXECUTEBrightnessAbsolute.bind(this)(cmd, exec.params.brightness));
          break;

      case REQUEST_SET_TARGET_TEMPERATURE:
          responses.push(...handleEXECUTESetTargetTemperature.bind(this)(cmd, exec.params.thermostatTemperatureSetpoint));
          break;

      case REQUEST_SET_THERMOSTAT_MODE:
          responses.push(...handleEXECUTESetThermostatMode.bind(this)(cmd, exec.params.thermostatMode));
          break;

      case REQUEST_DOCK:
          responses.push(...handleEXECUTEDock.bind(this)(cmd));
          break;
          
      case REQUEST_LOCATE:
          responses.push(...handleEXECUTELocate.bind(this)(cmd));
          break;
          
      case REQUEST_STARTSTOP:
          responses.push(...handleEXECUTEStartStop.bind(this)(cmd, exec.params.start ? 1 : 0));
          break;

      case REQUEST_PAUSEUNPAUSE:
          responses.push(...handleEXECUTEPauseUnpause.bind(this)(cmd, exec.params.pause ? 1 : 0));
          break;

      case REQUEST_FANSPEED:
          responses.push(...handleEXECUTESetFanSpeed.bind(this)(cmd, exec.params.fanSpeed));
          break;

      case REQUEST_COLORABSOLUTE:
          responses.push(...handleEXECUTESetColorAbsolute.bind(this)(cmd, exec.params.color));
          break;

      case REQUEST_SET_TOGGLES:
          responses.push(...handleEXECUTESetToggles.bind(this)(cmd, exec.params.updateToggleSettings));
          break;

      case REQUEST_ACTIVATE_SCENE:
          responses.push(...handleEXECUTEActivateScene.bind(this)(cmd, exec.params.deactivate));
          break;

      case REQUEST_FANSPEEDREVERSE:
          //responses.push(...handleEXECUTEReverse.bind(this)(cmd, exec.params.reverse));
          break;

      //action.devices.traits.Modes: COMMANDS
      case REQUEST_SET_MODES:
          responses.push(...handleEXECUTESetModes.bind(this)(cmd, exec));
          break;
          
      default:
          console.log("Error", "Unsupported operation" + requestedName);
          break;

  }// switch

   /* let execDevice = app.smartHomeExec(uid, curDevice);
    console.info('execDevice', JSON.stringify(execDevice[device.id]));
    // Check whether the device exists or whether
    // it exists and it is disconnected.
    if (!execDevice || !execDevice[device.id].states.online) {
      console.warn('The device you want to control is offline');
      return {status: 'ERROR', errorCode: 'deviceOffline'};
    }
    let deviceCommand = {
      type: 'change',
      state: {},
    };
    // TODO - add error and debug to response

    deviceCommand.state[curDevice.id] = execDevice[curDevice.id].states;
    app.changeState(deviceCommand);

    execDevice = execDevice[curDevice.id];

    payLoadDevice.states = execDevice.states;

    Object.keys(command.params).forEach(function(key) {
      if (command.params.hasOwnProperty(key)) {
        if (payLoadDevice.states[key] != command.params[key]) {
          return {status: 'ERROR', errorCode: 'notSupported'};
        }
      }
    });*/
    return {
      status: 'SUCCESS',
      states: execDevice.states,
      executionStates: execDevice.executionStates,
    };
  }
}

exports.registerAgent = registerAgent;
