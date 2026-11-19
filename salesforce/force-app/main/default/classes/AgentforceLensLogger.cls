/**
 * Invocable action that an Agentforce agent (or a Flow) calls to log a conversation turn.
 * Each request becomes one AgentConversationEvent__e, which the Agentforce Lens backend
 * receives over CometD.
 *
 * Bulkified: all requests are published with a single EventBus.publish call, and one bad
 * request (e.g. a missing session id) does not stop the others from being published.
 */
public with sharing class AgentforceLensLogger {

    @TestVisible static final Integer SHORT_TEXT_LIMIT = 255;
    @TestVisible static final Integer LONG_TEXT_LIMIT = 32768;
    @TestVisible static final String DEFAULT_STATUS = 'Active';

    public class LogRequest {
        @InvocableVariable(label='Session Id' description='Id of the agent conversation session' required=true)
        public String sessionId;

        @InvocableVariable(label='Agent Id' description='Id of the Agentforce agent (BotDefinition)')
        public String botId;

        @InvocableVariable(label='Channel Type' description='Channel the conversation runs on, e.g. Web or Slack')
        public String channelType;

        @InvocableVariable(label='Status' description='Conversation status: Active, Resolved or Escalated. Defaults to Active')
        public String status;

        @InvocableVariable(label='Turn Count' description='Number of turns in the conversation so far')
        public Integer turnCount;

        @InvocableVariable(label='Is Escalated' description='True if the conversation was handed to a human')
        public Boolean isEscalated;

        @InvocableVariable(label='Turn Sequence Number' description='Position of this turn in the conversation, starting at 1')
        public Integer turnSequenceNumber;

        @InvocableVariable(label='User Message' description='What the user said in this turn')
        public String userMessage;

        @InvocableVariable(label='Agent Response' description='What the agent replied in this turn')
        public String botResponse;

        @InvocableVariable(label='Topic Name' description='Agent topic that handled this turn')
        public String topicName;

        @InvocableVariable(label='Action Name' description='Agent action invoked in this turn, if any')
        public String actionName;

        @InvocableVariable(label='Is Action Successful' description='True if the action in this turn succeeded')
        public Boolean isActionSuccessful;

        @InvocableVariable(label='Error Message' description='Error returned by the action, if it failed')
        public String errorMessage;
    }

    public class LogResult {
        @InvocableVariable(label='Success' description='True if the event was published')
        public Boolean success;

        @InvocableVariable(label='Error Message' description='Why the event was not published')
        public String errorMessage;
    }

    @InvocableMethod(
        label='Log Agent Turn to Agentforce Lens'
        description='Publishes one agent conversation turn as a platform event so Agentforce Lens can track escalations, actions and errors.'
        category='Agentforce Lens'
    )
    public static List<LogResult> logTurns(List<LogRequest> requests) {
        List<LogResult> results = new List<LogResult>();
        List<AgentConversationEvent__e> events = new List<AgentConversationEvent__e>();
        // events[j] was built from requests[resultIndexForEvent[j]]
        List<Integer> resultIndexForEvent = new List<Integer>();

        for (Integer i = 0; i < requests.size(); i++) {
            LogRequest request = requests[i];
            LogResult result = new LogResult();
            results.add(result);

            if (request == null || String.isBlank(request.sessionId)) {
                result.success = false;
                result.errorMessage = 'sessionId is required';
                continue;
            }
            events.add(toEvent(request));
            resultIndexForEvent.add(i);
        }

        if (!events.isEmpty()) {
            List<Database.SaveResult> saveResults = EventBus.publish(events);
            for (Integer j = 0; j < saveResults.size(); j++) {
                LogResult result = results[resultIndexForEvent[j]];
                result.success = saveResults[j].isSuccess();
                if (!result.success) {
                    result.errorMessage = saveResults[j].getErrors()[0].getMessage();
                }
            }
        }
        return results;
    }

    @TestVisible
    private static AgentConversationEvent__e toEvent(LogRequest request) {
        return new AgentConversationEvent__e(
            SessionId__c          = truncate(request.sessionId, SHORT_TEXT_LIMIT),
            BotId__c              = truncate(request.botId, 18),
            ChannelType__c        = truncate(request.channelType, 100),
            Status__c             = String.isBlank(request.status) ? DEFAULT_STATUS : truncate(request.status, 50),
            TurnCount__c          = request.turnCount,
            IsEscalated__c        = request.isEscalated == true,
            TurnSequenceNumber__c = request.turnSequenceNumber,
            UserMessage__c        = truncate(request.userMessage, LONG_TEXT_LIMIT),
            BotResponse__c        = truncate(request.botResponse, LONG_TEXT_LIMIT),
            TopicName__c          = truncate(request.topicName, SHORT_TEXT_LIMIT),
            ActionName__c         = truncate(request.actionName, SHORT_TEXT_LIMIT),
            IsActionSuccessful__c = request.isActionSuccessful == true,
            ErrorMessage__c       = truncate(request.errorMessage, LONG_TEXT_LIMIT)
        );
    }

    // Field lengths are fixed on the event, so long values are cut instead of failing the publish
    @TestVisible
    private static String truncate(String value, Integer maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.left(maxLength);
    }
}
