/* eslint no-use-before-define: 0 */
// sets up dependencies
const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const moment = require('moment');
const request = require('request');

const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ 
  tableName: 'taken_pills',
  partitionKeyName: 'UserId'
});

const getUser = async (userId) => {
  let user;

  const params = {
    TableName: 'taken_pills',
    Key: {
      'UserId' : {"s": userId},
    }
  };

  return await ddb.getItem(params).promise();
};

// core functionality for fact skill
const RecallMyPillsHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'RecallMyPillsIntent') 
      || (request.type === 'CanFulfillIntentRequest'
        && request.intent.name === 'RecallMyPillsIntent');
  },
  handle(handlerInput) {
    if (handlerInput.requestEnvelope.request.type === 'CanFulfillIntentRequest') {
      return handlerInput
        .responseBuilder
        .withCanFulfillIntent({ "canFulfill": "YES" })
        .getResponse();
    }

    return handlerInput
      .attributesManager
      .getPersistentAttributes()
      .then((attrs) => {
        console.log(`Attributes: ${JSON.stringify(attrs)}`);

        let hasTakenPills = attrs.last_pills_at && moment(attrs.last_pills_at).add(18, 'hours').isAfter(moment());

        return handlerInput.responseBuilder
          .speak(hasTakenPills ? "Indeed, you have taken your pills today." : "You've not yet taken your pills.")
          .getResponse();
      });
  },
};

const RememberMyPillsHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'IntentRequest'
        && request.intent.name === 'RememberMyPillsIntent') 
      || (request.type === 'CanFulfillIntentRequest'
        && request.intent.name === 'RememberMyPillsIntent');
  },
  handle(handlerInput) {
    if (handlerInput.requestEnvelope.request.type === 'CanFulfillIntentRequest') {
      return handlerInput
        .responseBuilder
        .withCanFulfillIntent({ "canFulfill": "YES" })
        .getResponse();
    }
    
    handlerInput
      .attributesManager
      .setPersistentAttributes({
        last_pills_at: moment().format()
      });

    return handlerInput
      .attributesManager
      .savePersistentAttributes()
      .then(() => {
        return handlerInput.responseBuilder
          .speak("Got it!")
          .getResponse();
      })

    // return handlerInput
    //   .attributesManager
    //   .getPersistentAttributes()
    //   .then((attrs) => {
    //     console.log(`Attributes: ${JSON.stringify(attrs)}`);

        

    //     const apiAccessToken = handlerInput.requestEnvelope.context.system.apiAccessToken;
    //     const deviceId = handlerInput.requestEnvelope.context.system.device.deviceId;

    //     return request.get(`https://api.amazonalexa.com/v2/devices/${deviceId}/settings/System.timeZone`, {
    //       'auth': {
    //         'bearer': apiAccessToken
    //       }
    //     }).then(timeZone => {
    //       const now = moment().tz
    //       return handlerInput.responseBuilder
    //         .speak("No")
    //         .getResponse()
    //     });
    //   })
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak("Help is not setup for Remember My Pills.")
      .getResponse();
  },
};


const FallbackHandler = {
  // 2018-Aug-01: AMAZON.FallbackIntent is only currently available in en-* locales.
  //              This handler will not be triggered except in those locales, so it can be
  //              safely deployed for any locale.
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak("Remember My Pills cannot help you with that.")
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak("Goodbye!")
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak("Sorry, an error occurred")
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    RememberMyPillsHandler,
    RecallMyPillsHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .withPersistenceAdapter(dynamoDbPersistenceAdapter)
  .addErrorHandlers(ErrorHandler)
  .lambda();