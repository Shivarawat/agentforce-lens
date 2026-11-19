@IsTest
private class AgentforceLensLoggerTest {

    private static AgentforceLensLogger.LogRequest buildRequest(Integer turn) {
        AgentforceLensLogger.LogRequest request = new AgentforceLensLogger.LogRequest();
        request.sessionId = 'session-' + turn;
        request.botId = '0Xx000000000001';
        request.channelType = 'Web';
        request.status = 'Active';
        request.turnCount = turn;
        request.isEscalated = false;
        request.turnSequenceNumber = turn;
        request.userMessage = 'Where is my order?';
        request.botResponse = 'Your order ships tomorrow.';
        request.topicName = 'Order Status';
        request.actionName = 'Get Order';
        request.isActionSuccessful = true;
        return request;
    }

    @IsTest
    static void publishesEveryRequestInOneBulkCall() {
        List<AgentforceLensLogger.LogRequest> requests = new List<AgentforceLensLogger.LogRequest>();
        for (Integer i = 1; i <= 200; i++) {
            requests.add(buildRequest(i));
        }

        Test.startTest();
        List<AgentforceLensLogger.LogResult> results = AgentforceLensLogger.logTurns(requests);
        // Publish Immediately events have their own limit counter, separate from regular DML
        Integer publishCalls = Limits.getPublishImmediateDML();
        Test.stopTest();

        Assert.areEqual(200, results.size(), 'One result per request');
        for (AgentforceLensLogger.LogResult result : results) {
            Assert.isTrue(result.success, 'Expected success but got: ' + result.errorMessage);
        }
        Assert.areEqual(1, publishCalls, 'All events should be published in a single EventBus.publish call');
    }

    @IsTest
    static void rejectsMissingSessionIdWithoutBlockingOtherRequests() {
        AgentforceLensLogger.LogRequest missingSession = buildRequest(1);
        missingSession.sessionId = '  ';
        List<AgentforceLensLogger.LogRequest> requests = new List<AgentforceLensLogger.LogRequest>{
            buildRequest(1), missingSession, null, buildRequest(2)
        };

        Test.startTest();
        List<AgentforceLensLogger.LogResult> results = AgentforceLensLogger.logTurns(requests);
        Test.stopTest();

        Assert.areEqual(4, results.size(), 'Results stay in the same order as requests');
        Assert.isTrue(results[0].success, 'Valid request before the bad one is published');
        Assert.isFalse(results[1].success, 'Blank session id is rejected');
        Assert.areEqual('sessionId is required', results[1].errorMessage);
        Assert.isFalse(results[2].success, 'Null request is rejected');
        Assert.isTrue(results[3].success, 'Valid request after the bad ones is still published');
    }

    @IsTest
    static void mapsFieldsAndAppliesDefaults() {
        AgentforceLensLogger.LogRequest request = buildRequest(3);
        request.status = null;
        request.isEscalated = null;
        request.isActionSuccessful = null;

        AgentConversationEvent__e event = AgentforceLensLogger.toEvent(request);

        Assert.areEqual('session-3', event.SessionId__c);
        Assert.areEqual(AgentforceLensLogger.DEFAULT_STATUS, event.Status__c, 'Blank status defaults to Active');
        Assert.isFalse(event.IsEscalated__c, 'Null booleans become false');
        Assert.isFalse(event.IsActionSuccessful__c, 'Null booleans become false');
        Assert.areEqual(3, event.TurnSequenceNumber__c.intValue());
        Assert.areEqual('Order Status', event.TopicName__c);
    }

    @IsTest
    static void truncatesValuesLongerThanTheFieldAllows() {
        AgentforceLensLogger.LogRequest request = buildRequest(1);
        request.topicName = 'x'.repeat(AgentforceLensLogger.SHORT_TEXT_LIMIT + 50);
        request.userMessage = 'y'.repeat(AgentforceLensLogger.LONG_TEXT_LIMIT + 10);

        AgentConversationEvent__e event = AgentforceLensLogger.toEvent(request);

        Assert.areEqual(AgentforceLensLogger.SHORT_TEXT_LIMIT, event.TopicName__c.length());
        Assert.areEqual(AgentforceLensLogger.LONG_TEXT_LIMIT, event.UserMessage__c.length());
    }
}
